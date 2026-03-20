#!/bin/sh

set -e

echo "🚀 Starting Boardsesh development database setup..."

# Check if this is a fresh setup or just running migrations
FRESH_SETUP=false
if [ ! -f /db/tmp/db-setup-complete.flag ]; then
  FRESH_SETUP=true
fi

# Set up environment variables for the Postgres connection
export PGHOST="${POSTGRES_HOST:-postgres}" # Defaults to 'postgres' service name
export PGPORT="${POSTGRES_PORT:-5432}"
export PGUSER="${POSTGRES_USER:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:-password}"
export PGDBNAME="${POSTGRES_DATABASE:-verceldb}"

export DB_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDBNAME}"

# Optional: Specify the database to connect to for admin commands like creating a new database
export PGDATABASE="postgres" # Connect to the default `postgres` database

if [ "$FRESH_SETUP" = true ]; then
  echo "🗃️  Step 1/6: Setting up PostgreSQL database..."
  echo "   Database: $PGDBNAME on $PGHOST:$PGPORT"
  psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$PGDBNAME'" | grep -q 1 && psql postgres -c "DROP DATABASE $PGDBNAME"
  psql postgres -c "CREATE DATABASE $PGDBNAME"
  echo "   ✅ Database created successfully"

  echo "📱 Step 2/6: Downloading and extracting board databases..."
  if [ ! -f "/db/tmp/kilter.db" ]; then
    if [ ! -f "kilterboard.apk" ]; then
      echo "   📥 Downloading Kilterboard APK..."
      curl -o kilterboard.apk -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" "https://d.apkpure.net/b/APK/com.auroraclimbing.kilterboard?version=latest"
      echo "   ✅ Kilterboard APK downloaded"
    else
      echo "   ♻️  Kilterboard APK already exists, skipping download"
    fi
    echo "   📦 Extracting Kilter database..."
    unzip -o -j kilterboard.apk assets/db.sqlite3 -d /db/tmp/
    mv /db/tmp/db.sqlite3 /db/tmp/kilter.db
    echo "   ✅ Kilter database extracted"
  else
    echo "   ♻️  Kilter database already exists, skipping extraction"
  fi

  if [ ! -f "/db/tmp/tension.db" ]; then
    if [ ! -f "tensionboard.apk" ]; then
      echo "   📥 Downloading Tensionboard APK..."
      curl -o tensionboard.apk -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" "https://d.apkpure.net/b/APK/com.auroraclimbing.tensionboard2?version=latest"
      echo "   ✅ Tensionboard APK downloaded"
    else
      echo "   ♻️  Tensionboard APK already exists, skipping download"
    fi
    echo "   📦 Extracting Tension database..."
    # Try to extract directly from the main APK first, suppressing output and errors.
    unzip -o -j tensionboard.apk assets/db.sqlite3 -d /db/tmp/ > /dev/null 2>&1 || true

    # If the file isn't there, try extracting the nested APK and then the database from it.
    if [ ! -f "/db/tmp/db.sqlite3" ]; then
      echo "   ...database not found directly, attempting nested extraction."
      unzip -o -j tensionboard.apk 'com.auroraclimbing.tensionboard2.apk' 
      unzip -o -j com.auroraclimbing.tensionboard2.apk assets/db.sqlite3 -d /db/tmp/
    else
      echo "   ♻️  Tension database already exists, skipping extraction"
    fi
    mv /db/tmp/db.sqlite3 /db/tmp/tension.db
    echo "   ✅ Tension database extracted"
  else
    echo "   ♻️  Tension database already exists, skipping extraction"
  fi

  export TENSION_DB_FILE="/db/tmp/tension.modified.db"
  export KILTER_DB_FILE="/db/tmp/kilter.modified.db"

  echo "📋 Step 3/6: Preparing database copies for modification..."
  echo "   🗑️  Removing existing modified copies..."
  rm -rf $TENSION_DB_FILE
  rm -rf $KILTER_DB_FILE

  echo "   📄 Creating working copies..."
  cp /db/tmp/tension.db $TENSION_DB_FILE
  cp /db/tmp/kilter.db  $KILTER_DB_FILE
  echo "   ✅ Database copies prepared"

  echo "🔧 Step 4/6: Fixing SQLite database compatibility issues..."
  echo "   (PG Loader fails to convert FLOAT UNSIGNED - converting to regular FLOAT)"
  echo "   🎯 Processing Kilter database..."
  DB_FILE=$KILTER_DB_FILE /db/cleanup_sqlite_db_problems.sh

  echo "   🎯 Processing Tension database..."
  DB_FILE=$TENSION_DB_FILE /db/cleanup_sqlite_db_problems.sh
  echo "   ✅ Database fixes completed"

  echo "🚛 Step 5/6: Loading data into PostgreSQL..."
  echo "   📊 Loading Tension board data..."
  DB_FILE=$TENSION_DB_FILE pgloader /db/tension_db.load 
  echo "   ✅ Tension data loaded successfully"

  echo "   📊 Loading Kilter board data..."
  DB_FILE=$KILTER_DB_FILE pgloader /db/kilter_db.load 
  echo "   ✅ Kilter data loaded successfully"

  touch /db/tmp/db-setup-complete.flag
  echo "🎉 Step 6/7: Initial database setup completed!"
  echo "   💾 Database: $PGDBNAME"
  echo "   🔗 Connection: $DB_URL"
  echo "   🏔️  Board data: Kilter + Tension ready for development"
else
  echo "♻️  Database setup already completed. Skipping initial setup."
fi

# Create Neon control plane table (required for local Neon proxy)
echo "🔧 Setting up Neon control plane for local proxy..."
psql $PGDBNAME -c "CREATE SCHEMA IF NOT EXISTS neon_control_plane;" > /dev/null 2>&1 || true
psql $PGDBNAME -c "DROP TABLE IF EXISTS neon_control_plane.endpoints;" > /dev/null 2>&1 || true
psql $PGDBNAME -c "
CREATE TABLE IF NOT EXISTS neon_control_plane.endpoints (
  endpoint_id TEXT PRIMARY KEY,
  allowed_ips TEXT,
  passwordless_access BOOLEAN DEFAULT FALSE
);
INSERT INTO neon_control_plane.endpoints (endpoint_id, allowed_ips, passwordless_access)
VALUES ('db', '0.0.0.0/0', TRUE)
ON CONFLICT (endpoint_id) DO NOTHING;
" > /dev/null 2>&1
echo "   ✅ Neon control plane configured"

echo "📦 Step 7/8: Checking Node.js dependencies..."
cd /app

# Check if node_modules is mounted (we mount from host for faster setup)
if [ -d "/app/node_modules" ] && [ "$(ls -A /app/node_modules)" ]; then
  echo "   ✅ Using mounted node_modules from host"
else
  export PYTHON=/usr/bin/python3
  # Install only what we need for drizzle-kit to work
  bun install
  echo "   ✅ Dependencies installed"
fi

echo "🔄 Step 8/8: Running drizzle migrations..."
bunx drizzle-kit migrate
echo "   ✅ Drizzle migrations completed!"

echo "✨ Boardsesh development database is ready!" 
