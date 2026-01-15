#!/bin/bash
set -e

echo "🔄 Running plugin helpers backfill inside Docker container..."
echo ""

# The actual container name from docker-compose
CONTAINER_NAME="aragon-app-backend-service-aragon-api-1"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Container '${CONTAINER_NAME}' is not running!"
  echo ""
  echo "Please start the backend services first:"
  echo "   cd /opt/Aragon-app-backend"
  echo "   docker-compose up -d"
  echo ""
  exit 1
fi

# Execute backfill script inside the running container
echo "🚀 Executing backfill script inside ${CONTAINER_NAME}..."
echo ""

docker exec "${CONTAINER_NAME}" \
  yarn ts-node -r tsconfig-paths/register scripts/backfill-plugin-helpers.ts

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Backfill completed successfully!"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Verify helpers in MongoDB:"
  echo "      docker exec -it mongo1 mongosh"
  echo "      use aragon"
  echo "      db.logpluginsetupprocessors.findOne({pluginAddress: '0x48d6e7dc4a289417d6878119092d2bb040162995', event: 'InstallationPrepared'}, {helpers: 1, blockNumber: 1})"
  echo ""
  echo "   2. Test the API endpoint:"
  echo "      curl http://api.whostler.com/api/v2/plugins/installation-helpers/harmony-mainnet/0x48D6E7Dc4A289417D6878119092d2Bb040162995"
else
  echo "❌ Backfill failed with exit code $EXIT_CODE"
  echo "   Check logs above for details"
  exit $EXIT_CODE
fi