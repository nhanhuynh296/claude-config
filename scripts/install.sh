#!/usr/bin/env bash
# Copy dotfiles/settings.json to ~/.claude/settings.json if that file is missing.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="${HOME}/.claude"
REPO_SETTINGS="${REPO_ROOT}/dotfiles/settings.json"
LIVE_SETTINGS="${CLAUDE_DIR}/settings.json"

mkdir --parents "${CLAUDE_DIR}"

if [[ -e "${LIVE_SETTINGS}" ]]; then
  echo "settings.json: exists, not changed (run scripts/sync-settings.sh to copy it into the repo)"
else
  cp "${REPO_SETTINGS}" "${LIVE_SETTINGS}"
  echo "settings.json: copied from ${REPO_SETTINGS}"
fi
