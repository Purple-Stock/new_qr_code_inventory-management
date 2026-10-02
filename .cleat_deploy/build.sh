#!/usr/bin/env bash
# Cleat wraps build_command as `cleat_cpu_limit <argv>`. Inlining `if …; then`
# makes bash parse `then` as a keyword. Keep this file as the command body.
set -euo pipefail

pick_env_file() {
  if [ -n "${CLEAT_PANEL_ENV_FILE:-}" ] && [ -f "${CLEAT_PANEL_ENV_FILE}" ]; then
    printf '%s\n' "${CLEAT_PANEL_ENV_FILE}"
    return 0
  fi
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

# systemd EnvironmentFile allows `KEY=host.a, host.b`. Bash `. file` would
# execute `host.b` as a command. Export each KEY=VALUE as one assignment.
load_env_file() {
  local src="$1"
  local tmp key val
  tmp=$(mktemp)
  if [ -r "$src" ]; then
    cp "$src" "$tmp"
  else
    sudo cp "$src" "$tmp"
    sudo chown "$(id -u):$(id -g)" "$tmp"
  fi
  chmod 600 "$tmp"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    val="${line#*=}"
    case "$key" in
      [A-Za-z_]*) export "$key=$val" ;;
    esac
  done < "$tmp"
  rm -f "$tmp"
}

if ENV_FILE=$(pick_env_file); then
  load_env_file "$ENV_FILE"
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

if [ "${CLEAT_BUILD_LOAD_ONLY:-}" = "1" ]; then
  printf 'PHX_HOST=%s\n' "${PHX_HOST-}"
  printf 'DATABASE_URL=%s\n' "${DATABASE_URL-}"
  exit 0
fi

npm run build
