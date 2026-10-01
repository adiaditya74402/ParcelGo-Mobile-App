#!/bin/sh
set -eu

if [ -n "${REPLIT_EXPO_SESSION_SECRET:-}" ]; then
  pnpm exec create-launch login --session "$REPLIT_EXPO_SESSION_SECRET" || true
fi

: "${SUPABASE_URL:?Add SUPABASE_URL in Replit Secrets.}"
: "${SUPABASE_ANON_KEY:?Add SUPABASE_ANON_KEY in Replit Secrets.}"
: "${REPLIT_EXPO_DEV_DOMAIN:?The Expo preview domain is not available.}"
: "${REPLIT_DEV_DOMAIN:?The Replit preview domain is not available.}"
: "${PORT:?The Expo service port is not available.}"

export EXPO_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
export EXPO_PACKAGER_PROXY_URL="https://$REPLIT_EXPO_DEV_DOMAIN"
export EXPO_PUBLIC_DOMAIN="$REPLIT_DEV_DOMAIN"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"
export REACT_NATIVE_PACKAGER_HOSTNAME="$REPLIT_DEV_DOMAIN"

exec pnpm exec expo start --localhost --port "$PORT"