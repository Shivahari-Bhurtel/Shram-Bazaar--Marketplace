#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="http://127.0.0.1:8080"
AI_PORT="${AI_PORT:-8000}"
AI_URL="http://127.0.0.1:${AI_PORT}"
WEB_PORT="${WEB_PORT:-8444}"
WEB_URL="http://127.0.0.1:${WEB_PORT}"
API_LOG="${TMPDIR:-/tmp}/shram-bazar-api.log"
AI_LOG="${TMPDIR:-/tmp}/shram-bazar-ai.log"
API_PID=""
AI_PID=""
WEB_PID=""

DB_URL_WAS_CONFIGURED="${DB_URL+x}"
DB_USERNAME_WAS_CONFIGURED="${DB_USERNAME+x}"
DB_PASSWORD_WAS_CONFIGURED="${DB_PASSWORD+x}"

export DB_URL="${DB_URL:-jdbc:postgresql://127.0.0.1:5432/shrambazar}"
export DB_USERNAME="${DB_USERNAME:-shrambazar}"
# These match the local-development defaults in shrambazar/compose.yaml.
export DB_PASSWORD="${DB_PASSWORD:-local-only-shrambazar}"
export JWT_SECRET="${JWT_SECRET:-bG9jYWwtZGV2LW9ubHktc2hyYW1iYXphci1qd3Qtc2VjcmV0LW5vdC1mb3ItcHJvZHVjdGlvbi0yMDI2}"

# Figma Make and Vite read .env.local for the frontend, but child processes
# started here do not inherit those values. Read managed database settings only
# when explicitly requested, and load email credentials only from the backend's
# private .env so they are never placed in frontend variables.
if [[ -f "$APP_DIR/.env.local" ]]; then
  while IFS='=' read -r name value; do
    case "$name" in
      POSTGRES_HOST|POSTGRES_DATABASE|POSTGRES_USER|POSTGRES_PASSWORD|PGHOST|PGDATABASE|PGUSER|PGPASSWORD)
        if [[ -n "${!name+x}" ]]; then continue; fi
        value="${value%$'\r'}"
        if [[ "$value" == \"*\" ]]; then value="${value:1:${#value}-2}"; fi
        if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; fi
        printf -v "$name" '%s' "$value"
        export "$name"
        ;;
    esac
  done < "$APP_DIR/.env.local"
fi

# Keep email credentials in the backend's private environment file. These
# variables are inherited by Spring Boot but are never prefixed for Vite.
if [[ -f "$APP_DIR/shrambazar/.env" ]]; then
  while IFS='=' read -r name value; do
    case "$name" in
      RESEND_API_KEY|RESEND_FROM_EMAIL)
        if [[ -n "${!name+x}" ]]; then continue; fi
        value="${value%$'\r'}"
        if [[ "$value" == \"*\" ]]; then value="${value:1:${#value}-2}"; fi
        if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; fi
        printf -v "$name" '%s' "$value"
        export "$name"
        ;;
    esac
  done < "$APP_DIR/shrambazar/.env"
fi

managed_db_configured=false
local_h2_configured=false
if [[ "$DB_URL_WAS_CONFIGURED" == x ]]; then
  if [[ "$DB_URL" != "jdbc:postgresql://127.0.0.1:5432/shrambazar" ]]; then
    managed_db_configured=true
  fi
elif [[ "${USE_MANAGED_DB:-false}" == "true" ]]; then
  db_host="${POSTGRES_HOST:-${PGHOST:-}}"
  db_name="${POSTGRES_DATABASE:-${PGDATABASE:-}}"
  db_user="${POSTGRES_USER:-${PGUSER:-}}"
  db_password="${POSTGRES_PASSWORD:-${PGPASSWORD:-}}"

  # Managed Postgres providers expose host/database/user/password separately.
  if [[ -n "$db_host" && -n "$db_name" && -n "$db_user" && -n "$db_password" ]]; then
    export DB_URL="jdbc:postgresql://${db_host}:5432/${db_name}?sslmode=require"
    if [[ "$DB_USERNAME_WAS_CONFIGURED" != x ]]; then export DB_USERNAME="$db_user"; fi
    if [[ "$DB_PASSWORD_WAS_CONFIGURED" != x ]]; then export DB_PASSWORD="$db_password"; fi
    managed_db_configured=true
  fi
fi

api_healthy() {
  curl -fsS --max-time 3 "$API_URL/api/health" >/dev/null 2>&1 &&
    curl -fsS --max-time 3 "$API_URL/api/jobs" 2>/dev/null |
      node -e 'const fs=require("fs");let data;try{data=JSON.parse(fs.readFileSync(0,"utf8"))}catch{process.exit(1)}process.exit(Array.isArray(data)?0:1)' >/dev/null 2>&1
}

web_healthy() {
  curl -fsS --max-time 3 "$WEB_URL/" >/dev/null 2>&1
}

ai_healthy() {
  curl -fsS --max-time 4 "$AI_URL/api/v1/ai/status" 2>/dev/null |
    node -e 'let input="";process.stdin.on("data",chunk=>input+=chunk);process.stdin.on("end",()=>{let s;try{s=JSON.parse(input)}catch{process.exit(1)}process.exit(s.provider==="ollama"&&s.chat_provider==="ollama"?0:1)})' >/dev/null 2>&1
}

cleanup() {
  if [[ -n "$WEB_PID" ]] && kill -0 "$WEB_PID" 2>/dev/null; then kill "$WEB_PID" 2>/dev/null || true; fi
  if [[ -n "$AI_PID" ]] && kill -0 "$AI_PID" 2>/dev/null; then kill "$AI_PID" 2>/dev/null || true; fi
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then kill "$API_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

for required_command in node npm curl; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Required command '$required_command' was not found. Install Node.js/npm and curl, then rerun this script."
    exit 1
  fi
done

AI_PYTHON="${AI_PYTHON:-$APP_DIR/ai-service/.venv/bin/python}"
if [[ ! -x "$AI_PYTHON" ]]; then AI_PYTHON="$(command -v python3 || true)"; fi
if [[ -z "$AI_PYTHON" || ! -x "$AI_PYTHON" ]]; then
  echo "Python 3.10+ is required for Shram AI. Create ai-service/.venv and install ai-service/requirements.txt."
  exit 1
fi
if ! "$AI_PYTHON" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
  echo "Shram AI needs Python 3.10 or newer. Set AI_PYTHON to a compatible Python executable."
  exit 1
fi
if ! (cd "$APP_DIR/ai-service" && "$AI_PYTHON" -c 'import fastapi, httpx, google.genai, docx, pypdf, dotenv' >/dev/null 2>&1); then
  echo "Shram AI dependencies are missing. Install them with: cd ai-service && python -m pip install -r requirements.txt"
  exit 1
fi

if ! api_healthy; then
  if curl -sS --max-time 2 "$API_URL/" >/dev/null 2>&1; then
    echo "Port 8080 is occupied by a service that is not serving the Shram Bazar API routes. Stop that service, then rerun this script."
    exit 1
  else
    if [[ "$managed_db_configured" != true ]] && ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
      if command -v docker >/dev/null 2>&1; then
        if docker compose -f "$APP_DIR/shrambazar/compose.yaml" up -d database; then
          for _ in {1..30}; do
            pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
            sleep 1
          done
        fi
      fi
      if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
        mkdir -p "$APP_DIR/shrambazar/.local"
        export DB_URL="jdbc:h2:file:$APP_DIR/shrambazar/.local/shrambazar;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"
        export DB_USERNAME="sa"
        export DB_PASSWORD=""
        export DB_DRIVER="org.h2.Driver"
        export SPRING_JPA_HIBERNATE_DDL_AUTO="update"
        export SPRING_SQL_INIT_MODE="never"
        local_h2_configured=true
        echo "PostgreSQL is unavailable; using the persistent local H2 database at shrambazar/.local/shrambazar."
      fi
    fi
    if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 || [[ "$managed_db_configured" == true || "$local_h2_configured" == true ]]; then
      if (cd "$APP_DIR/shrambazar" && sh ./mvnw -DskipTests package); then
        (
          cd "$APP_DIR/shrambazar"
          java -jar target/shrambazar-0.0.1-SNAPSHOT.jar
        ) >"$API_LOG" 2>&1 &
        API_PID=$!

        for _ in {1..60}; do
          if api_healthy; then break; fi
          if ! kill -0 "$API_PID" 2>/dev/null; then break; fi
          sleep 1
        done
        if ! api_healthy; then
          echo "The API did not become ready, so the frontend was not started. Recent API log output:"
          tail -40 "$API_LOG" || true
          exit 1
        fi
      else
        echo "The API build did not complete, so the frontend was not started."
        exit 1
      fi
    else
      echo "The configured database is not available. Start it or correct DB_URL, DB_USERNAME, and DB_PASSWORD before launching Shram Bazar."
      exit 1
    fi
  fi
fi

# FastAPI checks Ollama on startup, opens Ollama.app on macOS when needed,
# and starts `ollama serve` only when no server process is present.
if ! ai_healthy; then
  if curl -sS --max-time 2 "$AI_URL/" >/dev/null 2>&1; then
    echo "Port 8000 is occupied by a service without the Shram AI status endpoint. Stop it or correct the AI service, then rerun."
    exit 1
  fi
  echo "Starting Shram AI and checking local Ollama/Qwen readiness..."
  (
    cd "$APP_DIR/ai-service"
    AI_PROVIDER=ollama \
      OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:4b}" \
      OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}" \
      "$AI_PYTHON" -m uvicorn main:app --host 127.0.0.1 --port "$AI_PORT"
  ) >"$AI_LOG" 2>&1 &
  AI_PID=$!

  for _ in {1..45}; do
    if ai_healthy; then break; fi
    if ! kill -0 "$AI_PID" 2>/dev/null; then
      echo "The Shram AI backend stopped during startup. Recent log output:"
      tail -40 "$AI_LOG" || true
      exit 1
    fi
    sleep 1
  done
  if ! ai_healthy; then
    echo "The Shram AI backend did not become ready. Recent log output:"
    tail -40 "$AI_LOG" || true
    exit 1
  fi
fi

curl -fsS --max-time 5 "$AI_URL/api/v1/ai/status" | node -e 'let input="";process.stdin.on("data",chunk=>input+=chunk);process.stdin.on("end",()=>{const s=JSON.parse(input);if(s.ai_ready){console.log(`Local AI ready: ${s.provider} / ${s.model}`)}else{console.log(`Shram AI fallback mode: ${s.state}. ${s.last_error||"Job search and platform guidance remain available."}`)}})'

if web_healthy; then
  echo "Shram Bazar is ready at $WEB_URL (API: $API_URL)."
  if [[ -n "$API_PID" ]]; then wait "$API_PID"; fi
  if [[ -n "$AI_PID" ]]; then wait "$AI_PID"; fi
  exit 0
fi

echo "Shram Bazar is starting at $WEB_URL (API: $API_URL). Press Ctrl+C to stop services started by this script."
(cd "$APP_DIR" && PORT="$WEB_PORT" AI_SERVICE_PORT="$AI_PORT" FIGMA_DEV_SERVER_HOST=127.0.0.1 npm run dev:vite) &
WEB_PID=$!
wait "$WEB_PID"
