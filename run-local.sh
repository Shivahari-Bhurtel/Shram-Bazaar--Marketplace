#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="http://127.0.0.1:8080"
WEB_URL="http://127.0.0.1:8444"
API_LOG="${TMPDIR:-/tmp}/shram-bazar-api.log"
API_PID=""
WEB_PID=""

export DB_URL="${DB_URL:-jdbc:postgresql://127.0.0.1:5432/shrambazar}"
export DB_USERNAME="${DB_USERNAME:-shrambazar}"
# These match the local-development defaults in shrambazar/compose.yaml.
export DB_PASSWORD="${DB_PASSWORD:-local-only-shrambazar}"
export JWT_SECRET="${JWT_SECRET:-bG9jYWwtZGV2LW9ubHktc2hyYW1iYXphci1qd3Qtc2VjcmV0LW5vdC1mb3ItcHJvZHVjdGlvbi0yMDI2}"

api_healthy() {
  curl -fsS --max-time 2 "$API_URL/api/jobs" >/dev/null 2>&1 &&
    curl -fsS --max-time 2 "$API_URL/api/jobs/showcase" >/dev/null 2>&1
}

web_healthy() {
  curl -fsS --max-time 2 "$WEB_URL/" >/dev/null 2>&1
}

cleanup() {
  if [[ -n "$WEB_PID" ]] && kill -0 "$WEB_PID" 2>/dev/null; then kill "$WEB_PID" 2>/dev/null || true; fi
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then kill "$API_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

if ! api_healthy; then
  if curl -sS --max-time 2 "$API_URL/" >/dev/null 2>&1; then
    echo "Port 8080 is occupied by a service that does not answer the Shram Bazar API routes. Stop that process, then rerun this script."
    exit 1
  fi

  if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    if command -v docker >/dev/null 2>&1; then
      docker compose -f "$APP_DIR/shrambazar/compose.yaml" up -d database
      for _ in {1..30}; do
        pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
        sleep 1
      done
    fi
  fi
  if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    echo "PostgreSQL is not available on port 5432. Start the local database, then rerun this script."
    exit 1
  fi

  (cd "$APP_DIR/shrambazar" && sh ./mvnw -DskipTests package)
  (
    cd "$APP_DIR/shrambazar"
    java -jar target/shrambazar-0.0.1-SNAPSHOT.jar
  ) >"$API_LOG" 2>&1 &
  API_PID=$!

  for _ in {1..60}; do
    if api_healthy; then break; fi
    if ! kill -0 "$API_PID" 2>/dev/null; then
      echo "The Java API stopped during startup. Recent log output:"
      tail -40 "$API_LOG"
      exit 1
    fi
    sleep 1
  done
  if ! api_healthy; then
    echo "The Java API did not become ready. Recent log output:"
    tail -40 "$API_LOG"
    exit 1
  fi
fi

if web_healthy; then
  echo "Shram Bazar is ready at $WEB_URL (API: $API_URL)."
  if [[ -n "$API_PID" ]]; then wait "$API_PID"; fi
  exit 0
fi

if curl -sS --max-time 2 "$WEB_URL/" >/dev/null 2>&1; then
  echo "Port 8444 is occupied by a service that is not serving the Shram Bazar frontend."
  exit 1
fi

echo "Shram Bazar is starting at $WEB_URL (API: $API_URL). Press Ctrl+C to stop services started by this script."
(cd "$APP_DIR" && npm run dev:vite -- --host 127.0.0.1 --port 8444) &
WEB_PID=$!
wait "$WEB_PID"
