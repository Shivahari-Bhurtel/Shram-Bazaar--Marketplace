# Shram Bazar chat and resume analysis prototype

This FastAPI service calls Gemini through Google's supported `google-genai` Python SDK and can extract text from PDF and DOCX resumes uploaded from the existing chat. Resume bytes are processed in memory and the upload is closed before the Gemini request; the service does not save resumes or analyses. Resume contents are sent to Gemini for analysis.

This is a prototype, not a RAG system. It is not connected to a backend job database or authenticated account API. Resume-based broad job categories are suggestions only; the assistant must say that current Shram Bazar job matches are unavailable unless the user supplies a job description. The existing app's login and sample job data are client-side, so this service cannot enforce account authorization. Do not expose this prototype publicly without adding backend authentication and abuse controls.

## Requirements

- Python 3.10+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Node.js and npm for the existing Vite app

## Start the backend

From the repository root:

```sh
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Create `ai-service/.env` from `.env.example` if it does not already exist, then set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` there. Never put the key in a `VITE_` variable or browser code. Start FastAPI:

```sh
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Check <http://localhost:8000/health>.

## Start the frontend

In a second terminal from the repository root:

```sh
VITE_SHRAM_AI_API_URL=http://localhost:8000 npm run dev
```

Restart Vite if it was already running before setting the URL. If the frontend origin differs from `http://localhost:8443` or `http://127.0.0.1:8443`, add it to `CORS_ORIGINS` in the backend `.env` and restart FastAPI.

## Resume analysis

The chat plus button accepts PDF/DOCX files up to 10 MB. The backend independently checks extension, MIME type, file size, PDF encryption/page count, DOCX package structure and uncompressed size, and rejects documents with no extractable text. It extracts at most 60,000 characters and calls Gemini with instructions to treat resume text as untrusted and not invent qualifications. Scanned image-only PDFs need OCR, which is not included.

`POST /api/v1/resume-analysis` uses multipart form fields `file`, optional `message`, optional `conversation_id`, and optional JSON `history`. A blank message becomes “Please analyze my resume.” The response contains `answer` and `conversation_id`.

## Backend checks

```sh
cd ai-service
python -m pip install -r requirements-test.txt
python -m pytest -q
```

The tests cover valid PDF/DOCX text extraction, file type and size validation, unreadable files, missing API keys, and Gemini failures. They do not call Gemini.
