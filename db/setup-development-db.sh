#!/bin/sh

set -e

echo "Creating boardsesh database if it doesnt exist"
psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='boardsesh'" | grep -q 1 || psql postgres -c "CREATE DATABASE boardsesh"

echo "Using boardlib to download database"
boardlib database tension ./tmp/tension.db  
boardlib database kilter ./tmp/kilter.db  

echo "Copying databases before modification"
export TENSION_DB_FILE="./tmp/tension.modified.db"
export KILTER_DB_FILE="./tmp/kilter.modified.db"
cp ./tmp/tension.db $TENSION_DB_FILE
cp ./tmp/kilter.db  $KILTER_DB_FILE


# PG Loader fails to converst the floats in climb_stats & climb_cache_fields
# so we convert those to regular floats before running pgloader
echo "Fixing unsigned float columns so pgloader handles them correctly"
DB_FILE=$KILTER_DB_FILE ./fix_unsigned_floats.sh
DB_FILE=$TENSION_DB_FILE ./fix_unsigned_floats.sh

echo "Running pgloader"
DB_FILE=$TENSION_DB_FILE pgloader tension_db.load 
DB_FILE=$KILTER_DB_FILE pgloader kilter_db.load 

echo "Deleting modified database copies"
rm -rf $TENSION_DB_FILE
rm -rf $KILTER_DB_FILE