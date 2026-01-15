import { ethers } from 'ethers';
import mongoose from 'mongoose';
import config from '@config';
import { Models } from '@dbModels';

const PLUGIN_SETUP_PROCESSOR_ABI = [
  'event InstallationPrepared(address indexed sender, address indexed dao, bytes32 indexed preparedSetupId, address pluginSetupRepo, uint256 versionTag, bytes data, address plugin, address[] helpers)',
  'event InstallationApplied(address indexed dao, address indexed plugin, bytes32 preparedSetupId, bytes32 appliedSetupId)',
];

interface BackfillConfig {
  network: string;
  rpcUrl: string;
  pspAddress: string;
  pluginAddress: string;
  fromBlock: number;
  toBlock?: number;
}

async function backfillPluginHelpers(cfg: BackfillConfig) {
  console.log('🔄 Backfilling plugin helpers from chain...\n');
  console.log(`Network: ${cfg.network}`);
  console.log(`Plugin: ${cfg.pluginAddress}`);
  console.log(`PSP: ${cfg.pspAddress}`);
  console.log(`Blocks: ${cfg.fromBlock} → ${cfg.toBlock || 'latest'}\n`);

  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const psp = new ethers.Contract(cfg.pspAddress, PLUGIN_SETUP_PROCESSOR_ABI, provider);

  // Connect to MongoDB
  await mongoose.connect(config.mongoDbUri);
  console.log('✅ Connected to MongoDB\n');

  // Fetch InstallationPrepared events
  const filter = psp.filters.InstallationPrepared(null, null, null);
  console.log('🔍 Fetching InstallationPrepared events...');
  
  const logs = await provider.getLogs({
    address: cfg.pspAddress,
    topics: filter.topics as string[],
    fromBlock: cfg.fromBlock,
    toBlock: cfg.toBlock || 'latest',
  });

  console.log(`📦 Found ${logs.length} InstallationPrepared events\n`);

  let processed = 0;
  let updated = 0;
  let inserted = 0;

  for (const log of logs) {
    const parsed = psp.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });

    if (!parsed) continue;

    const {
      dao,
      preparedSetupId,
      pluginSetupRepo,
      versionTag,
      data: setupData,
      plugin,
      helpers,
    } = parsed.args;

    // Only process the specific plugin we care about
    if (plugin.toLowerCase() !== cfg.pluginAddress.toLowerCase()) {
      continue;
    }

    processed++;

    console.log(`\n📋 Processing event #${processed}`);
    console.log(`   Block: ${log.blockNumber}`);
    console.log(`   Tx: ${log.transactionHash}`);
    console.log(`   DAO: ${dao}`);
    console.log(`   Plugin: ${plugin}`);
    console.log(`   Helpers (${helpers.length}): ${helpers.join(', ')}`);

    // Fetch block timestamp and transaction details
    const [block, tx] = await Promise.all([
      provider.getBlock(log.blockNumber),
      provider.getTransaction(log.transactionHash),
    ]);

    if (!block || !tx) {
      console.log('   ⚠️  Could not fetch block/tx details, skipping');
      continue;
    }

    // Parse versionTag into release/build
    const versionTagBigInt = BigInt(versionTag.toString());
    const release = Number((versionTagBigInt >> 128n) & 0xFFFFFFFFFFFFFFFFn);
    const build = Number(versionTagBigInt & 0xFFFFFFFFFFFFFFFFn);

    // Prepare document
    const doc = {
      network: cfg.network,
      event: 'InstallationPrepared',
      blockNumber: log.blockNumber,
      blockTimestamp: block.timestamp,
      transactionHash: log.transactionHash,
      logIndex: log.index,
      daoAddress: dao.toLowerCase(),
      pluginAddress: plugin.toLowerCase(),
      pluginSetupRepo: pluginSetupRepo.toLowerCase(),
      preparedSetupId,
      versionTag: {
        release,
        build,
      },
      data: setupData,
      helpers: helpers.map((h: string) => h.toLowerCase()),
      sender: parsed.args.sender.toLowerCase(),
    };

    // Upsert into MongoDB
    const result = await Models.LogPluginSetupProcessor.updateOne(
      {
        network: cfg.network,
        transactionHash: log.transactionHash,
        logIndex: log.index,
      },
      { $set: doc },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inserted++;
      console.log('   ✅ Inserted new document');
    } else if (result.modifiedCount > 0) {
      updated++;
      console.log('   ✅ Updated existing document');
    } else {
      console.log('   ℹ️  Document already up-to-date');
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('📊 Summary:');
  console.log(`   Total events found: ${logs.length}`);
  console.log(`   Matching plugin: ${processed}`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

// Configuration for the problematic plugin
const HARMONY_MAINNET_CONFIG: BackfillConfig = {
  network: 'harmony-mainnet',
  rpcUrl: 'https://api.harmony.one',
  pspAddress: '0xac1b0f953Ca517F4aB21Cc3E2cdb95b186DBF80D', // PluginSetupProcessor
  pluginAddress: '0x48D6E7Dc4A289417D6878119092d2Bb040162995',
  fromBlock: 53_000_000, // Adjust based on when plugin was deployed
  toBlock: undefined, // undefined = latest
};

// Run
backfillPluginHelpers(HARMONY_MAINNET_CONFIG).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
