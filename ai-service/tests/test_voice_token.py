from datetime import datetime, timezone

from fastapi.testclient import TestClient
from google.genai import types

import main


client = TestClient(main.app)


def test_voice_token_uses_separate_key_and_restricted_live_config(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "text-project-key")
    monkeypatch.setenv("GEMINI_VOICE_API_KEY", "voice-project-key")
    captured = {}

    class FakeAuthTokens:
        def create(self, *, config):
            captured["config"] = config
            return types.AuthToken(name="temporary-live-token")

    class FakeClient:
        def __init__(self, *, api_key, http_options):
            captured["api_key"] = api_key
            captured["timeout"] = http_options.timeout
            self.auth_tokens = FakeAuthTokens()

    monkeypatch.setattr(main.genai, "Client", FakeClient)
    response = client.post("/api/v1/voice/token", json={"language": "ne"})

    assert response.status_code == 200
    result = response.json()
    config = captured["config"]
    assert result["token"] == "temporary-live-token"
    assert result["model"] == "gemini-3.8-live"
    assert result["input_sample_rate"] == 16000
    assert result["output_sample_rate"] == 24000
    assert "नेपाली" in result["system_instruction"]
    assert "voice-project-key" not in response.text
    assert "text-project-key" not in response.text
    assert captured["api_key"] == "voice-project-key"
    assert captured["timeout"] == 15000
    assert config.uses == 1
    assert config.expire_time > datetime.now(timezone.utc)
    assert config.new_session_expire_time < config.expire_time
    assert config.live_connect_constraints.model == "gemini-3.8-live"
    live_config = config.live_connect_constraints.config
    assert live_config.response_modalities == ["AUDIO"]
    assert "work companion" in live_config.system_instruction
    assert "live job listings" in live_config.system_instruction
    assert config.lock_additional_fields == []
    assert "sessionResumption" not in config.lock_additional_fields


def test_voice_token_requires_voice_key_even_when_text_key_exists(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "text-project-key")
    monkeypatch.delenv("GEMINI_VOICE_API_KEY", raising=False)
    response = client.post("/api/v1/voice/token", json={"language": "en"})
    assert response.status_code == 503
    assert response.json()["detail"].startswith("Voice AI is not configured")


def test_voice_token_maps_provider_errors_safely(monkeypatch):
    monkeypatch.setenv("GEMINI_VOICE_API_KEY", "voice-project-key")

    class FakeAuthTokens:
        def create(self, *, config):
            error = RuntimeError("private provider details")
            error.code = 429
            raise error

    class FakeClient:
        def __init__(self, *, api_key, http_options):
            self.auth_tokens = FakeAuthTokens()

    monkeypatch.setattr(main.genai, "Client", FakeClient)
    response = client.post("/api/v1/voice/token", json={"language": "en"})
    assert response.status_code == 429
    assert "private provider details" not in response.text


def test_voice_token_maps_invalid_credentials_and_generic_errors(monkeypatch):
    monkeypatch.setenv("GEMINI_VOICE_API_KEY", "voice-project-key")

    class FakeAuthTokens:
        def create(self, *, config):
            error = RuntimeError("private provider details")
            error.code = 400
            error.message = "API key not valid"
            raise error

    class FakeClient:
        def __init__(self, *, api_key, http_options):
            self.auth_tokens = FakeAuthTokens()

    monkeypatch.setattr(main.genai, "Client", FakeClient)
    rejected = client.post("/api/v1/voice/token", json={"language": "en"})
    assert rejected.status_code == 503
    assert "private provider details" not in rejected.text

    class GenericFailure:
        def create(self, *, config):
            raise RuntimeError("internal details must not leak")

    class GenericClient:
        def __init__(self, *, api_key, http_options):
            self.auth_tokens = GenericFailure()

    monkeypatch.setattr(main.genai, "Client", GenericClient)
    failed = client.post("/api/v1/voice/token", json={"language": "en"})
    assert failed.status_code == 502
    assert "internal details" not in failed.text


def test_voice_token_timeout_is_safe(monkeypatch):
    monkeypatch.setenv("GEMINI_VOICE_API_KEY", "voice-project-key")

    class FakeAuthTokens:
        def create(self, *, config):
            raise TimeoutError("provider timeout details")

    class FakeClient:
        def __init__(self, *, api_key, http_options):
            self.auth_tokens = FakeAuthTokens()

    monkeypatch.setattr(main.genai, "Client", FakeClient)
    response = client.post("/api/v1/voice/token", json={"language": "en"})
    assert response.status_code == 504
    assert "provider timeout details" not in response.text


def test_voice_token_rate_limits_repeated_requests(monkeypatch):
    monkeypatch.setenv("GEMINI_VOICE_API_KEY", "voice-project-key")
    main.voice_token_requests.pop("testclient", None)

    class FakeAuthTokens:
        def create(self, *, config):
            return types.AuthToken(name="temporary-token")

    class FakeClient:
        def __init__(self, *, api_key, http_options):
            self.auth_tokens = FakeAuthTokens()

    monkeypatch.setattr(main.genai, "Client", FakeClient)
    for _ in range(main.VOICE_TOKEN_REQUEST_LIMIT):
        response = client.post("/api/v1/voice/token", json={"language": "en"})
        assert response.status_code == 200
    limited = client.post("/api/v1/voice/token", json={"language": "en"})
    assert limited.status_code == 429
    assert limited.headers["retry-after"] == "60"
