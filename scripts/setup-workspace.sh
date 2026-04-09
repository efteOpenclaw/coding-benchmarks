#!/bin/bash
set -euo pipefail

# Usage: ./setup-workspace.sh <workspace-name> [run-label]
# Example: ./setup-workspace.sh opus-subagents-v2-p1 260409-opus-subagents-v2
#
# Creates Linux user, wires versioned configs from /app/workspaces/<name>/
# into /home/<name>/, creates run directory, ready for:
#   su - <workspace-name>
#   claude --dangerously-skip-permissions

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="${1:?Usage: $0 <workspace-name> [run-label]}"
RUN_LABEL="${2:-$(date +%y%m%d)-${WORKSPACE}}"
HOME_DIR="/home/${WORKSPACE}"
RUN_DIR="${HOME_DIR}/runs/${RUN_LABEL}"
TMPL_DIR="${APP_DIR}/workspaces/${WORKSPACE}"

if [ ! -d "$TMPL_DIR" ]; then
  echo "ERROR: No workspace template at ${TMPL_DIR}"
  echo "Available workspaces:"
  ls "$APP_DIR/workspaces/"
  exit 1
fi

# Detect project from workspace name
if [[ "$WORKSPACE" == *-p1 ]]; then
  PROJECT="project-1.md"
elif [[ "$WORKSPACE" == *-p2 ]]; then
  PROJECT="project-2.md"
else
  echo "ERROR: Cannot detect project (workspace must end in -p1 or -p2)"
  exit 1
fi

echo "=== Setting up workspace: ${WORKSPACE} ==="
echo "  Home:    ${HOME_DIR}"
echo "  Run dir: ${RUN_DIR}"
echo "  Project: ${PROJECT}"
echo ""

# 1. Create user (idempotent)
if ! id "$WORKSPACE" &>/dev/null; then
  useradd -m -d "$HOME_DIR" -s /bin/bash "$WORKSPACE"
  echo "[+] Created user ${WORKSPACE}"
else
  echo "[=] User ${WORKSPACE} already exists"
fi

# 2. Create directory structure
mkdir -p "${HOME_DIR}/.claude/plugins"
mkdir -p "${HOME_DIR}/prompts"
mkdir -p "${HOME_DIR}/projects"
mkdir -p "${RUN_DIR}"

# 3. Generate configs from templates (substitute placeholders)
sed "s|__WORKSPACE__|${WORKSPACE}|g; s|__RUN_DIR__|${RUN_DIR}/|g" \
  "${TMPL_DIR}/claude/CLAUDE.md" > "${HOME_DIR}/.claude/CLAUDE.md"

sed "s|__WORKSPACE__|${WORKSPACE}|g; s|__RUN_DIR__|${RUN_DIR}/|g" \
  "${TMPL_DIR}/prompts/build.md" > "${HOME_DIR}/prompts/build.md"

# 4. Copy settings.json (no templating needed)
cp "${TMPL_DIR}/claude/settings.json" "${HOME_DIR}/.claude/settings.json"

# 5. Symlink shared resources
ln -sfn "${APP_DIR}/plugins/superpowers" "${HOME_DIR}/.claude/plugins/superpowers"
ln -sfn "${APP_DIR}/infra/v2/skills"     "${HOME_DIR}/skills"
ln -sfn "${APP_DIR}/infra/v2/templates"  "${HOME_DIR}/templates"

# 6. Symlink project spec (just the one needed)
cp "${APP_DIR}/projects/${PROJECT}" "${HOME_DIR}/projects/${PROJECT}"

# 7. Fix ownership
chown -R "${WORKSPACE}:${WORKSPACE}" "${HOME_DIR}"

echo ""
echo "=== Done ==="
echo "Run with:"
echo "  su - ${WORKSPACE}"
echo "  cd ${RUN_DIR}"
echo "  claude --dangerously-skip-permissions"
