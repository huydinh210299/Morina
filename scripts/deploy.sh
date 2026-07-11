#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rental-shop}"
ENV_B64_PATH="${ENV_B64_PATH:-/tmp/rental-shop.env.b64}"

mkdir -p "${APP_DIR}/nginx/conf.d" "${APP_DIR}/certbot/www" "${APP_DIR}/certbot/conf"
base64 -d "${ENV_B64_PATH}" > "${APP_DIR}/.env"

cd "${APP_DIR}"

set -a
. "${APP_DIR}/.env"
set +a

DOMAIN_NAME="${DOMAIN_NAME:-_}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

APP_DIR="${APP_DIR}" DOMAIN_NAME="${DOMAIN_NAME}" bash "${APP_DIR}/scripts/render-nginx-conf.sh" http

docker compose -f docker-compose.prod.yml up -d --build app mongodb nginx

if [ "${DOMAIN_NAME}" != "_" ] && [ -n "${LETSENCRYPT_EMAIL}" ]; then
  cert_path="${APP_DIR}/certbot/conf/live/${DOMAIN_NAME}/fullchain.pem"

  if [ ! -f "${cert_path}" ]; then
    docker run --rm \
      -v "${APP_DIR}/certbot/www:/var/www/certbot" \
      -v "${APP_DIR}/certbot/conf:/etc/letsencrypt" \
      certbot/certbot certonly --webroot -w /var/www/certbot \
      --email "${LETSENCRYPT_EMAIL}" \
      --agree-tos \
      --no-eff-email \
      -d "${DOMAIN_NAME}"
  else
    docker run --rm \
      -v "${APP_DIR}/certbot/www:/var/www/certbot" \
      -v "${APP_DIR}/certbot/conf:/etc/letsencrypt" \
      certbot/certbot renew --webroot -w /var/www/certbot --quiet || true
  fi

  if [ -f "${cert_path}" ]; then
    APP_DIR="${APP_DIR}" DOMAIN_NAME="${DOMAIN_NAME}" bash "${APP_DIR}/scripts/render-nginx-conf.sh" https
    docker compose -f docker-compose.prod.yml up -d nginx
  fi
fi
