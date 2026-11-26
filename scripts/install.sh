#!/usr/bin/env bash
# Link ~/.claude/CLAUDE.md to dotfiles/CLAUDE.md, and copy
# dotfiles/settings.json to ~/.claude/settings.json if that file is missing.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="${HOME}/.claude"
REPO_CLAUDE_MD="${REPO_ROOT}/dotfiles/CLAUDE.md"
LIVE_CLAUDE_MD="${CLAUDE_DIR}/CLAUDE.md"
REPO_SETTINGS="${REPO_ROOT}/dotfiles/settings.json"
LIVE_SETTINGS="${CLAUDE_DIR}/settings.json"
BACKUP_SUFFIX=".bak-$(date +%Y-%m-%d)"

mkdir --parents "${CLAUDE_DIR}"

if [[ -L "${LIVE_CLAUDE_MD}" && "$(readlink --canonicalize "${LIVE_CLAUDE_MD}")" == "${REPO_CLAUDE_MD}" ]]; then
  echo "CLAUDE.md: link is already in place"
else
  if [[ -e "${LIVE_CLAUDE_MD}" || -L "${LIVE_CLAUDE_MD}" ]]; then
    mv "${LIVE_CLAUDE_MD}" "${LIVE_CLAUDE_MD}${BACKUP_SUFFIX}"
    echo "CLAUDE.md: moved old file to ${LIVE_CLAUDE_MD}${BACKUP_SUFFIX}"
  fi
  ln --symbolic "${REPO_CLAUDE_MD}" "${LIVE_CLAUDE_MD}"
  echo "CLAUDE.md: linked ${LIVE_CLAUDE_MD} -> ${REPO_CLAUDE_MD}"
fi

if [[ -e "${LIVE_SETTINGS}" ]]; then
  echo "settings.json: exists, not changed (run scripts/sync-settings.sh to copy it into the repo)"
else
  cp "${REPO_SETTINGS}" "${LIVE_SETTINGS}"
  echo "settings.json: copied from ${REPO_SETTINGS}"
fi
