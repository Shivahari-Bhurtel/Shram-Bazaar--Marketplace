from io import BytesIO

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
    # Build a small PDF page with a standard Helvetica font and text content.
    content = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("ascii")
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


def test_extracts_text_from_docx():
    text = main.extract_resume_text("resume.docx", DOCX_MIME, make_docx())
    assert "experienced carpenter and welder" in text


def test_extracts_text_from_pdf():
    text = main.extract_resume_text("resume.pdf", PDF_MIME, make_text_pdf())
    assert "carpenter and welder" in text


def test_rejects_mismatched_extension_and_mime():
    try:
        main.extract_resume_text("resume.pdf", DOCX_MIME, b"not a document")
    except main.HTTPException as exc:
        assert exc.status_code == 415
    else:
        raise AssertionError("Mismatched file type should be rejected")


def test_rejects_oversized_upload():
    response = client.post(
        "/api/v1/resume-analysis",
        files={"file": ("resume.pdf", b"x" * (main.MAX_RESUME_BYTES + 1), PDF_MIME)},
    )
    assert response.status_code == 413


def test_rejects_unreadable_document():
    response = client.post(
        "/api/v1/resume-analysis",
        files={"file": ("resume.pdf", b"not a pdf", PDF_MIME)},
    )
    assert response.status_code == 422


def test_missing_api_key_is_reported(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post(
        "/api/v1/resume-analysis",
        files={"file": ("resume.docx", make_docx(), DOCX_MIME)},
    )
    assert response.status_code == 503


def test_gemini_failure_returns_safe_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def fail(*args, **kwargs):
        raise RuntimeError("provider failure")

    monkeypatch.setattr(main, "generate_resume_analysis", fail)
    response = client.post(
        "/api/v1/resume-analysis",
        files={"file": ("resume.docx", make_docx(), DOCX_MIME)},
        data={"message": "Analyze my resume"},
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "Resume analysis failed. Please try again shortly."
