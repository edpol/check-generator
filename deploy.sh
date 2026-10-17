#!/usr/bin/env bash
# Pull the latest code on the server and restart the app.
set -euo pipefail

main() {
  cd "$(dirname "$0")"
  git pull origin main
  npm install --omit=dev
  pm2 restart checks
}

main "$@"
