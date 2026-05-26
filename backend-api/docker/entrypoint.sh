#!/bin/sh
set -e

echo "[entrypoint] Caching config / routes / views..."
php artisan config:cache --no-interaction
php artisan route:cache  --no-interaction
php artisan view:cache   --no-interaction

echo "[entrypoint] Running migrations..."
php artisan migrate --force --no-interaction

if [ $# -gt 0 ]; then
  echo "[entrypoint] Running: $*"
  exec "$@"
else
  echo "[entrypoint] Starting supervisor (nginx + php-fpm)..."
  exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
fi
