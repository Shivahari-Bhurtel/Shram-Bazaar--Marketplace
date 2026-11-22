"""Bounded Ollama detection and local recovery for Shram AI."""
from __future__ import annotations

import logging
import os
import platform
import shutil
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)


class OllamaRuntime:
    def __init__(self) -> None:
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self.model = os.getenv("OLLAMA_MODEL", "qwen3:4b")
        self.connect_timeout = float(os.getenv("OLLAMA_CONNECT_TIMEOUT_SECONDS", "2"))
        self.startup_timeout = float(os.getenv("OLLAMA_STARTUP_TIMEOUT_SECONDS", "20"))
        self.start_cooldown = float(os.getenv("OLLAMA_START_COOLDOWN_SECONDS", "30"))
        self._lock = threading.RLock()
        self._state: dict = {
            "provider": "ollama", "model": self.model, "ollama_installed": False,
            "ollama_running": False, "model_available": False, "model_loading": False,
            "ai_ready": False, "state": "connecting", "last_health_check": None,
            "last_error": None, "fallback_active": True,
        }
        self._active_requests = 0
        self._request_fallback = False
        self._last_start_attempt = 0.0
        self._spawned_process: subprocess.Popen | None = None

    @staticmethod
    def _ollama_executable() -> str | None:
        found = shutil.which("ollama")
        if found:
            return found
        if platform.system() == "Darwin":
            for candidate in (
                Path("/Applications/Ollama.app/Contents/Resources/ollama"),
                Path.home() / "Applications/Ollama.app/Contents/Resources/ollama",
            ):
                if candidate.is_file():
                    return str(candidate)
        return None

    def snapshot(self) -> dict:
        with self._lock:
            status = dict(self._state)
            if self._active_requests:
                status["model_loading"] = True
                if status["ai_ready"]:
                    status["state"] = "model_loading"
            return status

    def _record(self, **values) -> None:
        with self._lock:
            self._state.update(values)
            self._state["last_health_check"] = datetime.now(timezone.utc).isoformat()

    def _probe(self) -> dict:
        executable = self._ollama_executable()
        installed = executable is not None
        try:
            response = httpx.get(f"{self.base_url}/api/tags", timeout=self.connect_timeout)
            response.raise_for_status()
            payload = response.json()
            models = payload.get("models", []) if isinstance(payload, dict) else []
            model_available = any(
                isinstance(item, dict) and item.get("name") == self.model
                for item in models
            )
            if not model_available:
                names = [item.get("name") for item in models if isinstance(item, dict)]
                error = f"Ollama is running, but model {self.model} is missing. Install it with: ollama pull {self.model}. Available models: {', '.join(names) or 'none'}"
                state = "model_missing"
                ready = False
            else:
                # /api/show verifies that Ollama can resolve model metadata without generating tokens.
                try:
                    show = httpx.post(
                        f"{self.base_url}/api/show",
                        json={"model": self.model},
                        timeout=httpx.Timeout(8.0, connect=self.connect_timeout),
                    )
                    show.raise_for_status()
                    if not isinstance(show.json(), dict):
                        raise ValueError("Ollama model metadata was malformed")
                except httpx.TimeoutException:
                    status = {
                        "provider": "ollama", "model": self.model, "ollama_installed": installed,
                        "ollama_running": True, "model_available": True, "model_loading": True,
                        "ai_ready": False, "state": "model_loading",
                        "last_health_check": datetime.now(timezone.utc).isoformat(),
                        "last_error": "Ollama has the model but its metadata check timed out; it may still be loading.",
                        "fallback_active": True,
                    }
                    self._record(**status)
                    return self.snapshot()
                error = None
                state = "ready"
                ready = True
            status = {
                "provider": "ollama", "model": self.model, "ollama_installed": installed,
                "ollama_running": True, "model_available": model_available,
                "model_loading": False, "ai_ready": ready, "state": state,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "last_error": error, "fallback_active": not ready or self._request_fallback,
            }
            self._record(**status)
            return self.snapshot()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            error = f"Ollama API is not responding correctly ({type(exc).__name__})."
            state = "ollama_not_running" if not isinstance(exc, httpx.HTTPStatusError) else "temporarily_unavailable"
            status = {
                "provider": "ollama", "model": self.model, "ollama_installed": installed,
                "ollama_running": False, "model_available": False, "model_loading": False,
                "ai_ready": False, "state": state,
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "last_error": error, "fallback_active": True,
            }
            self._record(**status)
            return self.snapshot()

    def _server_process_exists(self) -> bool:
        if self._spawned_process is not None and self._spawned_process.poll() is None:
            return True
        pgrep = shutil.which("pgrep")
        if not pgrep:
            return False
        try:
            pattern = r"ollama serve|Ollama.app/Contents/MacOS/Ollama" if platform.system() == "Darwin" else r"ollama serve"
            result = subprocess.run([pgrep, "-f", pattern], capture_output=True, text=True, timeout=2, check=False)
            return result.returncode == 0 and bool(result.stdout.strip())
        except (OSError, subprocess.TimeoutExpired):
            return False

    def _wait_for_api(self, seconds: float) -> bool:
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            try:
                response = httpx.get(f"{self.base_url}/api/tags", timeout=self.connect_timeout)
                if response.is_success and isinstance(response.json(), dict):
                    return True
            except (httpx.HTTPError, ValueError):
                pass
            time.sleep(0.5)
        return False

    def ensure_running(self) -> dict:
        """Probe first, then make at most one bounded, duplicate-safe start attempt."""
        with self._lock:
            status = self._probe()
            if status["ollama_running"]:
                return status
            now = time.monotonic()
            if now - self._last_start_attempt < self.start_cooldown:
                return status
            self._last_start_attempt = now

            executable = self._ollama_executable()
            if not executable:
                self._record(
                    ollama_installed=False, state="ollama_not_installed", ai_ready=False,
                    model_available=False, fallback_active=True,
                    last_error="Ollama is not installed or its executable is not on PATH. Install Ollama, then restart Shram AI.",
                )
                return self.snapshot()

            ollama_app_exists = Path("/Applications/Ollama.app").exists() or (Path.home() / "Applications/Ollama.app").exists()
            if platform.system() == "Darwin" and ollama_app_exists:
                opener = shutil.which("open")
                if opener:
                    try:
                        subprocess.run(
                            [opener, "-a", "Ollama"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            timeout=5, check=False,
                        )
                        if self._wait_for_api(min(8.0, self.startup_timeout / 2)):
                            return self._probe()
                    except (OSError, subprocess.TimeoutExpired) as exc:
                        logger.info("Could not launch Ollama.app (%s)", type(exc).__name__)

            if not self._server_process_exists():
                try:
                    self._spawned_process = subprocess.Popen(
                        [executable, "serve"], stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                        start_new_session=True,
                    )
                except OSError as exc:
                    self._record(
                        ollama_installed=True, ollama_running=False, model_available=False,
                        ai_ready=False, state="startup_failed", fallback_active=True,
                        last_error=f"Could not start Ollama: {exc.strerror or type(exc).__name__}.",
                    )
                    return self.snapshot()

            if self._wait_for_api(self.startup_timeout):
                return self._probe()
            self._record(
                ollama_installed=True, ollama_running=False, model_available=False,
                ai_ready=False, state="startup_failed", fallback_active=True,
                last_error="Ollama did not become ready before the startup timeout. Job search and platform guidance remain available.",
            )
            return self.snapshot()

    def check(self) -> dict:
        provider = os.getenv("AI_PROVIDER", "ollama").strip().lower()
        if provider == "gemini":
            configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
            return {
                "provider": "gemini", "model": os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
                "ollama_installed": None, "ollama_running": None, "model_available": configured,
                "model_loading": False, "ai_ready": configured,
                "state": "ready" if configured else "temporarily_unavailable",
                "last_health_check": datetime.now(timezone.utc).isoformat(),
                "last_error": None if configured else "Gemini text provider is not configured.",
                "fallback_active": True,
            }
        return self._probe()

    def ensure_ready(self) -> dict:
        status = self._probe()
        if not status["ollama_running"]:
            status = self.ensure_running()
        return status

    def begin_request(self) -> None:
        with self._lock:
            self._active_requests += 1

    def end_request(self) -> None:
        with self._lock:
            self._active_requests = max(0, self._active_requests - 1)

    def note_request_success(self) -> None:
        with self._lock:
            self._request_fallback = False
            self._state["fallback_active"] = False
            self._state["last_error"] = None

    def note_request_failure(self, error: str) -> None:
        with self._lock:
            self._request_fallback = True
            self._state["fallback_active"] = True
            self._state["last_error"] = error


ollama_runtime = OllamaRuntime()
