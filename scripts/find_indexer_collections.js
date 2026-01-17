const { MongoClient } = require('mongodb');

async function findIndexerCollections() {
  const client = new MongoClient('mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('aragon_mainnet');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📁 All collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Find collections related to indexer/progress
    console.log('\n🔍 Searching for indexer-related collections:');
    const indexerCollections = collections.filter(col => 
      col.name.toLowerCase().includes('config') || 
      col.name.toLowerCase().includes('progress') ||
      col.name.toLowerCase().includes('indexer')
    );
    
    for (const col of indexerCollections) {
      console.log(`\n📊 Collection: ${col.name}`);
      const docs = await db.collection(col.name).find({
        $or: [
          { network: 'harmony-mainnet' },
          { logService: { $regex: /harmony/i } }
        ]
      }).limit(2).toArray();
      
      if (docs.length > 0) {
        console.log(`  Found ${docs.length} harmony-mainnet related documents:`);
        docs.forEach((doc, i) => {
          console.log(`  Document ${i + 1}:`, JSON.stringify({
            _id: doc._id,
            network: doc.network,
            service: doc.service,
            logService: doc.logService,
            lastSync: doc.lastSync,
            block: doc.block,
            end: doc.end,
            isEnded: doc.isEnded
          }, null, 2));
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

findIndexerCollections();
