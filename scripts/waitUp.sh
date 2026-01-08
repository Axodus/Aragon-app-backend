#!/usr/bin/env bash

MONGO_URI=$1

echo "Waiting for MongoDB PRIMARY..."

until mongosh "$MONGO_URI" --quiet --eval '
  rs.isMaster().ismaster || rs.isMaster().isWritablePrimary
' | grep -q true; do
  echo "MongoDB not PRIMARY yet..."
  sleep 2
done

echo "MongoDB PRIMARY is ready"