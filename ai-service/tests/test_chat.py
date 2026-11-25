from fastapi.testclient import TestClient
import pytest
import asyncio

import main
import job_matching


client = TestClient(main.app)


@pytest.fixture(autouse=True)
def clear_chat_rate_limits(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.delenv("SHRAM_API_BASE_URL", raising=False)
    main.chat_requests.clear()
    yield
    main.chat_requests.clear()


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
    assert prompts[0][1:] == ("test-key", "gemini-3.1-flash-lite")

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


def test_chat_rejects_history_over_prompt_budget(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    response = client.post(
        "/api/v1/chat",
        json={
            "message": "Continue",
            "history": [
                {"role": "user", "text": "x" * (main.MAX_CHAT_HISTORY_CHARS + 1)}
            ],
        },
    )
    assert response.status_code == 422


def test_chat_enforces_per_client_rate_limit(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        main,
        "generate_chat_response",
        lambda *args: "Generated answer",
    )
    main.chat_requests.clear()
    for _ in range(main.CHAT_REQUEST_LIMIT):
        response = client.post("/api/v1/chat", json={"message": "Hello"})
        assert response.status_code == 200
    limited = client.post("/api/v1/chat", json={"message": "Hello again"})
    assert limited.status_code == 429
    assert limited.headers["retry-after"] == str(main.CHAT_REQUEST_WINDOW_SECONDS)


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
    assert limited.headers["retry-after"] == "30"

    monkeypatch.setattr(main, "generate_chat_response", raise_status(503))
    unavailable = client.post("/api/v1/chat", json={"message": "Hello"})
    assert unavailable.status_code == 503
    assert unavailable.headers["retry-after"] == "10"
    assert "temporarily unavailable" in unavailable.json()["detail"]

    monkeypatch.setattr(main, "generate_chat_response", raise_status(504))
    provider_timeout = client.post("/api/v1/chat", json={"message": "Hello"})
    assert provider_timeout.status_code == 504
    assert "too long" in provider_timeout.json()["detail"]

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


def test_ollama_chat_uses_configured_local_model(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_MODEL", "qwen3:4b")
    calls = []

    class Response:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"message": {"content": '{"answer":"I can help with Shram Bazar."}'}}

    class AsyncClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, **kwargs):
            calls.append((url, kwargs["json"]))
            return Response()

    monkeypatch.setattr(main.httpx, "AsyncClient", AsyncClient)
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "ollama_running": True, "model_available": True, "fallback_active": False, "last_error": None})
    response = client.post("/api/v1/chat", json={"message": "Give me practical interview tips for an electrician role."})
    assert response.status_code == 200
    assert response.json()["answer"] == "I can help with Shram Bazar."
    assert calls[0][0].endswith("/api/chat")
    assert calls[0][1]["model"] == "qwen3:4b"
    assert calls[0][1]["stream"] is False
    assert calls[0][1]["keep_alive"] == "2h"
    assert calls[0][1]["format"]["required"] == ["answer"]
    assert calls[0][1]["messages"][0]["role"] == "system"
    assert "general-knowledge and educational questions" in calls[0][1]["messages"][0]["content"]
    assert "remember prior turns" in calls[0][1]["messages"][0]["content"]


def test_ollama_internal_planning_is_not_returned(monkeypatch):
    class Response:
        status_code = 200
        def raise_for_status(self): pass
        def json(self):
            return {"message": {"content": '{"answer":"Okay, the user is asking about applications. I should focus on the key steps."}'}}

    class AsyncClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): return Response()

    monkeypatch.setattr(main.httpx, "AsyncClient", AsyncClient)
    with pytest.raises(RuntimeError, match="internal planning"):
        asyncio.run(main.generate_ollama_response("System prompt", "Question"))


def test_followup_question_receives_shared_job_context(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "ollama_running": True, "model_available": True, "fallback_active": False, "last_error": None})
    calls = []

    class Response:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"message": {"content": '{"answer":"The Data Entry Assistant involves entering records in spreadsheets."}'}}

    class AsyncClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, **kwargs):
            calls.append(kwargs["json"])
            return Response()

    monkeypatch.setattr(main.httpx, "AsyncClient", AsyncClient)
    history_context = (
        "Verified showcase listings shared in this conversation:\\n"
        "- Computer Technician Assistant | Maitidevi Computer Care | Kathmandu | NPR 20000-28000 monthly\\n"
        "- Data Entry Assistant | Samakhusi Business Support Services | Kathmandu | NPR 12000-16000 monthly"
    )
    response = client.post("/api/v1/chat", json={
        "message": "Which one involves spreadsheet work?",
        "context_job_ids": ["job-103", "job-094"],
        "history": [
            {"role": "user", "text": "Find IT jobs."},
            {"role": "assistant", "text": history_context},
        ],
    })
    assert response.status_code == 200
    assert response.json()["mode"] == "ai"
    assert "Computer Technician Assistant" in calls[0]["messages"][1]["content"]
    assert "Data Entry Assistant" in calls[0]["messages"][1]["content"]
    assert "Verified showcase jobs from the latest search" in calls[0]["messages"][1]["content"]


def test_highest_pay_followup_is_calculated_from_verified_showcase_jobs():
    response = client.post("/api/v1/chat", json={
        "message": "Which one has the highest pay?",
        "context_job_ids": ["job-103", "job-094"],
    })
    assert response.status_code == 200
    assert response.json()["mode"] == "local_guidance"
    assert "Computer Technician Assistant" in response.json()["answer"]
    assert "NPR 28,000 per month" in response.json()["answer"]


def test_ollama_unavailable_and_missing_model_are_actionable(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "ollama_running": True, "model_available": True, "fallback_active": False, "last_error": None})
    class ConnectionErrorClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): raise main.httpx.ConnectError("connection refused")
    monkeypatch.setattr(main.httpx, "AsyncClient", ConnectionErrorClient)
    unavailable = client.post("/api/v1/chat", json={"message": "What should I discuss during an electrician interview?"})
    assert unavailable.status_code == 200
    assert unavailable.json()["fallback_active"] is True
    assert "temporarily unavailable" in unavailable.json()["answer"]

    class MissingModelResponse:
        status_code = 404
        def raise_for_status(self): pass
        def json(self): return {"error": "model 'missing-model' not found"}

    monkeypatch.setattr(main, "OLLAMA_MODEL", "missing-model")
    class MissingModelClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): return MissingModelResponse()
    monkeypatch.setattr(main.httpx, "AsyncClient", MissingModelClient)
    missing = client.post("/api/v1/chat", json={"message": "What should I discuss during an electrician interview?"})
    assert missing.status_code == 200
    assert missing.json()["fallback_active"] is True
    assert "temporarily unavailable" in missing.json()["answer"]


def test_job_search_does_not_touch_ollama(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: (_ for _ in ()).throw(AssertionError("job search must be local")))
    response = client.post("/api/v1/chat", json={"message": "Find delivery jobs in Kathmandu."})
    assert response.status_code == 200
    assert response.json()["mode"] == "job_search"
    assert response.json()["jobs"]


def test_list_down_kitchen_helper_query_returns_kitchen_listings_without_ollama(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: (_ for _ in ()).throw(AssertionError("listing search must be local")))
    response = client.post("/api/v1/chat", json={"message": "list down the works related to kitchen helper"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "job_search"
    assert payload["jobs"]
    assert payload["jobs"][0]["title"] == "Kitchen Helper"
    assert all("kitchen" in (job["title"] + " " + job["description"] + " " + " ".join(job["skills"])).lower() or "cook" in (job["title"] + " " + job["description"] + " " + " ".join(job["skills"])).lower() for job in payload["jobs"])


def test_jobs_are_loaded_from_java_showcase_api_when_configured(monkeypatch):
    api_job = {"id": "backend-kitchen-job", "title": "Kitchen Helper", "category": "Hospitality & Service", "skills": ["Kitchen hygiene"]}
    monkeypatch.setenv("SHRAM_API_BASE_URL", "http://java-api:8080")

    class ApiResponse:
        def raise_for_status(self):
            return None
        def json(self):
            return [api_job]

    def get(url, timeout):
        assert url == "http://java-api:8080/api/jobs/showcase"
        assert timeout > 0
        return ApiResponse()

    monkeypatch.setattr(job_matching.httpx, "get", get)
    assert job_matching.load_jobs() == [api_job]


def test_ai_service_has_a_bundled_jobs_fallback(monkeypatch):
    monkeypatch.delenv("SHRAM_API_BASE_URL", raising=False)
    jobs = job_matching.load_jobs()
    assert jobs
    assert any(job["title"] == "Computer Technician Assistant" for job in jobs)


@pytest.mark.parametrize("query", [
    "what are the construction works available in shram bazaar?",
    "can u provide lists of construction works available here?",
])
def test_construction_work_queries_return_real_construction_listings_without_ollama(monkeypatch, query):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: (_ for _ in ()).throw(AssertionError("listing search must be local")))
    response = client.post("/api/v1/chat", json={"message": query})
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "job_search"
    assert payload["jobs"]
    dataset_ids = {job["id"] for job in main.load_jobs()}
    assert all(job["id"] in dataset_ids for job in payload["jobs"])
    assert all(job["category"] == "Construction & Skilled Trades" for job in payload["jobs"])


def test_personalized_job_question_uses_worker_profile_and_returns_matching_cards(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: (_ for _ in ()).throw(AssertionError("profile matching must not require the model")))
    response = client.post("/api/v1/chat", json={
        "message": "according to my profile what work matches me best?",
        "worker_context": '{"skills":["Wok cooking","Kitchen hygiene"],"preferredCategories":["Hospitality & Service"],"district":"Kathmandu"}',
    })
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "job_search"
    assert payload["jobs"]
    assert any("Kitchen hygiene" in reason or "Wok cooking" in reason for job in payload["jobs"] for reason in job["match_reasons"])
    assert all(job["id"] in {record["id"] for record in main.load_jobs()} for job in payload["jobs"])


def test_profile_match_without_work_details_asks_worker_to_complete_profile(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: (_ for _ in ()).throw(AssertionError("profile guidance must be local")))
    response = client.post("/api/v1/chat", json={
        "message": "what work matches me best according to my profile?",
        "worker_context": '{"skills":[],"qualifications":[],"experience":[]}',
    })
    assert response.status_code == 200
    assert response.json()["mode"] == "job_search"
    assert "add your skills" in response.json()["answer"].lower()


def test_analyze_my_profile_reaches_qwen_with_worker_profile_context(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "ollama_running": True, "model_available": True, "fallback_active": False, "last_error": None})
    captured = {}

    async def generate(system_instruction, prompt):
        captured["system"] = system_instruction
        captured["prompt"] = prompt
        return "Your cooking experience fits kitchen roles."

    monkeypatch.setattr(main, "generate_ollama_response", generate)
    response = client.post("/api/v1/chat", json={
        "message": "Please analyze my profile.",
        "worker_context": '{"skills":["Kitchen hygiene"],"experience":["Restaurant cook"],"location":"Kathmandu"}',
    })
    assert response.status_code == 200
    assert response.json()["mode"] == "ai"
    assert response.json()["answer"] == "Your cooking experience fits kitchen roles."
    assert response.json()["jobs"]
    assert "Kitchen hygiene" in captured["prompt"]
    assert "Restaurant cook" in captured["prompt"]
    assert "Kitchen Helper" in captured["prompt"]
    assert "analyze a worker profile" in captured["system"]


def test_profile_review_rejects_made_up_examples_from_model(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "ollama_running": True, "model_available": True, "fallback_active": False, "last_error": None})

    async def generate(_system_instruction, _prompt):
        return "Add a Bachelor degree (e.g. Expected 2025), add work at XYZ Office, and claim 50+ guests served weekly."

    monkeypatch.setattr(main, "generate_ollama_response", generate)
    response = client.post("/api/v1/chat", json={
        "message": "Review my profile and suggest changes.",
        "worker_context": '{"skills":["Guest service"],"experience":["Front Desk Assistant"],"qualifications":[],"bio":"Currently pursuing a Bachelor of Business Studies","availability":"Flexible"}',
    })
    assert response.status_code == 200
    answer = response.json()["answer"]
    assert "XYZ" not in answer
    assert "2025" not in answer
    assert "50+" not in answer
    assert "qualifications section" in answer.lower()


def test_model_unavailable_fallback_remains_useful(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": False, "ollama_running": False, "model_available": False, "fallback_active": True, "last_error": "Ollama is stopped."})
    response = client.post("/api/v1/chat", json={"message": "What should I discuss during an electrician interview?"})
    assert response.status_code == 200
    assert response.json()["mode"] == "fallback"
    assert response.json()["fallback_active"] is True
    assert "temporarily unavailable" in response.json()["answer"]


def test_platform_application_guidance_is_deterministic(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: (_ for _ in ()).throw(AssertionError("known platform guidance must be local")))
    response = client.post("/api/v1/chat", json={"message": "How do applications work?"})
    assert response.status_code == 200
    assert response.json()["mode"] == "local_guidance"
    assert "Apply" in response.json()["answer"]
    assert "My Applications" in response.json()["answer"]


def test_general_question_about_technology_applications_is_not_misrouted():
    assert main.deterministic_platform_guidance("What are common applications of information technology?") is None
    assert main.deterministic_platform_guidance("Please analyze my profile.") is None


def test_how_to_apply_is_answered_as_a_process_not_a_job_search(monkeypatch):
    monkeypatch.setattr(main, "search_jobs", lambda *args: (_ for _ in ()).throw(AssertionError("an apply how-to is not a listing search")))
    response = client.post("/api/v1/chat", json={"message": "How can I apply for these jobs?"})
    assert response.status_code == 200
    assert response.json()["mode"] == "local_guidance"
    assert "Apply now" in response.json()["answer"]
    assert "My Applications" in response.json()["answer"]
    assert "does not contact a real employer" in response.json()["answer"]


def test_ai_status_endpoint_returns_provider_state(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.delenv("GEMINI_VOICE_API_KEY", raising=False)
    expected = {"provider": "ollama", "model": "qwen3:4b", "ai_ready": False, "state": "model_missing"}
    monkeypatch.setattr(main.ollama_runtime, "check", lambda: expected)
    response = client.get("/api/v1/ai/status")
    assert response.status_code == 200
    assert response.json() == {
        **expected,
        "chat_provider": "ollama",
        "resume_extraction": {"enabled": True, "provider": "ollama", "model": "qwen3:4b", "schema_version": 1},
        "voice_assistant": {"enabled": False, "provider": "gemini", "model": main.VOICE_MODEL},
    }


def test_ai_status_reports_when_chat_is_misconfigured_for_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setattr(main.ollama_runtime, "check", lambda: {"provider": "ollama", "model": "qwen3:4b"})
    response = client.get("/api/v1/ai/status")
    assert response.status_code == 200
    assert response.json()["chat_provider"] == "gemini"


@pytest.mark.parametrize("payload", [
    {"message": {"content": ""}},
    {"message": {"content": None}},
    {"unexpected": "shape"},
])
def test_empty_or_malformed_ollama_responses_use_fallback(monkeypatch, payload):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "ollama_running": True, "model_available": True, "fallback_active": False, "last_error": None})

    class Response:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return payload
    class AsyncClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): return Response()
    monkeypatch.setattr(main.httpx, "AsyncClient", AsyncClient)
    response = client.post("/api/v1/chat", json={"message": "What should I discuss during an electrician interview?"})
    assert response.status_code == 200
    assert response.json()["fallback_active"] is True
    assert "temporarily unavailable" in response.json()["answer"]


def test_ollama_request_timeout_uses_fallback(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "ollama_running": True, "model_available": True, "fallback_active": False, "last_error": None})
    class TimeoutClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs): raise main.httpx.ReadTimeout("slow model")
    monkeypatch.setattr(main.httpx, "AsyncClient", TimeoutClient)
    response = client.post("/api/v1/chat", json={"message": "What should I discuss during an electrician interview?"})
    assert response.status_code == 200
    assert response.json()["mode"] == "fallback"
    assert response.json()["fallback_active"] is True


def test_fastapi_lifespan_stays_up_when_local_ai_start_fails(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_running", lambda: {"ai_ready": False, "state": "startup_failed", "model": "qwen3:4b", "last_error": "Ollama did not start."})
    with TestClient(main.app) as app_client:
        assert app_client.get("/health").status_code == 200


def test_job_search_returns_only_existing_dataset_records():
    response = client.post("/api/v1/chat", json={"message": "Find electrician jobs in Kathmandu."})
    assert response.status_code == 200
    payload = response.json()
    assert payload["jobs"]
    dataset_ids = {job["id"] for job in main.load_jobs()}
    assert all(job["id"] in dataset_ids for job in payload["jobs"])
    assert any("electric" in (job["title"] + " " + " ".join(job["skills"])).lower() for job in payload["jobs"])


@pytest.mark.parametrize("query", [
    "Find electrician jobs in Kathmandu.",
    "I am a student looking for part-time work.",
    "I have plumbing experience. Find jobs for me.",
    "Find jobs in Lalitpur.",
    "Show me jobs that don't require much experience.",
    "I can only work on weekends.",
    "Find cooking jobs.",
    "Find delivery jobs.",
    "Find me a job.",
    "What construction works are available here?",
])
def test_expected_natural_language_job_queries_use_dataset(query):
    jobs, is_search = main.search_jobs(query)
    assert is_search
    assert jobs
    assert {job["id"] for job in jobs} <= {job["id"] for job in main.load_jobs()}


@pytest.mark.parametrize("query", [
    "Find quantum analyst jobs in Kathmandu.",
    "what are the jobs related to backend developer that u can provide me?",
])
def test_no_matching_job_is_not_invented(query):
    jobs, is_search = main.search_jobs(query)
    assert is_search
    assert jobs == []


def test_location_followup_keeps_prior_skill_criteria():
    jobs, is_search = main.search_jobs(
        "What about Lalitpur?",
        [{"role": "user", "text": "Find electrician jobs in Kathmandu."}],
    )
    assert is_search
    assert jobs
    assert all(job["city"] == "Lalitpur" for job in jobs)
    assert any("electric" in (job["title"] + " " + " ".join(job["skills"]) + " " + job["description"]).lower() for job in jobs)


def test_it_job_search_matches_computing_roles_not_older_search_topics():
    jobs, is_search = main.search_jobs(
        "What jobs are available here related to IT fields?",
        [{"role": "user", "text": "Find delivery jobs around Boudha in Kathmandu."}],
    )
    titles = {job["title"] for job in jobs}
    assert is_search
    assert "Computer Technician Assistant" in titles
    assert "Data Entry Assistant" in titles
    assert "Mobile Repair Assistant" in titles
    assert "Bricklayer Helper" not in titles
    assert "Meat Shop Helper" not in titles
