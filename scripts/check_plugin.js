const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkPlugin() {
  // Use direct connection to mongo1 on port 27017
  const mongoUri = 'mongodb://localhost:27017/aragon?directConnection=true';
  
  console.log('Connecting to MongoDB...');
  console.log('URI:', mongoUri);
  
  const client = new MongoClient(mongoUri, {
    directConnection: true,
    serverSelectionTimeoutMS: 5000
  });
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const pluginsCollection = db.collection('plugins');
    const proposalsCollection = db.collection('proposals');

    const pluginAddress = '0x4d83e8fbaB950a9df568C8baa7382d97a6c0Cdf8'.toLowerCase();
    const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783'.toLowerCase();
    const network = 'harmony-mainnet';
    
    console.log(`\n🔍 Searching for plugin: ${pluginAddress}`);
    console.log(`   Network: ${network}`);

    const plugin = await pluginsCollection.findOne({
      address: pluginAddress,
      network: network
    });

    if (plugin) {
      console.log('\n✅ Plugin found:');
      console.log(`   Address: ${plugin.address}`);
      console.log(`   DAO: ${plugin.daoAddress}`);
      console.log(`   Interface Type: ${plugin.interfaceType}`);
      console.log(`   Subdomain: ${plugin.subdomain || 'none'}`);
      console.log(`   Supported: ${plugin.isSupported}`);
      console.log(`   Block Number: ${plugin.blockNumber}`);
    } else {
      console.log('\n❌ Plugin NOT found in database');
    }
    
    console.log('\n\n📋 Checking all plugins for this DAO...');
    const daoPlugins = await pluginsCollection.find({
      daoAddress: daoAddress,
      network: network
    }).toArray();
    
    console.log(`\nFound ${daoPlugins.length} plugins for DAO ${daoAddress}:`);
    daoPlugins.forEach(p => {
      console.log(`   - ${p.address}`);
      console.log(`     Type: ${p.interfaceType}`);
      console.log(`     Subdomain: ${p.subdomain || 'none'}`);
      console.log(`     Supported: ${p.isSupported}`);
      console.log('');
    });

    console.log('\n\n📝 Checking for proposals from target plugin...');
    const proposals = await proposalsCollection.find({
      pluginAddress: pluginAddress,
      network: network
    }).sort({ blockNumber: -1 }).limit(10).toArray();

    console.log(`\nFound ${proposals.length} proposals for plugin ${pluginAddress}:`);
    if (proposals.length > 0) {
      proposals.forEach(p => {
        console.log(`   - Proposal #${p.proposalIndex}`);
        console.log(`     Title: ${p.title || 'No title'}`);
        console.log(`     Block: ${p.blockNumber}`);
        console.log(`     TX: ${p.transactionHash}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No proposals found for this plugin');
    }

    // Check proposals for the DAO
    console.log('\n\n📝 Checking ALL proposals for the DAO...');
    const daoProposals = await proposalsCollection.find({
      daoAddress: daoAddress,
      network: network
    }).sort({ blockNumber: -1 }).limit(10).toArray();

    console.log(`\nFound ${daoProposals.length} total proposals for DAO:`);
    daoProposals.forEach(p => {
      console.log(`   - Proposal #${p.proposalIndex} (Plugin: ${p.pluginAddress})`);
      console.log(`     Title: ${p.title || 'No title'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkPlugin().catch(console.error)
