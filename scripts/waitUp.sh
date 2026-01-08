#!/usr/bin/env bash

set -e

# Accept both env names
MONGO_URI="${MONGODB_URI:-$MONGO_DB_URI}"

if [ -z "$MONGO_URI" ]; then
  echo "❌ MONGO_DB_URI not set"
  exit 1
fi

replica_uri="${MONGO_URI#mongodb://}"

# Remove credentials if present
if [[ "$replica_uri" == *"@"* ]]; then
  replica_uri="${replica_uri#*@}"
fi

# Remove database + params
replica_uri="${replica_uri%%/*}"

IFS=',' read -ra HOSTS <<< "$replica_uri"

for hostport in "${HOSTS[@]}"; do
  host="${hostport%%:*}"
  port="${hostport##*:}"

  echo "🔍 Waiting for MongoDB node $host:$port..."
  until nc -z "$host" "$port"; do
    sleep 2
  done
  echo "✅ $host:$port is reachable"
done

echo "🎉 MongoDB replica set nodes reachable"
