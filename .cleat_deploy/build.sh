#!/usr/bin/env bash
# Cleat wraps build_command as `cleat_cpu_limit <argv>`. Inlining `if …; then`
# makes bash parse `then` as a keyword. Keep this file as the command body.
set -euo pipefail

pick_env_file() {
  if [ -n "${CLEAT_APP:-}" ] && [ -f "/etc/${CLEAT_APP}/env" ]; then
    printf '%s\n' "/etc/${CLEAT_APP}/env"
    return 0
  fi
  if [ -f /etc/purple-stock-app/env ]; then
    printf '%s\n' /etc/purple-stock-app/env
    return 0
  fi
  if [ -f /etc/purple-stock-app-develop/env ]; then
    printf '%s\n' /etc/purple-stock-app-develop/env
    return 0
  fi
  return 1
}

if ENV_FILE=$(pick_env_file); then
  TMP_ENV=$(mktemp)
  sudo cp "$ENV_FILE" "$TMP_ENV"
  sudo chown "$(id -u):$(id -g)" "$TMP_ENV"
  chmod 600 "$TMP_ENV"
  set -a
  # shellcheck disable=SC1090
  . "$TMP_ENV"
  set +a
  rm -f "$TMP_ENV"
fi

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_PATH:-}" ]; then
  case "$DATABASE_PATH" in
    file:*|:memory:*) DATABASE_URL="$DATABASE_PATH" ;;
    *) DATABASE_URL="file:${DATABASE_PATH}" ;;
  esac
  export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:${PWD}/.cleat-build.sqlite"
fi

npm run build
