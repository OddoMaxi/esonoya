#!/bin/sh
set -e

echo "[entrypoint] Caching config / routes / views..."
php artisan config:cache --no-interaction
php artisan route:cache  --no-interaction
php artisan view:cache   --no-interaction

echo "[entrypoint] Running migrations..."
for i in 1 2 3 4 5; do
  php artisan migrate --force --no-interaction && break
  echo "[entrypoint] Migration attempt $i failed, retrying in 5s..."
  sleep 5
done

if [ $# -gt 0 ]; then
  echo "[entrypoint] Running: $*"
  exec "$@"
else
  echo "[entrypoint] Starting supervisor (nginx + php-fpm)..."
  exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
fi
