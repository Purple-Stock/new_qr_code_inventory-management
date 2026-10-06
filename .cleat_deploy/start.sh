#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/apply-sqlite-migrations.mjs
exec npx next start --hostname 127.0.0.1 --port "${PORT}"
