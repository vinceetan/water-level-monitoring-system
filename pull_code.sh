#!/bin/bash

# Run this to get updated code from repo
# Make sure to grant appropriate run privilege by running:
# chmod u+x pull_code.sh

# Exit immediately if a pipeline command returns a failure status when needed
set -e

# Get current directory (where script is run from)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Verify this is a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Error: Not in a Git repository. Run this from your project root."
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "\n🔄 Pulling latest changes for branch '$CURRENT_BRANCH'..."

# Temporarily disable exit on error for stash operations
set +e

# Stash any local uncommitted changes to avoid pull conflicts
STASHED=0
STASH_OUTPUT=$(git stash push --include-untracked -m "Auto-stash by pull script" 2>&1)
if [[ "$STASH_OUTPUT" != *"No local changes to save"* ]]; then
  STASHED=1
  echo "📦 Local changes stashed temporarily."
fi

# Pull updates from remote
echo "⬇️ Pulling from origin/$CURRENT_BRANCH..."
if ! git pull origin "$CURRENT_BRANCH"; then
  echo "❌ Pull failed. Resolve conflicts manually."
  if [ $STASHED -eq 1 ]; then
    echo "⚠️ Restoring your stashed changes..."
    git stash pop
  fi
  exit 1
fi

# Restore stashed changes if any were saved
if [ $STASHED -eq 1 ]; then
  echo "📦 Restoring stashed changes..."
  git stash pop
fi

set -e

# Automatically rebuild Docker containers
echo -e "\n🔧 Rebuilding Docker containers..."

if docker compose version >/dev/null 2>&1; then
  docker compose down
  docker compose up -d --build
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose down
  docker-compose up -d --build
else
  echo "❌ Docker Compose not found. Please install Docker Compose."
  exit 1
fi

echo -e "\n✅ Update and rebuild complete for '$CURRENT_BRANCH'!"
