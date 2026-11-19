from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def test_freeapi_job_search_proxy(monkeypatch):
    captured = {}

    def fake_get(url, **kwargs):
        captured["url"] = url
        captured["params"] = kwargs["params"]
        return FakeResponse(
            payload={
                "data": {
                    "jobs": [
                        {"id": 1, "title": "Construction Helper", "location": "Kathmandu"}
                    ]
                }
            }
        )

    monkeypatch.setattr(main.httpx, "get", fake_get)
    response = client.get(
        "/api/v1/freeapi/jobs/search",
        params={"category": "Construction", "location": "Kathmandu"},
    )

    assert response.status_code == 200
    assert response.json()["jobs"][0]["title"] == "Construction Helper"
    assert captured["params"] == {
        "category": "Construction",
        "location": "Kathmandu",
    }


def test_freeapi_proxy_reports_upstream_outage(monkeypatch):
    monkeypatch.setattr(
        main.httpx,
        "get",
        lambda *args, **kwargs: FakeResponse(status_code=502),
    )
    response = client.get("/api/v1/freeapi/jobs/search")
    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["detail"]
