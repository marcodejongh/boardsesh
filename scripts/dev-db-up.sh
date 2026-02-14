#!/bin/sh
#
# dev-db-up.sh — Start the development database stack and ensure data is ready.
#
# The pre-built Docker image (boardsesh-dev-db) already contains Kilter and
# Tension board data. This script:
#   1. Starts postgres, neon-proxy, and redis containers
#   2. Waits for postgres to be ready
#   3. Runs drizzle migrations (to pick up any newer migrations not yet in the image)
#   4. Downloads + imports MoonBoard data if not already present
#
# MoonBoard data is NOT baked into the Docker image because the import uses the
# Neon HTTP proxy (TypeScript import script), so it must run after containers are up.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOONBOARD_DIR="$ROOT_DIR/packages/db/docker/tmp/problems_2023_01_30"
MOONBOARD_ZIP="$ROOT_DIR/packages/db/docker/tmp/problems_2023_01_30.zip"
MOONBOARD_URL="https://github.com/spookykat/MoonBoard/files/13193317/problems_2023_01_30.zip"

echo "Starting development database containers..."
docker compose up -d postgres neon-proxy redis

echo "Waiting for postgres to be ready..."
sleep 3

echo "Running database migrations..."
npm run db:migrate

# Download and import MoonBoard data if not already present
if [ ! -d "$MOONBOARD_DIR" ]; then
  echo "Downloading MoonBoard problem data..."
  mkdir -p "$(dirname "$MOONBOARD_ZIP")"
  curl -o "$MOONBOARD_ZIP" -L "$MOONBOARD_URL"

  echo "Extracting MoonBoard data..."
  unzip -o "$MOONBOARD_ZIP" -d "$MOONBOARD_DIR"
fi

echo "Importing MoonBoard data..."
npm run db:import-moonboard -- docker/tmp/problems_2023_01_30

echo "Development database is ready."
