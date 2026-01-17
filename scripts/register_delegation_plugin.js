const { MongoClient } = require('mongodb');
require('dotenv').config();

async function registerPlugin() {
  const uri = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('aragon_mainnet');
    const pluginsCollection = db.collection('plugins');

    const pluginData = {
      dao: '0x76b83b6148cca891d768ce3129585f25d0104783',
      plugin: '0x4d83e8fbab950a9df568c8baa7382d97a6c0cdf8',
      interfaceType: 'HarmonyDelegationVoting', // Must match what getHarmonyVotingInterfaceType returns
      installedAt: 83822003,
      installedTxHash: '0x9dd3fc3b87d6ecb719db15a7585d749767ecaa91fe4de7f42404b127ba0d122d',
      installedDate: new Date('2026-01-16T19:45:28.000Z'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📝 Registering plugin:', pluginData);

    // Check if plugin already exists
    const existing = await pluginsCollection.findOne({
      dao: pluginData.dao.toLowerCase(),
      plugin: pluginData.plugin.toLowerCase()
    });

    if (existing) {
      console.log('\n⚠️  Plugin already registered!');
      console.log('Existing record:', existing);
    } else {
      const result = await pluginsCollection.insertOne(pluginData);
      console.log('\n✅ Plugin registered successfully!');
      console.log('Inserted ID:', result.insertedId);
    }

    // Verify
    const verify = await pluginsCollection.findOne({
      dao: pluginData.dao.toLowerCase(),
      plugin: pluginData.plugin.toLowerCase()
    });

    console.log('\n🔍 Verification query result:');
    console.log(verify);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

registerPlugin().catch(console.error);
