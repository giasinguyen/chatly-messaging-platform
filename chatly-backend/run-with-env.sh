#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env file not found at $ENV_FILE" >&2
  exit 1
fi

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  line="$(trim "$line")"

  if [[ -z "$line" || "$line" == \#* ]]; then
    continue
  fi

  if [[ "$line" != *=* ]]; then
    continue
  fi

  name="$(trim "${line%%=*}")"
  value="$(trim "${line#*=}")"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  fi

  if [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    export "$name=$value"
  else
    echo "Skipping invalid environment variable name: $name" >&2
  fi
done < "$ENV_FILE"

cd "$SCRIPT_DIR"

echo "Loaded .env - starting Spring Boot..."

if [[ -x ./mvnw ]]; then
  exec ./mvnw spring-boot:run
fi

exec mvn spring-boot:run
