#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/baodan-bikeng"
APP_USER="${APP_USER:-admin}"

cd "$APP_DIR"

git config --global --add safe.directory "$APP_DIR" || true
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"

git fetch origin master
git checkout master
git pull --ff-only origin master

npm install
rm -rf .next
npm run build

mkdir -p data

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

curl -fsS http://127.0.0.1:3000/api/health

CSS_PATH="$(curl -fsS http://127.0.0.1:3000 | grep -o '/_next/static/chunks/[^"]*\.css' | head -n 1 || true)"
if [ -n "$CSS_PATH" ]; then
  curl -fsSI "http://127.0.0.1:3000$CSS_PATH" >/dev/null
fi

echo
echo "Deploy finished."
