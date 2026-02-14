#!/bin/sh
#
# dev-db-up.sh — Start the development database stack and ensure data is ready.
#
# The pre-built Docker image (boardsesh-dev-db) already contains Kilter,
# Tension, and MoonBoard board data, a test user, and social seed data.
# This script:
#   1. Starts postgres, neon-proxy, and redis containers
#   2. Waits for postgres to be ready
#   3. Runs drizzle migrations (to pick up any newer migrations not yet in the image)

set -e

echo "Starting development database containers..."
docker compose up -d postgres neon-proxy redis

echo "Waiting for postgres to be ready..."
sleep 3

echo "Running database migrations..."
npm run db:migrate

echo ""
echo "Development database is ready."
echo "  Test user: test@boardsesh.dev / test"
