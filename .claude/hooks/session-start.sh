#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

export PATH="/opt/node22/bin:$PATH"
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"/opt/node22/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

for tool in node npm python3; do
  if ! command -v "$tool" &>/dev/null; then
    echo "ERROR: required tool '$tool' not found" >&2
    exit 1
  fi
done

cd "${CLAUDE_PROJECT_DIR}"
if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
  npm install
fi

echo "Environment ready: node $(node --version), npm $(npm --version), python3 $(python3 --version)"
