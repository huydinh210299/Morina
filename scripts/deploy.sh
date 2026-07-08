#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rental-shop}"
ENV_B64_PATH="${ENV_B64_PATH:-/tmp/rental-shop.env.b64}"

base64 -d "${ENV_B64_PATH}" > "${APP_DIR}/.env"

cd "${APP_DIR}"
docker compose -f docker-compose.prod.yml up -d --build
