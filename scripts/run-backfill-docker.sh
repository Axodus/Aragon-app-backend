#!/bin/bash
set -e

echo "🔄 Running plugin helpers backfill inside Docker container..."
echo ""

# Check if service-aragon-api container is running
if ! docker ps --format '{{.Names}}' | grep -q '^service-aragon-api$'; then
  echo "❌ Container 'service-aragon-api' is not running!"
  echo ""
  echo "Starting service-aragon-api container..."
  cd /opt/Aragon-app-backend
  docker-compose up -d service-aragon-api
  
  # Wait for container to be healthy
  echo "⏳ Waiting for container to be ready..."
  sleep 5
fi

# Execute backfill script inside the running container
echo "🚀 Executing backfill script..."
docker exec service-aragon-api \
  yarn ts-node -r tsconfig-paths/register scripts/backfill-plugin-helpers.ts

echo ""
echo "✅ Backfill completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify helpers in MongoDB:"
echo "      docker exec -it mongo1 mongosh"
echo "      use aragon"
echo "      db.logpluginsetupprocessors.findOne({pluginAddress: '0x48d6e7dc4a289417d6878119092d2bb040162995', event: 'InstallationPrepared'}, {helpers: 1})"
echo ""
echo "   2. Test the API endpoint:"
echo "      curl http://api.whostler.com/api/v2/plugins/installation-helpers/harmony-mainnet/0x48D6E7Dc4A289417D6878119092d2Bb040162995"