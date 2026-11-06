from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


def test_chat_returns_response_and_preserves_conversation(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    prompts = []

    def generate(prompt, api_key, model):
        prompts.append((prompt, api_key, model))
        return "Genuine generated answer"

    monkeypatch.setattr(main, "generate_chat_response", generate)
    response = client.post(
        "/api/v1/chat",
        json={"message": "Hello", "history": [], "language": "en"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"] == "Genuine generated answer"
    assert payload["conversation_id"]
    assert payload["source_files"] == []
    assert prompts[0][1:] == ("test-key", "gemini-3.6-flash")

    follow_up = client.post(
        "/api/v1/chat",
        json={
            "message": "What about two hours?",
            "conversation_id": payload["conversation_id"],
            "history": [
                {"role": "user", "text": "What is the average payment for cleaning work?"},
                {"role": "assistant", "text": "It depends on location and scope."},
            ],
        },
    )
    assert follow_up.status_code == 200
    assert follow_up.json()["conversation_id"] == payload["conversation_id"]
    assert "average payment for cleaning work" in prompts[1][0]
    assert "What about two hours?" in prompts[1][0]


def test_chat_rejects_empty_message_and_invalid_history(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    empty = client.post("/api/v1/chat", json={"message": "  "})
    assert empty.status_code == 422
    invalid_history = client.post(
        "/api/v1/chat",
        json={"message": "Hi", "history": [{"role": "system", "text": "bad"}]},
    )
    assert invalid_history.status_code == 422


def test_chat_requires_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post("/api/v1/chat", json={"message": "Hello"})
    assert response.status_code == 503
    monkeypatch.setenv("GEMINI_API_KEY", "replace_with_your_key")
    placeholder = client.post("/api/v1/chat", json={"message": "Hello"})
    assert placeholder.status_code == 503


def test_chat_maps_invalid_key_rate_limit_and_timeout(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def raise_status(status):
        def fail(*args, **kwargs):
            error = RuntimeError("provider details must not leak")
            error.code = status
            raise error
        return fail

    monkeypatch.setattr(main, "generate_chat_response", raise_status(401))
    invalid_key = client.post("/api/v1/chat", json={"message": "Hello"})
    assert invalid_key.status_code == 401
    assert "provider details" not in invalid_key.text

    def rejected_key(*args, **kwargs):
        error = RuntimeError("provider details must not leak")
        error.code = 400
        error.message = "API key not valid. Please pass a valid API key."
        raise error

    monkeypatch.setattr(main, "generate_chat_response", rejected_key)
    invalid_key_400 = client.post("/api/v1/chat", json={"message": "Hello"})
    assert invalid_key_400.status_code == 401

    monkeypatch.setattr(main, "generate_chat_response", raise_status(429))
    limited = client.post("/api/v1/chat", json={"message": "Hello"})
    assert limited.status_code == 429

    def timeout(*args, **kwargs):
        raise TimeoutError("timed out")

    monkeypatch.setattr(main, "generate_chat_response", timeout)
    timed_out = client.post("/api/v1/chat", json={"message": "Hello"})
    assert timed_out.status_code == 504


def test_chat_handles_provider_error_safely(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def fail(*args, **kwargs):
        raise RuntimeError("private provider response")

    monkeypatch.setattr(main, "generate_chat_response", fail)
    response = client.post("/api/v1/chat", json={"message": "Hello"})
    assert response.status_code == 502
    assert "private provider response" not in response.text
