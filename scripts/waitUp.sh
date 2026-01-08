#!/usr/bin/env bash

MONGO_URI="$1"

echo "Waiting for MongoDB PRIMARY at ${MONGO_URI}..."

while true; do
  docker exec mongo1 mongosh "${MONGO_URI}" --quiet --eval "
    try {
      rs.isMaster().ismaster
    } catch(e) {
      false
    }
  " | grep -q true

  if [ $? -eq 0 ]; then
    echo "MongoDB PRIMARY is ready"
    break
  fi

  echo "MongoDB not PRIMARY yet..."
  sleep 2
done
