#!/bin/sh
# Entry point for the docker compose `playwright` service.
# Installs deps into the named volume once, then runs whatever the
# `command:` resolves to (defaults to `npx playwright test`).
set -e

cd /app

if [ ! -d /app/node_modules/@playwright/test ]; then
  echo "→ first run — installing npm dependencies..."
  npm install --no-audit --no-fund --silent
fi

# The mcr.microsoft.com/playwright image already ships chromium + system
# libs, so no `playwright install` step is required.

exec "$@"
