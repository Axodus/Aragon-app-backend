#!/usr/bin/env bash
set -e

HOST="$1"
PORT="$2"

echo "Waiting for $HOST:$PORT..."

while ! nc -z "$HOST" "$PORT"; do
  sleep 2
done

echo "$HOST:$PORT is up"
