#!/usr/bin/env bash
# Copy the live ~/.claude/settings.json into dotfiles/settings.json.
# Claude Code rewrites settings.json, so the repo keeps a copy, not a symlink.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIVE_SETTINGS="${HOME}/.claude/settings.json"
REPO_SETTINGS="${REPO_ROOT}/dotfiles/settings.json"

cp "${LIVE_SETTINGS}" "${REPO_SETTINGS}"
echo "Copied ${LIVE_SETTINGS} -> ${REPO_SETTINGS}"
git -C "${REPO_ROOT}" diff --stat -- dotfiles/settings.json
