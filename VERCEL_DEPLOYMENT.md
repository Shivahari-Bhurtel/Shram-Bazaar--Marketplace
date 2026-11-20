# Vercel deployment

The root `vercel.json` routes the frontend, FastAPI AI service, and Spring API from this repository. The Spring API is built from `shrambazar/Dockerfile` as a Vercel Container service. `/api/himalayas/*` and `/api/jsearch/*` are routed to the frontend service's functions.

## Vercel project settings

Connect the `Shivahari-Bhurtel/Shram-Bazaar--Marketplace` repository with its root directory set to `/`. Set the project's Framework Preset to **Services** and confirm Vercel Services and Container runtime are available for the project. Git deployments use the root `vercel.json`.

## Required environment variables

Add these in the Vercel project settings for Production and Preview as appropriate:

- `DB_URL`: JDBC URL for a managed PostgreSQL database reachable from Vercel. Use the provider's pooled connection URL and require TLS when supported.
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`: a newly generated, high-entropy production secret. Do not reuse the local development secret.
- `GEMINI_API_KEY`: a valid Gemini text generation key.
- `GEMINI_VOICE_API_KEY`: a valid Gemini Live key.
- `OPENWEBNINJA_API_KEY`: OpenWebNinja API key for the Real-Time Jobs Data API, used by the remote IT jobs feed.

For local development, add `OPENWEBNINJA_API_KEY=<your OpenWebNinja key>` to `frontend/.env.local`. The key stays server-side and is never exposed in the browser bundle. Without this key the home page continues to show the cached or Himalayas remote listings, but OpenWebNinja listings cannot refresh.

The database bundled in `compose.yaml` is for local Docker use only; Vercel cannot connect to the developer's localhost database. Vercel does not read local `.env` files.

## File storage limitation

The backend container defaults its temporary upload directories to `/tmp` so it can start on Vercel. Vercel function/container filesystems are temporary, so verification documents and profile pictures saved there do not persist across instance recycling. Before using those upload features in production, configure a persistent object store and update the backend storage services to use it. Docker Compose continues to use its named local storage volumes for development.

## Deploy verification

After enabling Services and adding the environment variables, deploy `main` and check `/health`, `/api/jobs`, and `/api/v1/health`. Test authenticated routes and file uploads against the deployed services. The local Gemini key is not copied to Vercel and must be independently verified in the Vercel environment.
