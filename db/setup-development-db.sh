#!/bin/sh

set -e

# Set up environment variables for the Postgres connection
export PGHOST="${POSTGRES_HOST:-postgres}" # Defaults to 'postgres' service name
export PGPORT="${POSTGRES_PORT:-5432}"
export PGUSER="${POSTGRES_USER:-postgres}"
export PGPASSWORD="${POSTGRES_PASSWORD:-password}"
export PGDBNAME="${POSTGRES_DATABASE:-verceldb}"

export DB_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDBNAME}"

# Optional: Specify the database to connect to for admin commands like creating a new database
export PGDATABASE="postgres" # Connect to the default `postgres` database

echo "Creating database if it doesnt exist"
psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='verceldb'" | grep -q 1 && psql postgres -c "DROP DATABASE verceldb"
psql postgres -c "CREATE DATABASE verceldb"

psql $DB_URL -f ./drizzle/0000_cloudy_carlie_cooper.sql

# echo "Using boardlib to download database"
curl -o kilterboard.apk -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" "https://d.apkpure.net/b/APK/com.auroraclimbing.kilterboard?version=latest"
curl -o tensionboard.apk -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" "https://d.apkpure.net/b/APK/com.auroraclimbing.tensionboard2?version=latest"

unzip -j kilterboard.apk assets/db.sqlite3 -d tmp/ -n kilter.db
unzip -j tensionboard.apk assets/db.sqlite3 -d tmp/ -n tension.db

export TENSION_DB_FILE="/db/tmp/tension.modified.db"
export KILTER_DB_FILE="/db/tmp/kilter.modified.db"

# echo "Deleting modified database copies if they exist already"
rm -rf $TENSION_DB_FILE
rm -rf $KILTER_DB_FILE

# echo "Copying databases before modification"
cp /db/tmp/tension.db $TENSION_DB_FILE
cp /db/tmp/kilter.db  $KILTER_DB_FILE

# PG Loader fails to converst the floats in climb_stats & climb_cache_fields
# so we convert those to regular floats before running pgloader
echo "Fixing problems in kilter SQLite Database"
DB_FILE=$KILTER_DB_FILE /db/cleanup_sqlite_db_problems.sh

echo "Fixing problems in tension SQLite Database"
DB_FILE=$TENSION_DB_FILE /db/cleanup_sqlite_db_problems.sh

echo "Running pgloader"
DB_FILE=$TENSION_DB_FILE pgloader /db/tension_db.load 

DB_FILE=$KILTER_DB_FILE pgloader /db/kilter_db.load 
