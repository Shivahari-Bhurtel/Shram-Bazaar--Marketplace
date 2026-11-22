# Shram Bazar AI service

This FastAPI service handles Shram AI chat, resume analysis, and short-lived Gemini Live tokens for the browser voice assistant. Normal text chat uses local Ollama (`qwen3:4b` by default); resume analysis and the existing voice assistant continue to use their Gemini credentials. The browser never receives provider credentials.

Job searches use deterministic matching against `../shrambazar/src/main/resources/data/jobs.json`; Ollama does not create or select job records. The bundled file contains 130 showcase records. These are illustrative demo listings. The current app login/profile is client-side, so the AI service cannot securely read an authenticated worker profile. Do not expose this prototype publicly without adding backend authentication and abuse controls.

## Requirements

- Python 3.10+
- Separate text and voice Gemini API keys from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Node.js and npm for the existing Vite app

## Configure the local model

Copy `.env.example` to `.env` if needed, then configure these backend-only values:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_CONNECT_TIMEOUT_SECONDS=2
OLLAMA_TIMEOUT_SECONDS=45
OLLAMA_KEEP_ALIVE=2h
OLLAMA_STARTUP_TIMEOUT_SECONDS=20
OLLAMA_START_COOLDOWN_SECONDS=30
OLLAMA_NUM_CTX=4096
OLLAMA_NUM_PREDICT=300
# Required only for resume analysis and optional Gemini text fallback:
GEMINI_API_KEY=your_text_and_resume_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_VOICE_API_KEY=your_separate_voice_project_key
CORS_ORIGINS=http://localhost:8443,http://127.0.0.1:8443
```

Keep `.env` out of Git. Ollama settings are read only by FastAPI. `AI_PROVIDER=gemini` selects Gemini as an optional text-chat fallback. Resume analysis still requires `GEMINI_API_KEY`; voice requires `GEMINI_VOICE_API_KEY`.

## Vercel deployment

The repository's root `vercel.toml` deploys the Vite frontend and this FastAPI service together. Requests to `/api/*` are routed to the FastAPI service; all other paths are served by the frontend. This local Ollama setup is for local development: a cloud function's `localhost` is not your Mac. For Vercel text chat, set `AI_PROVIDER=gemini` and configure `GEMINI_API_KEY`; the browser still uses same-origin API requests.

In the linked Vercel project's **Production** environment, add these server-side variables:

```text
GEMINI_API_KEY
GEMINI_VOICE_API_KEY
```

Set their values to the separate text/resume and voice keys. Do not name them `VITE_*`; Vite variables are bundled into browser code. Also set `AI_PROVIDER=gemini` for cloud chat. Add them to **Preview** too if preview deployments need AI. New environment variables apply only after a new deployment. Keep `CORS_ORIGINS` unset for same-origin requests unless the frontend and API are later split across different domains.

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

FastAPI checks Ollama during startup. On macOS it opens the installed Ollama app when available, then checks the API with bounded retries; if no server process exists, it starts one tracked `ollama serve` child. It never downloads model data. Missing or stopped Ollama does not stop FastAPI, deterministic job search, or local platform guidance.

`GET /api/v1/ai/status` reports provider/model, installation and service state, model availability/loading, readiness, last check/error, and fallback state. The check uses `/api/tags` and `/api/show`, not text generation. Chat retries a stopped service with a cooldown and requests a schema-constrained final answer so reasoning text cannot be returned to users.

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

The tests cover PDF/DOCX extraction, text chat and resume analysis, voice token settings and credential separation, missing credentials, rate limiting, Ollama detection/startup/recovery/readiness/fallback, and deterministic dataset matching. Ollama process behavior is mocked in automated tests; a separate local request is needed to verify the actual model. Tests do not call Google APIs or test a real microphone session.

After configuring both backend keys, run `python -m pytest -q` from `ai-service/`. A real voice acceptance test additionally needs a browser with microphone permission and a valid `GEMINI_VOICE_API_KEY`; confirm audio is heard from Gemini before treating the complete voice path as verified.
