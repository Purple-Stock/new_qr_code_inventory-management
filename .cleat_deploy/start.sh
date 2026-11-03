#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/apply-sqlite-migrations.mjs
# Cleat overlay skips dot-directories, so leftover Next 16 route-cache from
# an earlier release can survive publish and keep serving stale HTML.
rm -rf .next/server/route-cache .next/cache
exec npx next start --hostname 127.0.0.1 --port "${PORT}"
