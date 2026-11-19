# Shram Bazaar

Shram Bazaar is a Nepal-focused work marketplace and learning portal. The application includes a React/Vite frontend, a Spring Boot API, a PostgreSQL database, a historical Nepal jobs showcase dataset, and an optional AI service.

## Run locally

Install frontend dependencies, then start the connected application:

```sh
pnpm install
pnpm dev
```

Open <http://localhost:8444>. `npm run dev` checks the API and database, starts the Java API when needed, and launches Vite. Keep the terminal open while using the app. If PostgreSQL is stopped and Docker is installed, the launcher starts the database container. The local database defaults match `shrambazar/compose.yaml`; set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` in the shell to override them.

To run just Vite without starting the API, use `npm run dev:vite`.

## Build and type-check the frontend

```sh
pnpm build
pnpm exec tsc --noEmit
```

## Backend

The Spring Boot source is in `shrambazar`. The showcase import reads `shrambazar/data/nepali_jobs.csv` and is idempotent. To rebuild the API manually:

```sh
cd shrambazar
sh ./mvnw -DskipTests package
```

The API listens on port 8080. Vite proxies `/api` and `/uploads` to it.

## Optional AI service

AI chat, resume analysis, and voice features use a separate FastAPI service in `ai-service`. Install its requirements and configure the credentials described in `ai-service/.env.example` before starting that service.

## Data and privacy

Historical dataset listings are for demonstration; their availability is unverified. Source attribution and recorded listing information are retained. Supply private credentials through environment variables or ignored `.env` files; do not commit real secrets, local uploads, or production credentials.
