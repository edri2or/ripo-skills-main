#!/usr/bin/env bash
# generate_diff.sh
# Produces input.json for Conftest from a git diff between two commits.
#
# Usage:
#   bash scripts/generate_diff.sh <BASE_SHA> <HEAD_SHA>
#
# Environment variable overrides (take precedence over positional args):
#   BASE_SHA   — base commit SHA (e.g. PR base)
#   HEAD_SHA   — head commit SHA (e.g. PR head)
#
# Output:
#   input.json in the current working directory, with schema:
#   { "changed_files": ["path/to/file", ...] }

set -euo pipefail

BASE="${BASE_SHA:-${1:-}}"
HEAD="${HEAD_SHA:-${2:-}}"

if [[ -z "$BASE" || -z "$HEAD" ]]; then
    echo "ERROR: BASE_SHA and HEAD_SHA must be provided as arguments or environment variables." >&2
    echo "Usage: bash scripts/generate_diff.sh <BASE_SHA> <HEAD_SHA>" >&2
    exit 1
fi

# Verify jq is available
if ! command -v jq &>/dev/null; then
    echo "ERROR: 'jq' is required but not installed." >&2
    exit 1
fi

echo "Generating diff between ${BASE} and ${HEAD}..."

CHANGED_FILES=$(git diff --name-only "${BASE}...${HEAD}" 2>/dev/null || git diff --name-only "${BASE}" "${HEAD}")

if [[ -z "$CHANGED_FILES" ]]; then
    echo "No changed files detected. Writing empty input.json."
    echo '{"changed_files":[]}' > input.json
else
    echo "$CHANGED_FILES" \
        | jq -Rn '[inputs | select(length > 0)] | {"changed_files": .}' \
        > input.json
fi

echo "Written to input.json:"
cat input.json
