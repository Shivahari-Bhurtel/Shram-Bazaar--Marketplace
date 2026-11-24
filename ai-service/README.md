# Shram Bazar AI service

This FastAPI service handles Shram AI chat, local Qwen resume extraction, and short-lived Gemini Live tokens for the browser voice assistant. Text chat and PDF/DOCX resume extraction use the existing local Ollama model (`qwen3:4b` by default). Gemini remains an optional text chat fallback and is used by the existing voice assistant. The browser never receives provider credentials.

Job searches use deterministic matching against the Java API's `/api/jobs/showcase` endpoint, which serves the 130 imported showcase listings; Ollama does not invent or select job records. The bundled 130-row JSON file is used as a local fallback if the Java API is unavailable. These are illustrative demo listings. Worker chat sends only work-related profile fields for personalized matching; it does not send phone, email, date of birth, or identity-verification data.

## Requirements

- Python 3.10+
- Ollama with the configured local model already installed
- A Gemini voice API key only if using the existing voice assistant
- Node.js and npm for the existing Vite app

## Configure the local model

Copy `.env.example` to `.env` if needed, then configure these backend-only values:

```dotenv
AI_PROVIDER=ollama
SHRAM_API_BASE_URL=http://127.0.0.1:8080
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_CONNECT_TIMEOUT_SECONDS=2
OLLAMA_TIMEOUT_SECONDS=45
OLLAMA_KEEP_ALIVE=2h
OLLAMA_STARTUP_TIMEOUT_SECONDS=20
OLLAMA_START_COOLDOWN_SECONDS=30
OLLAMA_NUM_CTX=4096
OLLAMA_NUM_PREDICT=300
# Optional Gemini text-chat fallback and existing voice assistant:
GEMINI_API_KEY=your_text_and_resume_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_VOICE_API_KEY=your_separate_voice_project_key
CORS_ORIGINS=http://localhost:8443,http://127.0.0.1:8443
```

Keep `.env` out of Git. Ollama settings are read only by FastAPI. Resume extraction always uses the configured Ollama model, regardless of the optional chat fallback setting; it does not call Gemini. `AI_PROVIDER=gemini` selects Gemini for text chat. Voice requires `GEMINI_VOICE_API_KEY`.

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

`GET /api/v1/ai/status` reports provider/model, installation and service state, model availability/loading, readiness, last check/error, and fallback state. It also advertises the resume extraction provider/model/schema so the launcher can detect and replace an outdated server process. The check uses `/api/tags` and `/api/show`, not text generation. Chat and resume extraction share one inference gate so concurrent requests queue instead of interrupting each other. Resume upload supports PDF and DOCX up to 4 MB; scanned image-only PDFs need OCR before they can be extracted.

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

The worker profile and chat attachment accept PDF/DOCX resumes up to 4 MB. The backend independently validates file type, size, PDF encryption/page count, DOCX package structure and uncompressed size, and rejects documents with no extractable text. It sends extracted text to the configured local Ollama model with instructions to treat resume content as untrusted. Qwen output is validated and reconciled with facts explicitly present in labeled CV sections; no resume content is treated as identity verified. Scanned image-only PDFs need OCR, which is not included.

`POST /api/v1/resume-analysis` accepts the `file` multipart field and returns structured profile fields (contact, bio, skills, education, experience, languages, certifications, and work preferences) as JSON. Chat resume uploads summarize this structured result for the conversation.

## Backend checks

```sh
cd ai-service
python -m pip install -r requirements-test.txt
python -m pytest -q
```

The tests cover PDF/DOCX extraction, text chat and resume analysis, voice token settings and credential separation, missing credentials, rate limiting, Ollama detection/startup/recovery/readiness/fallback, and deterministic dataset matching. Ollama process behavior is mocked in automated tests; a separate local request is needed to verify the actual model. Tests do not call Google APIs or test a real microphone session.

After configuring both backend keys, run `python -m pytest -q` from `ai-service/`. A real voice acceptance test additionally needs a browser with microphone permission and a valid `GEMINI_VOICE_API_KEY`; confirm audio is heard from Gemini before treating the complete voice path as verified.
