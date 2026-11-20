#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="http://127.0.0.1:8080"
WEB_URL="http://127.0.0.1:8444"
API_LOG="${TMPDIR:-/tmp}/shram-bazar-api.log"
API_PID=""
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
# started here do not inherit those values. Import only the database variables
# Spring needs when no explicit DB_* override was supplied in the shell.
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

managed_db_configured=false
if [[ "$DB_URL_WAS_CONFIGURED" == x ]]; then
  if [[ "$DB_URL" != "jdbc:postgresql://127.0.0.1:5432/shrambazar" ]]; then
    managed_db_configured=true
  fi
else
  db_host="${POSTGRES_HOST:-${PGHOST:-}}"
  db_name="${POSTGRES_DATABASE:-${PGDATABASE:-}}"
  db_user="${POSTGRES_USER:-${PGUSER:-}}"
  db_password="${POSTGRES_PASSWORD:-${PGPASSWORD:-}}"

  # Managed Postgres providers expose host/database/user/password separately.
  # Use those values only when present; otherwise keep the local Compose defaults.
  if [[ -n "$db_host" && -n "$db_name" && -n "$db_user" && -n "$db_password" ]]; then
    export DB_URL="jdbc:postgresql://${db_host}:5432/${db_name}?sslmode=require"
    if [[ "$DB_USERNAME_WAS_CONFIGURED" != x ]]; then export DB_USERNAME="$db_user"; fi
    if [[ "$DB_PASSWORD_WAS_CONFIGURED" != x ]]; then export DB_PASSWORD="$db_password"; fi
    managed_db_configured=true
  fi
fi

showcase_healthy() {
  local base_url="$1"
  curl -fsS --max-time 4 "$base_url/api/jobs/showcase" 2>/dev/null |
    node -e 'const fs=require("fs"); const actual=JSON.parse(fs.readFileSync(0,"utf8")); const expected=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const fields=["id","title","category","company","description","location","address","city","latitude","longitude","salary_min","salary_max","salary_type","job_type","experience","skills","requirements","vacancies","posted_date","deadline","is_demo","source","location_accuracy"]; const rows=new Map(Array.isArray(actual)?actual.map(j=>[j.id,j]):[]); process.exit(Array.isArray(actual)&&Array.isArray(expected)&&actual.length===80&&expected.length===80&&rows.size===80&&expected.every(source=>{const job=rows.get(source.id);return job&&fields.every(key=>JSON.stringify(job[key])===JSON.stringify(source[key]))})?0:1)' "$APP_DIR/shrambazar/src/main/resources/data/jobs.json" >/dev/null 2>&1
}

api_healthy() {
  curl -fsS --max-time 3 "$API_URL/api/jobs" >/dev/null 2>&1 && showcase_healthy "$API_URL"
}

web_healthy() {
  curl -fsS --max-time 3 "$WEB_URL/" >/dev/null 2>&1
}

cleanup() {
  if [[ -n "$WEB_PID" ]] && kill -0 "$WEB_PID" 2>/dev/null; then kill "$WEB_PID" 2>/dev/null || true; fi
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then kill "$API_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

if ! api_healthy; then
  if curl -sS --max-time 2 "$API_URL/" >/dev/null 2>&1; then
    echo "The API on port 8080 is not serving the current showcase dataset. Job discovery will use its bundled dataset."
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
    fi
    if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 || [[ "$managed_db_configured" == true ]]; then
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
          echo "The API did not become ready. Job discovery will use its bundled dataset. Recent API log output:"
          tail -40 "$API_LOG" || true
        fi
      else
        echo "The API build did not complete. Job discovery will use its bundled dataset."
      fi
    else
      echo "PostgreSQL is not available. Start a local database or configure POSTGRES_HOST, POSTGRES_DATABASE, POSTGRES_USER, and POSTGRES_PASSWORD to enable login and account creation."
    fi
  fi
fi

if web_healthy; then
  echo "Shram Bazar is ready at $WEB_URL. Job discovery uses the API when available and its bundled dataset otherwise."
  if [[ -n "$API_PID" ]]; then wait "$API_PID"; fi
  exit 0
fi

echo "Shram Bazar is starting at $WEB_URL (API: $API_URL). Press Ctrl+C to stop services started by this script."
(cd "$APP_DIR" && PORT=8444 FIGMA_DEV_SERVER_HOST=127.0.0.1 npm run dev:vite) &
WEB_PID=$!
wait "$WEB_PID"
