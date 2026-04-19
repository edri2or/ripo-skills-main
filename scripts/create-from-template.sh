#!/usr/bin/env bash
# Bootstrap a new project from the project-life-107 template.
#
# Usage:
#   ./scripts/create-from-template.sh <new-project-name> [target-directory]
#
# Example:
#   ./scripts/create-from-template.sh my-new-agent ../my-new-agent

set -euo pipefail

TEMPLATE_REPO="https://github.com/edri2or/project-life-107.git"
TEMPLATE_NAME="project-life-107"

# ── Argument validation ───────────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <new-project-name> [target-directory]"
  echo ""
  echo "  new-project-name   Name for the new project (replaces all template references)"
  echo "  target-directory   Where to clone (defaults to <new-project-name>)"
  exit 1
fi

NEW_NAME="$1"
TARGET_DIR="${2:-$NEW_NAME}"

if [[ -e "$TARGET_DIR" ]]; then
  echo "Error: '$TARGET_DIR' already exists. Choose a different target directory."
  exit 1
fi

# ── Clone ─────────────────────────────────────────────────────────────────────
echo "Cloning template '$TEMPLATE_NAME' into '$TARGET_DIR'..."
git clone "$TEMPLATE_REPO" "$TARGET_DIR"
cd "$TARGET_DIR"

# ── Detach from template remote ───────────────────────────────────────────────
git remote remove origin

# ── Replace all template name references ─────────────────────────────────────
echo "Replacing '$TEMPLATE_NAME' → '$NEW_NAME'..."
while IFS= read -r -d '' file; do
  if grep -qF "$TEMPLATE_NAME" "$file" 2>/dev/null; then
    sed -i "s/$TEMPLATE_NAME/$NEW_NAME/g" "$file"
    echo "  updated: $file"
  fi
done < <(find . -not -path './.git/*' -type f -print0)

# ── Update template-source so the chain continues ────────────────────────────
printf '%s\n' "$NEW_NAME" > .claude/template-source

# ── Initial commit ────────────────────────────────────────────────────────────
git add -A
git commit -m "chore: initialize from $TEMPLATE_NAME template"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "Done! Project '$NEW_NAME' created in '$TARGET_DIR'."
echo ""
echo "Next steps:"
echo "  1.  cd $TARGET_DIR"
echo "  2.  Create a new repo on GitHub (do NOT initialize it)"
echo "  3.  git remote add origin <your-new-repo-url>"
echo "  4.  git push -u origin main"
echo "  5.  Enable branch protection: Settings → Branches → add 'doc-policy-check'"
echo ""
echo "If you use Claude Code, you can also run /cleanup-template inside the"
echo "new repo for an interactive replacement flow."
