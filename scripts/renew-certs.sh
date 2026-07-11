#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rental-shop}"

cd "${APP_DIR}"

docker run --rm \
  -v "${APP_DIR}/certbot/www:/var/www/certbot" \
  -v "${APP_DIR}/certbot/conf:/etc/letsencrypt" \
  certbot/certbot renew --webroot -w /var/www/certbot --quiet

docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
