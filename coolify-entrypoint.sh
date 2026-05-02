#!/bin/bash
# Coolify entrypoint wrapper.
#
# Why this exists: upstream script.sh does `source ./.env.sample` as a fallback
# when ./.env is missing. With Coolify (or any setup that injects env vars via
# `environment:` instead of `env_file`), that fallback OVERWRITES the real
# values with the placeholder defaults from .env.sample (e.g.
# MYSQL_PASSWORD=cloudlogpassword), which then get written into
# application/config/database.php — breaking DB auth.
#
# This wrapper materialises a real .env file from the current environment
# BEFORE handing control to script.sh, so the source picks up the right values.

set -e

ENV_PATH="/var/www/html/.env"

cat > "$ENV_PATH" <<ENVFILE
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_HOST=${MYSQL_HOST:-db}
MYSQL_PORT=${MYSQL_PORT:-3306}
BASE_LOCATOR=${BASE_LOCATOR}
WEBSITE_URL=${WEBSITE_URL}
DIRECTORY=${DIRECTORY:-/var/www/html}
ENVFILE

chmod 600 "$ENV_PATH"

exec /usr/local/bin/startup.sh
