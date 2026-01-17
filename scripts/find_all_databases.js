const { MongoClient } = require('mongodb');

async function findAllDatabases() {
  const client = new MongoClient('mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    
    console.log('\n📁 All databases:');
    dbs.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Search for progress/config in each database
    for (const dbInfo of dbs.databases) {
      if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') continue;
      
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      const relevantCollections = collections.filter(col => 
        col.name.toLowerCase().includes('config') || 
        col.name.toLowerCase().includes('progress') ||
        col.name.toLowerCase().includes('indexer')
      );
      
      if (relevantCollections.length > 0) {
        console.log(`\n📊 Database: ${dbInfo.name}`);
        for (const col of relevantCollections) {
          console.log(`  Collection: ${col.name}`);
          const count = await db.collection(col.name).countDocuments({});
          console.log(`    Total documents: ${count}`);
          
          // Show sample document
          const sample = await db.collection(col.name).findOne({});
          if (sample) {
            console.log(`    Sample document:`, JSON.stringify(sample, null, 2));
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

findAllDatabases();
