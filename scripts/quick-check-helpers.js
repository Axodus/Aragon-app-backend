// Quick check for plugin helpers without TypeScript compilation
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/aragon?replicaSet=rs0';

async function quickCheck() {
  console.log('🔍 Quick check for plugin helpers\n');
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const LogPluginSetupProcessor = mongoose.connection.collection('logpluginsetupprocessors');

    const pluginAddress = '0x48D6E7Dc4A289417D6878119092d2Bb040162995'.toLowerCase();
    const network = 'harmony-mainnet';

    const event = await LogPluginSetupProcessor.findOne({
      network,
      pluginAddress,
      event: 'InstallationPrepared',
    }, { sort: { blockNumber: -1 } });

    if (!event) {
      console.log('❌ No InstallationPrepared event found');
      process.exit(0);
    }

    console.log('📋 Event found:');
    console.log(`   Block: ${event.blockNumber}`);
    console.log(`   Tx: ${event.transactionHash}`);
    console.log(`   Has helpers: ${!!event.helpers}`);
    
    if (event.helpers && event.helpers.length > 0) {
      console.log(`\n📦 Helpers (${event.helpers.length}):`);
      event.helpers.forEach((h, i) => console.log(`   [${i}] ${h}`));
      
      const expected = [
        '0xc405df188019c1a28000d302ee10e224081c8736',
        '0xa4a72cb0c1cde087b40d79f28f559b047df1760f'
      ];
      
      const match = event.helpers.length === 2 &&
        event.helpers[0].toLowerCase() === expected[0] &&
        event.helpers[1].toLowerCase() === expected[1];
        
      console.log(`\n${match ? '✅' : '❌'} Matches expected: ${match}`);
    } else {
      console.log('\n⚠️  No helpers stored - needs migration/reindex');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

quickCheck();
