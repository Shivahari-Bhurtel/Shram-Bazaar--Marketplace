#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_PORT="${API_PORT:-8080}"
AI_PORT="${AI_PORT:-8000}"
WEB_PORT="${WEB_PORT:-8444}"
AI_URL="http://127.0.0.1:${AI_PORT}"
WEB_URL="http://127.0.0.1:${WEB_PORT}"
API_URL="http://127.0.0.1:${API_PORT}"
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
# Keep the local API schema aligned with its JPA entities before applying the
# forward-only SQL additions (the SQL file references entity-owned tables).
export SPRING_JPA_HIBERNATE_DDL_AUTO="${SPRING_JPA_HIBERNATE_DDL_AUTO:-update}"
export SPRING_JPA_DEFER_DATASOURCE_INITIALIZATION="${SPRING_JPA_DEFER_DATASOURCE_INITIALIZATION:-true}"

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
      node -e 'const fs=require("fs");let data;try{data=JSON.parse(fs.readFileSync(0,"utf8"))}catch{process.exit(1)}process.exit(Array.isArray(data)?0:1)' >/dev/null 2>&1 || return 1
  local owner
  owner="$(port_owner_cwd "$API_PORT" || true)"
  [[ -z "$owner" || "$owner" == "$APP_DIR/shrambazar" ]]
}

port_listener_pid() {
  command -v lsof >/dev/null 2>&1 || return 1
  lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1
}

port_owner_cwd() {
  local pid
  pid="$(port_listener_pid "$1")"
  [[ -n "$pid" ]] || return 1
  lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1
}

choose_free_port() {
  local port="$1" end="$2"
  while (( port <= end )); do
    if [[ -z "$(port_listener_pid "$port" || true)" ]]; then
      printf '%s' "$port"
      return 0
    fi
    ((port += 1))
  done
  return 1
}

web_healthy() {
  curl -fsS --max-time 3 "$WEB_URL/" >/dev/null 2>&1 || return 1
  local owner
  owner="$(port_owner_cwd "$WEB_PORT" || true)"
  [[ -z "$owner" || "$owner" == "$APP_DIR" ]]
}

ai_healthy() {
  curl -fsS --max-time 4 "$AI_URL/api/v1/ai/status" 2>/dev/null |
    node -e 'let input="";process.stdin.on("data",chunk=>input+=chunk);process.stdin.on("end",()=>{let s;try{s=JSON.parse(input)}catch{process.exit(1)}const r=s.resume_extraction,v=s.voice_assistant;process.exit(s.provider==="ollama"&&s.chat_provider==="ollama"&&r?.enabled===true&&r?.provider==="ollama"&&r?.model===(process.env.OLLAMA_MODEL||"qwen3:4b")&&r?.schema_version===1&&v?.provider==="gemini"&&typeof v.enabled==="boolean"&&typeof v.model==="string"?0:1)})' >/dev/null 2>&1
}

restart_stale_project_ai() {
  command -v lsof >/dev/null 2>&1 || return 1
  local pid command cwd
  pid="$(port_listener_pid "$AI_PORT" || true)"
  [[ -n "$pid" ]] || return 1
  command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1)"
  if [[ "$cwd" == "$APP_DIR/ai-service" && "$command" == *"uvicorn main:app"* ]]; then
    echo "Restarting the outdated Shram AI process from this project's ai-service directory (PID $pid)..."
    kill -TERM "$pid" 2>/dev/null || return 1
    for _ in {1..10}; do
      if [[ -z "$(port_listener_pid "$AI_PORT" || true)" ]]; then return 0; fi
      sleep 1
    done
    echo "The old Shram AI process did not release port $AI_PORT. Stop it and rerun this script."
    return 1
  fi
  return 1
}

start_ai() {
  if [[ -n "$(port_listener_pid "$AI_PORT" || true)" ]]; then
    if ! restart_stale_project_ai; then
      local available_port
      available_port="$(choose_free_port "$((AI_PORT + 1))" 65535)" || {
        echo "No free local port is available for Shram AI. Stop another service or set AI_PORT explicitly."
        return 1
      }
      AI_PORT="$available_port"
      AI_URL="http://127.0.0.1:${AI_PORT}"
      echo "Another service owns the requested AI port; using port $AI_PORT for this project's Shram AI service."
    fi
  fi
  echo "Starting Shram AI on $AI_URL..."
  (
    cd "$APP_DIR/ai-service"
    AI_PROVIDER=ollama \
      SHRAM_API_BASE_URL="$API_URL" \
      OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:4b}" \
      OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}" \
      "$AI_PYTHON" -m uvicorn main:app --host 127.0.0.1 --port "$AI_PORT"
  ) >>"$AI_LOG" 2>&1 &
  AI_PID=$!
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
  if [[ -n "$(port_listener_pid "$API_PORT" || true)" ]]; then
    API_PORT="$(choose_free_port "$((API_PORT + 1))" 65535)" || {
      echo "No free local port is available for the Shram Bazar API. Stop another service or set API_PORT explicitly."
      exit 1
    }
    API_URL="http://127.0.0.1:${API_PORT}"
    echo "Another service owns the requested API port; using port $API_PORT for this project."
  fi
  if ! api_healthy; then
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
        # The development H2 fallback is a fresh local database. Build its
        # complete schema from the JPA entities instead of applying the
        # production PostgreSQL-only partial schema.sql migration.
        export SPRING_JPA_HIBERNATE_DDL_AUTO="update"
        export SPRING_SQL_INIT_MODE="never"
        local_h2_configured=true
        echo "PostgreSQL is unavailable; using the persistent local H2 database at shrambazar/.local/shrambazar."
      fi
    fi
    if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 || [[ "$managed_db_configured" == true || "$local_h2_configured" == true ]]; then
      if (cd "$APP_DIR/shrambazar" && sh ./mvnw clean -DskipTests package); then
        (
          cd "$APP_DIR/shrambazar"
          PORT="$API_PORT" \
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

# Start FastAPI when needed. The monitor checks its health and restarts it after
# a process exit. Ollama/model availability is reported separately.
if ! ai_healthy; then
  start_ai || true
  for _ in {1..45}; do
    if ai_healthy; then break; fi
    if [[ -n "$AI_PID" ]] && ! kill -0 "$AI_PID" 2>/dev/null; then
      echo "AI exited during startup; the monitor will retry. Recent log output:"
      tail -20 "$AI_LOG" || true
      AI_PID=""
      break
    fi
    sleep 1
  done
fi

if ai_healthy; then
  echo "Shram AI status: $AI_URL/api/v1/ai/status"
  curl -fsS --max-time 5 "$AI_URL/api/v1/ai/status" | node -e 'let input="";process.stdin.on("data",chunk=>input+=chunk);process.stdin.on("end",()=>{const s=JSON.parse(input);if(s.ai_ready){console.log(`Local AI ready: ${s.provider} / ${s.model}`)}else{console.log(`AI service online; model status: ${s.state}. ${s.last_error||"Platform guidance and job search remain available."}`)}console.log(s.voice_assistant.enabled?`Voice assistant configured: ${s.voice_assistant.provider} / ${s.voice_assistant.model}`:"Voice assistant is not configured: set GEMINI_VOICE_API_KEY in ai-service/.env.")})'
else
  echo "AI is starting in the background; logs: $AI_LOG"
fi

if ! web_healthy; then
  if [[ -n "$(port_listener_pid "$WEB_PORT" || true)" ]]; then
    WEB_PORT="$(choose_free_port "$((WEB_PORT + 1))" 65535)" || {
      echo "No free local port is available for the frontend. Stop another service or set WEB_PORT explicitly."
      exit 1
    }
    WEB_URL="http://127.0.0.1:${WEB_PORT}"
    echo "Another service owns the requested frontend port; using port $WEB_PORT for this project."
  fi
  echo "Starting Shram Bazar at $WEB_URL (API: $API_URL). Keep this terminal open; Ctrl+C stops services started here."
  (cd "$APP_DIR" && PORT="$WEB_PORT" API_SERVICE_PORT="$API_PORT" AI_SERVICE_PORT="$AI_PORT" FIGMA_DEV_SERVER_HOST=127.0.0.1 npm run dev:vite) &
  WEB_PID=$!
else
  echo "Shram Bazar is ready at $WEB_URL (API: $API_URL). Leave this terminal open to keep monitoring AI."
fi

# If a service started here exits, restart it; if another process owns the AI
# port, leave it alone rather than starting a duplicate.
while true; do
  if [[ -n "$AI_PID" ]] && ! kill -0 "$AI_PID" 2>/dev/null; then
    wait "$AI_PID" 2>/dev/null || true
    AI_PID=""
    echo "Shram AI exited. Restarting in 2 seconds..."
    sleep 2
  fi
  if ! ai_healthy && [[ -z "$AI_PID" ]]; then
    start_ai || true
  fi
  if [[ -n "$WEB_PID" ]] && ! kill -0 "$WEB_PID" 2>/dev/null; then
    wait "$WEB_PID" 2>/dev/null || true
    WEB_PID=""
    if ! web_healthy; then
      echo "Vite exited. Restarting the frontend in 2 seconds..."
      sleep 2
      (cd "$APP_DIR" && PORT="$WEB_PORT" API_SERVICE_PORT="$API_PORT" AI_SERVICE_PORT="$AI_PORT" FIGMA_DEV_SERVER_HOST=127.0.0.1 npm run dev:vite) &
      WEB_PID=$!
    fi
  fi
  if [[ -z "$WEB_PID" ]] && ! web_healthy; then
    echo "The frontend is no longer responding. Restarting Vite..."
    (cd "$APP_DIR" && PORT="$WEB_PORT" API_SERVICE_PORT="$API_PORT" AI_SERVICE_PORT="$AI_PORT" FIGMA_DEV_SERVER_HOST=127.0.0.1 npm run dev:vite) &
    WEB_PID=$!
  fi
  sleep 5
done
