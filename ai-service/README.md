# Shram Bazar AI service

This FastAPI service handles the existing text chatbot and resume analysis, and issues short-lived Gemini Live tokens for the browser voice assistant. Text/resume requests use `GEMINI_API_KEY`; voice token creation uses only `GEMINI_VOICE_API_KEY`. The browser receives only a one-use ephemeral voice token, never either permanent key.

This is a prototype, not a RAG system. It is not connected to a backend job database or authenticated account API. Resume-based broad job categories are suggestions only; the assistant must say that current Shram Bazar job matches are unavailable unless the user supplies a job description. The existing app's login and sample job data are client-side, so this service cannot enforce account authorization. Do not expose this prototype publicly without adding backend authentication and abuse controls.

## Requirements

- Python 3.10+
- Separate text and voice Gemini API keys from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Node.js and npm for the existing Vite app

## Configure credentials

Copy `.env.example` to `.env` if needed, then configure these backend-only values:

```dotenv
GEMINI_API_KEY=your_text_and_resume_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_VOICE_API_KEY=your_separate_voice_project_key
CORS_ORIGINS=http://localhost:8443,http://127.0.0.1:8443
```

Never use a `VITE_` prefix for either permanent key. Keep `.env` out of Git and configure both keys as server-side secrets in production. `GEMINI_VOICE_API_KEY` is required only for voice; text chat and resume analysis continue using `GEMINI_API_KEY`.

## Vercel deployment

The repository's root `vercel.toml` deploys the Vite frontend and this FastAPI service together. Requests to `/api/*` are routed to the FastAPI service; all other paths are served by the frontend. The browser therefore uses same-origin API requests, and `VITE_SHRAM_AI_API_URL` should remain unset for this layout.

In the linked Vercel project's **Production** environment, add these server-side variables:

```text
GEMINI_API_KEY
GEMINI_VOICE_API_KEY
```

Set their values to the separate text/resume and voice keys. Do not name them `VITE_*`; Vite variables are bundled into browser code. Add them to **Preview** too if preview deployments need AI. New environment variables apply only after a new deployment. Keep `CORS_ORIGINS` unset for same-origin requests unless the frontend and API are later split across different domains.

Deploy from the linked repository with a current Vercel CLI (`vercel --prod`) or by pushing to the Vercel production branch. Verify `/health`, send a chat message, and start a browser voice session on the deployed HTTPS domain.

## Start the backend

From the repository root:

```sh
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Create `ai-service/.env` from `.env.example` if it does not already exist, then set the credentials above. Start FastAPI:

```sh
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Check <http://localhost:8000/health>.

## Start the frontend

In a second terminal from the repository root, start Vite. Its existing `/api/v1` proxy forwards to FastAPI, so no Gemini key or API URL is needed in the frontend:

```sh
npm run dev -- --host 127.0.0.1 --port 8443
```

If the frontend origin differs from `http://localhost:8443` or `http://127.0.0.1:8443`, add it to `CORS_ORIGINS` in the backend `.env` and restart FastAPI.

## Gemini Live voice

`POST /api/v1/voice/token` accepts `{ "language": "en" }` or `{ "language": "ne" }`. It creates a one-use token that expires after 20 minutes and must start a session within 60 seconds. The token is constrained to the audio-only `gemini-3.8-live` model, Shram Bazar work-companion instructions, and audio transcriptions. Token issuance is limited to six requests per client address per minute per backend process. The browser uses the temporary token to open a direct secure WebSocket to Gemini; audio does not pass through FastAPI.

The browser sends mono, little-endian PCM16 at 16 kHz and plays Gemini PCM16 audio at 24 kHz. The Live API uses a stateful WebSocket and is currently in preview. Microphone access requires a secure origin (HTTPS or localhost). Production deployments should also add real user authentication and a shared proxy-level rate limit for token issuance; the app's current login state is client-side and the in-memory limit is per process.

The WebSocket uses Google's documented v1beta bidi endpoint and authenticates with the ephemeral token's `access_token` parameter. The token's model, response mode, work-companion instruction, and transcription settings are constrained on the backend. The UI requests microphone permission, shows input/output transcription when supplied by Gemini, supports mute, stopping audio playback, disconnect, and session resumption/reconnect. Navigating away closes the socket, audio context, and microphone tracks.

## Voice acceptance checklist

After adding `GEMINI_VOICE_API_KEY` to the local `.env` and restarting FastAPI:

1. Open the app on `http://localhost:8443` or its HTTPS preview and navigate to Voice Assistant.
2. Start a conversation and allow microphone permission. Confirm the UI reaches “Listening”.
3. Ask a work-related question in English; confirm an input transcript appears and Gemini speaks a relevant answer.
4. Repeat in Nepali; confirm the assistant responds in Nepali.
5. Mute and unmute the microphone, stop audio playback, then disconnect. Confirm each control works and microphone use stops after disconnect or leaving the page.
6. Deny microphone permission once and confirm a clear permission error appears; allow permission and retry.
7. Leave a session long enough to exercise reconnection if the Live service closes or expires it; confirm reconnect obtains a fresh temporary token.

The automated tests mock Google token creation. They verify credential separation, token restrictions, expiration configuration, error mapping, and rate limits, but they do not verify a real microphone-to-Gemini-to-speaker conversation. Treat voice as unverified until the checklist succeeds with the real voice key and browser microphone.

## Resume analysis

The chat plus button accepts PDF/DOCX files up to 10 MB. The backend independently checks extension, MIME type, file size, PDF encryption/page count, DOCX package structure and uncompressed size, and rejects documents with no extractable text. It extracts at most 60,000 characters and calls Gemini with instructions to treat resume text as untrusted and not invent qualifications. Scanned image-only PDFs need OCR, which is not included.

`POST /api/v1/resume-analysis` uses multipart form fields `file`, optional `message`, optional `conversation_id`, and optional JSON `history`. A blank message becomes “Please analyze my resume.” The response contains `answer` and `conversation_id`.

## Backend checks

```sh
cd ai-service
python -m pip install -r requirements-test.txt
python -m pytest -q
```

The tests cover PDF/DOCX extraction, the existing text chat and resume analysis, voice token settings and credential separation, missing credentials, rate limiting, and mocked provider failures. They do not call Google APIs or test a real microphone session.

After configuring both backend keys, run `python -m pytest -q` from `ai-service/`. A real voice acceptance test additionally needs a browser with microphone permission and a valid `GEMINI_VOICE_API_KEY`; confirm audio is heard from Gemini before treating the complete voice path as verified.
