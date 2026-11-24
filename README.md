# Shram Bazaar

Shram Bazaar is a Nepal-focused work marketplace and learning portal. The application includes a React/Vite frontend, a Spring Boot API, a PostgreSQL database, one centralized set of simulated Kathmandu Valley job listings, and an optional AI service.

## Run locally

Install frontend dependencies, then start the connected application:

```sh
pnpm install
pnpm dev
```

Open the URL printed by the launcher (normally <http://localhost:8444>). `npm run dev` checks/starts the Java API and database, starts FastAPI, lets it detect/recover Ollama, and launches Vite. If another checkout already owns a default port, the launcher selects free API, AI, and frontend ports and configures Vite to use them. Keep the terminal open while using the app. If PostgreSQL is stopped and Docker is installed, the launcher starts the database container. The local database defaults match `shrambazar/compose.yaml`; set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` in the shell to override them. If Qwen is unavailable, the website still starts in fallback mode and local job search remains available.

To run just Vite without starting the API, use `npm run dev:vite`.

## Build and type-check the frontend

```sh
pnpm build
pnpm exec tsc --noEmit
```

## Backend

The Spring Boot source is in `shrambazar`. On startup, the API validates and replaces its showcase listings from `shrambazar/src/main/resources/data/jobs.json`. Worker discovery reads these listings from `GET /api/jobs/showcase`; employer-created jobs remain in the separate provider jobs API. All 130 supplied listings are marked as simulated and their workplace coordinates as approximate. Validate the source data with:

```sh
pnpm validate:jobs
```

To rebuild the API manually:

```sh
cd shrambazar
sh ./mvnw -DskipTests package
```

The API listens on port 8080. Vite proxies `/api` and `/uploads` to it.

## Local AI service

Text chat and text-based PDF/DOCX resume extraction use the existing local Ollama model `qwen3:4b`; resume extraction does not call Gemini. The existing Gemini Live voice assistant uses the configured `GEMINI_VOICE_API_KEY` and requires internet access, a working Gemini voice key, and microphone permission in the browser. Deterministic job search reads the bundled `shrambazar/src/main/resources/data/jobs.json` and works without Ollama.

The launcher expects Python 3.10+ and dependencies in `ai-service/.venv`. Set them up once if needed:

```sh
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
# Copy only when the local file does not exist; preserve existing credentials.
if [ ! -f .env ]; then cp .env.example .env; fi
```

The Ollama defaults need no Gemini key for text chat or resume extraction. The voice assistant needs `GEMINI_VOICE_API_KEY` in `ai-service/.env`. `npm run dev` starts the Java API, FastAPI/Ollama integration, and the whole local app; it does not download a missing model. Its startup status reports whether voice credentials are configured. Check actual AI readiness and the Ollama model list with:

```sh
curl http://127.0.0.1:8000/api/v1/ai/status
curl http://127.0.0.1:11434/api/tags
```

If status reports `model_missing`, install the existing model explicitly with `ollama pull qwen3:4b` only if it is not already installed; the backend detects it on the next status check. To set a port manually, the launcher keeps the Vite proxy in sync:

```sh
AI_PORT=8001 npm run dev
```

## Data and privacy

The showcase listings are simulated university demo data and are not verified vacancies. Supply private credentials through environment variables or ignored `.env` files; do not commit real secrets, local uploads, or production credentials.
