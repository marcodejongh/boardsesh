#!/bin/sh

set -e

echo "🚀 Starting BoardSesh development database setup..."

# Set up environment variables for the Postgres connection
export PGHOST="${POSTGRES_HOST:-postgres}" # Defaults to 'postgres' service name
export PGPORT="${POSTGRES_PORT:-5432}"
export PGUSER="${POSTGRES_USER:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:-password}"
export PGDBNAME="${POSTGRES_DATABASE:-verceldb}"

export DB_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDBNAME}"

# Optional: Specify the database to connect to for admin commands like creating a new database
export PGDATABASE="postgres" # Connect to the default `postgres` database

echo "🗃️  Step 1/6: Setting up PostgreSQL database..."
echo "   Database: $PGDBNAME on $PGHOST:$PGPORT"
psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='verceldb'" | grep -q 1 && psql postgres -c "DROP DATABASE verceldb"
psql postgres -c "CREATE DATABASE verceldb"
echo "   ✅ Database created successfully"

echo "   📋 Running initial schema migration..."
psql $DB_URL -f ./drizzle/0000_cloudy_carlie_cooper.sql
echo "   ✅ Schema migration completed"

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
  unzip -o -j tensionboard.apk assets/db.sqlite3 -d /db/tmp/
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

echo "🎉 Step 6/6: Development database setup completed!"
echo "   💾 Database: $PGDBNAME"
echo "   🔗 Connection: $DB_URL"
echo "   🏔️  Board data: Kilter + Tension ready for development" 
