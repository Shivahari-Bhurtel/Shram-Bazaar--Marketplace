from io import BytesIO

import pytest
from docx import Document
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)
PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def make_docx(text="Resume: experienced carpenter and welder"):
    document = Document()
    document.add_paragraph(text)
    stream = BytesIO()
    document.save(stream)
    return stream.getvalue()


def make_text_pdf(text="Resume: carpenter and welder"):
    safe = text.encode("ascii", "replace").decode("ascii").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    content = f"BT /F1 12 Tf 72 720 Td ({safe}) Tj ET".encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream",
    ]
    result = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(result))
        result.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref_offset = len(result)
    result.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        result.extend(f"{offset:010d} 00000 n \n".encode())
    result.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode())
    return bytes(result)


@pytest.fixture(autouse=True)
def ready_local_ollama(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": True, "last_error": None})


def test_extracts_text_from_docx_and_pdf():
    assert "experienced carpenter" in main.extract_resume_text("resume.docx", DOCX_MIME, make_docx())
    assert "carpenter and welder" in main.extract_resume_text("resume.pdf", PDF_MIME, make_text_pdf())


def test_extracts_structured_fields_and_removes_duplicate_skills():
    source = "Rita Karki rita@example.com 9800000000 Lalitpur Mason at ABC Build, 2021-01 to 2022-02 Brickwork Painter at HomeWorks, 2023-01 Nepali Masonry Painting SEE Shree School"
    response = main.normalize_resume_extraction('{"fullName":"Rita Karki","email":"rita@example.com","phone":"9800000000","location":"Lalitpur","bio":null,"skills":["Masonry","masonry","Painting"],"qualifications":[{"name":"SEE","institution":"Shree School","field":"General","year":2020}],"experience":[{"title":"Mason","company":"ABC Build","description":"Brickwork","startDate":"2021-01","endDate":"2022-02"},{"title":"Painter","company":"HomeWorks","description":"Interior painting","startDate":"2023-01","endDate":null}],"languages":["Nepali"],"certifications":[]}', source)
    assert response.fullName == "Rita Karki"
    assert response.skills == ["Masonry", "Painting"]
    assert len(response.experience) == 2
    assert response.experience[1].endDate is None


def test_missing_fields_become_null_or_empty_and_prompt_injection_is_not_interpreted():
    response = main.normalize_resume_extraction('{"skills":["Carpentry"],"experience":[]}', "Carpentry")
    assert response.fullName is None
    assert response.qualifications == []
    assert response.experience == []
    assert response.skills == ["Carpentry"]


def test_labeled_skills_override_misclassified_model_fields_and_unstated_employers_are_removed():
    source = "Ramesh Thapa\nWorks as a mason in Bhaktapur. Skills include brick laying and plastering."
    raw = '{"fullName":null,"location":null,"skills":[],"qualifications":[{"name":"brick laying","institution":"","field":"skills","year":null}],"experience":[{"title":"mason","company":"Works","description":"","startDate":null,"endDate":null,"currentlyWorking":true}],"certifications":["plastering"]}'
    result = main.normalize_resume_extraction(raw, source)
    assert result.fullName == "Ramesh Thapa"
    assert result.location == "Bhaktapur"
    assert result.skills == ["brick laying", "plastering"]
    assert result.qualifications == []
    assert result.certifications == []
    assert len(result.experience) == 1
    assert result.experience[0].title == "mason"
    assert result.experience[0].company == ""
    assert result.experience[0].currentlyWorking is None


def test_multiple_experience_entries_are_extracted_without_inferred_dates():
    source = "Mina Gurung\nKitchen Helper, Lakeside Hotel, 2020-2021: Food preparation.\nCare Assistant, Family Care Nepal, 2024-Present: Elder care.\nSkills: Cooking, elder care."
    result = main.normalize_resume_extraction('{"skills":[],"experience":[]}', source)
    assert result.skills == ["Cooking", "elder care"]
    assert [item.title for item in result.experience] == ["Kitchen Helper", "Care Assistant"]
    assert result.experience[0].startDate == "2020-01-01"
    assert result.experience[0].endDate == "2021-12-31"
    assert result.experience[1].currentlyWorking is True
    assert result.experience[1].endDate is None


def test_labeled_resume_extracts_profile_education_work_and_availability_fields():
    source = """AARAV RAJ SHARMA
Baneshwor, Kathmandu, Nepal
aarav@example.com | +977-9801234567
PROFESSIONAL SUMMARY
Dependable worker with retail and hospitality experience.
WORK EXPERIENCE
Sales Assistant
Himalayan Mart Pvt. Ltd. — Kathmandu | January 2024 – December 2024
• Helped customers and processed payments.
Restaurant Service Assistant
Urban Cafe — Thamel Kathmandu | February 2025 – August 2025
• Served customers and supported the team.
EDUCATION
Higher Secondary Education (+2 Management)
Kathmandu Model Secondary School, Kathmandu Completed: 2023
SEE (Secondary Education Examination)
Kathmandu, Nepal Completed: 2021
TECHNICAL SKILLS
Microsoft Word
Microsoft Excel
PROFESSIONAL SKILLS
Customer communication
LANGUAGES
Nepali — Native
English — Professional working proficiency
AVAILABILITY
Employment preference: Part-time or full-time
Preferred shifts: Morning and evening
Weekends available
Preferred location: Kathmandu Valley
Can start: Within two weeks
REFERENCES
Available upon request."""
    facts = main.extract_resume_facts(source)
    assert facts["fullName"] == "Aarav Raj Sharma"
    assert facts["email"] == "aarav@example.com"
    assert facts["phone"] == "+9779801234567"
    assert len(facts["experience"]) == 2
    assert facts["qualifications"][0]["institution"] == "Kathmandu Model Secondary School"
    assert facts["skills"] == ["Microsoft Word", "Microsoft Excel", "Customer communication"]
    assert facts["languages"] == ["Nepali — Native", "English — Professional working proficiency"]
    assert facts["employmentPreferences"] == ["Part-time", "full-time"]
    assert facts["preferredShifts"] == ["Morning", "evening"]
    assert facts["weekendsAvailable"] is True
    assert facts["preferredWorkLocation"] == "Kathmandu Valley"
    assert facts["availableStart"] == "Within two weeks"
    assert facts["referenceNote"] == "Available upon request."


def test_rejects_malformed_model_json():
    with pytest.raises(ValueError):
        main.normalize_resume_extraction("not json")


def test_rejects_mismatched_extension_and_mime():
    with pytest.raises(main.HTTPException) as exc:
        main.extract_resume_text("resume.pdf", DOCX_MIME, b"not a document")
    assert exc.value.status_code == 415


def test_rejects_oversized_upload():
    response = client.post("/api/v1/resume-analysis", files={"file": ("resume.pdf", b"x" * (main.MAX_RESUME_BYTES + 1), PDF_MIME)})
    assert response.status_code == 413


def test_rejects_unreadable_document():
    response = client.post("/api/v1/resume-analysis", files={"file": ("resume.pdf", b"not a pdf", PDF_MIME)})
    assert response.status_code == 422


def test_endpoint_returns_structured_extraction(monkeypatch):
    async def extraction(_text):
        return main.ResumeExtractionResponse(fullName="Asha Rai", skills=["Plumbing"])
    monkeypatch.setattr(main, "extract_resume_profile", extraction)
    response = client.post("/api/v1/resume-analysis", files={"file": ("resume.docx", make_docx(), DOCX_MIME)})
    assert response.status_code == 200
    assert response.json()["fullName"] == "Asha Rai"
    assert response.json()["skills"] == ["Plumbing"]
    assert response.json()["experience"] == []


def test_ollama_unavailable_is_actionable(monkeypatch):
    monkeypatch.setattr(main.ollama_runtime, "ensure_ready", lambda: {"ai_ready": False, "last_error": "private internal detail"})
    response = client.post("/api/v1/resume-analysis", files={"file": ("resume.docx", make_docx(), DOCX_MIME)})
    assert response.status_code == 503
    assert "Start Ollama" in response.json()["detail"]
    assert "private internal detail" not in response.text


def test_resume_calls_share_extraction_gate_and_do_not_call_gemini(monkeypatch):
    calls = []
    async def extraction(text):
        calls.append(text)
        return main.ResumeExtractionResponse()
    monkeypatch.setattr(main, "extract_resume_profile", extraction)
    response = client.post("/api/v1/resume-analysis", files={"file": ("resume.docx", make_docx(), DOCX_MIME)})
    assert response.status_code == 200
    assert calls and "experienced carpenter" in calls[0]
