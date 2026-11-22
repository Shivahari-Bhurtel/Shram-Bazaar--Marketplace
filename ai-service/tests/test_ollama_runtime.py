import httpx

from ollama_runtime import OllamaRuntime


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self.payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("failed", request=httpx.Request("GET", "http://ollama"), response=httpx.Response(self.status_code))

    def json(self):
        return self.payload


def test_running_ollama_and_accessible_model_are_ready(monkeypatch):
    runtime = OllamaRuntime()
    monkeypatch.setattr(runtime, "_ollama_executable", lambda: "/usr/bin/ollama")
    monkeypatch.setattr("ollama_runtime.httpx.get", lambda *args, **kwargs: FakeResponse({"models": [{"name": "qwen3:4b"}]}))
    monkeypatch.setattr("ollama_runtime.httpx.post", lambda *args, **kwargs: FakeResponse({"modelfile": "FROM qwen3:4b"}))
    status = runtime.check()
    assert status["ollama_installed"] is True
    assert status["ollama_running"] is True
    assert status["model_available"] is True
    assert status["ai_ready"] is True
    assert status["state"] == "ready"


def test_installed_but_stopped_ollama_is_reported(monkeypatch):
    runtime = OllamaRuntime()
    monkeypatch.setattr(runtime, "_ollama_executable", lambda: "/usr/bin/ollama")
    monkeypatch.setattr("ollama_runtime.httpx.get", lambda *args, **kwargs: (_ for _ in ()).throw(httpx.ConnectError("down")))
    status = runtime.check()
    assert status["ollama_installed"] is True
    assert status["ollama_running"] is False
    assert status["ai_ready"] is False
    assert status["state"] == "ollama_not_running"


def test_model_missing_is_not_downloaded(monkeypatch):
    runtime = OllamaRuntime()
    monkeypatch.setattr(runtime, "_ollama_executable", lambda: "/usr/bin/ollama")
    monkeypatch.setattr("ollama_runtime.httpx.get", lambda *args, **kwargs: FakeResponse({"models": []}))
    status = runtime.check()
    assert status["ollama_running"] is True
    assert status["model_available"] is False
    assert status["ai_ready"] is False
    assert "ollama pull qwen3:4b" in status["last_error"]


def test_model_metadata_timeout_is_reported_as_loading(monkeypatch):
    runtime = OllamaRuntime()
    monkeypatch.setattr(runtime, "_ollama_executable", lambda: "/usr/bin/ollama")
    monkeypatch.setattr("ollama_runtime.httpx.get", lambda *args, **kwargs: FakeResponse({"models": [{"name": "qwen3:4b"}]}))
    monkeypatch.setattr("ollama_runtime.httpx.post", lambda *args, **kwargs: (_ for _ in ()).throw(httpx.ReadTimeout("loading")))
    status = runtime.check()
    assert status["ollama_running"] is True
    assert status["model_available"] is True
    assert status["model_loading"] is True
    assert status["ai_ready"] is False
    assert status["state"] == "model_loading"


def test_startup_recovers_without_spawning_duplicate_server(monkeypatch):
    runtime = OllamaRuntime()
    runtime.start_cooldown = 0
    monkeypatch.setattr(runtime, "_probe", lambda: {"ai_ready": False, "ollama_running": False, "last_error": "stopped"})
    monkeypatch.setattr(runtime, "_ollama_executable", lambda: "/usr/bin/ollama")
    monkeypatch.setattr(runtime, "_server_process_exists", lambda: True)
    monkeypatch.setattr(runtime, "_wait_for_api", lambda seconds: True)
    statuses = iter([
        {"ai_ready": False, "ollama_running": False, "last_error": "stopped"},
        {"ai_ready": True, "ollama_running": True, "last_error": None},
    ])
    monkeypatch.setattr(runtime, "_probe", lambda: next(statuses))
    monkeypatch.setattr("ollama_runtime.subprocess.Popen", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("duplicate Ollama process")))
    assert runtime.ensure_running()["ai_ready"] is True


def test_startup_spawns_once_and_reports_failure(monkeypatch):
    runtime = OllamaRuntime()
    runtime.start_cooldown = 0
    statuses = iter([
        {"ai_ready": False, "ollama_running": False, "last_error": "stopped"},
        {"ai_ready": False, "ollama_running": False, "last_error": "stopped"},
    ])
    monkeypatch.setattr(runtime, "_probe", lambda: next(statuses))
    monkeypatch.setattr(runtime, "_ollama_executable", lambda: "/usr/bin/ollama")
    monkeypatch.setattr(runtime, "_server_process_exists", lambda: False)
    monkeypatch.setattr(runtime, "_wait_for_api", lambda seconds: False)
    starts = []
    class Process:
        def poll(self): return None
    monkeypatch.setattr("ollama_runtime.subprocess.Popen", lambda *args, **kwargs: (starts.append(args[0]) or Process()))
    status = runtime.ensure_running()
    assert starts == [["/usr/bin/ollama", "serve"]]
    assert status["state"] == "startup_failed"
    assert status["ai_ready"] is False


def test_not_installed_does_not_attempt_to_start(monkeypatch):
    runtime = OllamaRuntime()
    runtime.start_cooldown = 0
    monkeypatch.setattr(runtime, "_probe", lambda: {"ai_ready": False, "ollama_running": False, "last_error": "stopped"})
    monkeypatch.setattr(runtime, "_ollama_executable", lambda: None)
    monkeypatch.setattr("ollama_runtime.subprocess.Popen", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("must not start absent executable")))
    status = runtime.ensure_running()
    assert status["state"] == "ollama_not_installed"
    assert status["ollama_installed"] is False
