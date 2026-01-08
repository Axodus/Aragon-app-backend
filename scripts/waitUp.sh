#!/usr/bin/env bash

MONGO_URI="$1"

echo "Waiting for MongoDB PRIMARY at ${MONGO_URI}..."

until mongosh "$MONGO_URI" --quiet --eval '
  try {
    rs.isMaster().ismaster || rs.isMaster().isWritablePrimary
  } catch (e) {
    false
  }
' | grep -q true; do
  echo "MongoDB not PRIMARY yet..."
  sleep 2
done

echo "MongoDB PRIMARY is ready"
