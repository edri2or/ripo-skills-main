#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code on the web environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Ensure Node.js and ts-node are on PATH
export PATH="/opt/node22/bin:$PATH"
echo "export PATH=\"/opt/node22/bin:\$PATH\"" >> "${CLAUDE_ENV_FILE:-/dev/null}"

# Verify required tools
for tool in node npm python3; do
  if ! command -v "$tool" &>/dev/null; then
    echo "ERROR: required tool '$tool' not found" >&2
    exit 1
  fi
done

# Install npm dev dependencies (idempotent — skips if node_modules is current)
cd "${CLAUDE_PROJECT_DIR}"
npm install

echo "Environment ready: node $(node --version), npm $(npm --version), python3 $(python3 --version)"
