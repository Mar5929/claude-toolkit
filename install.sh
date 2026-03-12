#!/usr/bin/env bash
set -euo pipefail

# Claude Code Configuration Installer
# Copies config/ contents to ~/.claude/ with backup of existing files.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/config"
TARGET_DIR="$HOME/.claude"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux*)   PLATFORM="Linux" ;;
  Darwin*)  PLATFORM="macOS" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="Windows" ;;
  *)        PLATFORM="Unknown ($OS)" ;;
esac

echo "=== Claude Code Configuration Installer ==="
echo "Platform:    $PLATFORM"
echo "Source:      $CONFIG_DIR"
echo "Target:      $TARGET_DIR"
echo ""

if [ ! -d "$CONFIG_DIR" ]; then
  echo "ERROR: config/ directory not found at $CONFIG_DIR"
  exit 1
fi

# Backup existing config files
BACKUP_DIR="$TARGET_DIR/backup-$(date +%Y%m%d-%H%M%S)"
BACKED_UP=false

backup_if_exists() {
  local rel_path="$1"
  local target="$TARGET_DIR/$rel_path"
  if [ -e "$target" ]; then
    local backup_path="$BACKUP_DIR/$rel_path"
    mkdir -p "$(dirname "$backup_path")"
    cp -r "$target" "$backup_path"
    BACKED_UP=true
  fi
}

# Files that will be overwritten
CONFIG_FILES=(
  "CLAUDE.md"
  "settings.json"
  "settings.local.json"
  "templates/screenshot.mjs"
  "templates/SCREENSHOT_WORKFLOW.md"
  "commands/drawio.md"
  "agents/powerpoint-generator.md"
  "agents/prompt-engineer.md"
  "composio/authorize.py"
  "composio/composio_agent.py"
)

# Skill directories that will be overwritten
SKILL_DIRS=(
  "skills/project-init"
  "skills/sf-project-init"
  "skills/drawio"
  "skills/ui-ux-pro-max"
)

echo "Checking for existing files to back up..."
for f in "${CONFIG_FILES[@]}"; do
  backup_if_exists "$f"
done
for d in "${SKILL_DIRS[@]}"; do
  backup_if_exists "$d"
done
# Back up existing rule files
if [ -d "$CONFIG_DIR/rules" ]; then
  for rule in "$CONFIG_DIR/rules"/*.md; do
    [ -f "$rule" ] && backup_if_exists "rules/$(basename "$rule")"
  done
fi

if [ "$BACKED_UP" = true ]; then
  echo "Backed up existing files to: $BACKUP_DIR"
else
  echo "No existing files to back up."
fi
echo ""

# Create target directories
echo "Creating directories..."
mkdir -p "$TARGET_DIR/templates"
mkdir -p "$TARGET_DIR/skills"
mkdir -p "$TARGET_DIR/commands"
mkdir -p "$TARGET_DIR/agents"
mkdir -p "$TARGET_DIR/agent-memory/powerpoint-generator"
mkdir -p "$TARGET_DIR/agent-memory/prompt-engineer"
mkdir -p "$TARGET_DIR/composio"
mkdir -p "$TARGET_DIR/rules"

# Copy config files
echo "Copying configuration files..."
for f in "${CONFIG_FILES[@]}"; do
  src="$CONFIG_DIR/$f"
  dest="$TARGET_DIR/$f"
  if [ -f "$src" ]; then
    cp "$src" "$dest"
    echo "  Copied: $f"
  else
    echo "  WARNING: Source not found: $f"
  fi
done

# Copy skill directories (full replace)
echo "Copying skills..."
for d in "${SKILL_DIRS[@]}"; do
  src="$CONFIG_DIR/$d"
  dest="$TARGET_DIR/$d"
  if [ -d "$src" ]; then
    rm -rf "$dest"
    cp -r "$src" "$dest"
    echo "  Copied: $d/"
  else
    echo "  WARNING: Source not found: $d/"
  fi
done

# Copy rule files (dynamic discovery)
echo "Copying rules..."
if [ -d "$CONFIG_DIR/rules" ]; then
  for rule in "$CONFIG_DIR/rules"/*.md; do
    if [ -f "$rule" ]; then
      cp "$rule" "$TARGET_DIR/rules/"
      echo "  Copied: rules/$(basename "$rule")"
    fi
  done
else
  echo "  No rules directory found in config."
fi

echo ""
echo "=== Installation Complete ==="
echo ""

# Print plugin reminder
echo "Enabled plugins (install via Claude Code settings if not already active):"
echo "  - playwright"
echo "  - code-review"
echo "  - superpowers"
echo "  - frontend-design"
echo "  - context7"
echo "  - claude-code-setup"
echo "  - skill-creator"
echo "  - document-skills (from anthropics/skills marketplace)"
echo ""

echo "MCP servers to configure (see README.md for setup instructions):"
echo "  - Obsidian"
echo "  - Draw.io"
echo "  - Gmail (via Composio)"
echo "  - Google Calendar (via Composio)"
echo "  - Linear"
echo "  - Notion"
echo "  - Playwright"
echo "  - Context7"
echo ""

echo "NOTE: The global CLAUDE.md references Windows paths (C:/Users/michael.rihm/...)."
echo "      If your username differs, update the paths in ~/.claude/CLAUDE.md."
echo ""
echo "NOTE: settings.local.json contains Windows-specific permissions (cmd.exe, powershell.exe)."
echo "      Mac/Linux users should adjust these for their shell."
