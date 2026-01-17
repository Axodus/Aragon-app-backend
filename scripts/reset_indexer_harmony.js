const { MongoClient } = require('mongodb');

async function resetIndexerProgress() {
  const client = new MongoClient('mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('db-aragon');
    
    // Show current state before deletion
    const currentConfig = await db.collection('ConfigIndexer').findOne({
      network: 'harmony-mainnet',
      service: 'indexer-harmony-mainnet'
    });
    
    if (currentConfig) {
      console.log('\n📋 Current ConfigIndexer state:');
      console.log(`  Network: ${currentConfig.network}`);
      console.log(`  Service: ${currentConfig.service}`);
      console.log(`  Last Sync Block: ${currentConfig.lastSync}`);
      console.log(`  End: ${currentConfig.end}`);
      console.log(`  Updated: ${currentConfig.updatedAt}`);
    }
    
    // Delete ConfigIndexer for harmony-mainnet
    const configResult = await db.collection('ConfigIndexer').deleteMany({
      network: 'harmony-mainnet',
      service: 'indexer-harmony-mainnet'
    });
    console.log(`\n🗑️  Deleted ${configResult.deletedCount} ConfigIndexer records`);

    console.log('\n✅ Indexer progress reset complete!');
    console.log('⚠️  Next time the indexer runs, HistoricalCrawler will execute and pick up all installed plugin addresses.');
    console.log('⚠️  This will re-index from the beginning, which may take some time.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

resetIndexerProgress();
