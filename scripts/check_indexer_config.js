const { MongoClient } = require('mongodb');

async function checkIndexerConfig() {
  const client = new MongoClient('mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('aragon_mainnet');
    
    // Check if ConfigIndexer exists for harmony-mainnet
    const configIndexer = await db.collection('configindexers').findOne({
      network: 'harmony-mainnet',
      service: 'indexer-harmony-mainnet'
    });

    if (configIndexer) {
      console.log('\n✅ ConfigIndexer found for harmony-mainnet:');
      console.log('Service:', configIndexer.service);
      console.log('Network:', configIndexer.network);
      console.log('Block:', configIndexer.block);
      console.log('End:', configIndexer.end);
      console.log('Created:', configIndexer.createdAt);
      console.log('Updated:', configIndexer.updatedAt);
      console.log('\n⚠️  This means HistoricalCrawler will NOT run again unless you delete this record!');
    } else {
      console.log('\n❌ No ConfigIndexer found for harmony-mainnet');
      console.log('✅ This means HistoricalCrawler will run and pick up new plugin addresses!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkIndexerConfig();
