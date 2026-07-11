#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rental-shop}"
DOMAIN_NAME="${DOMAIN_NAME:-_}"
MODE="${1:-http}"

template="${APP_DIR}/nginx/templates/${MODE}.conf.template"
target="${APP_DIR}/nginx/conf.d/default.conf"

sed "s|\${DOMAIN_NAME}|${DOMAIN_NAME}|g" "${template}" > "${target}"
