import { ethers } from 'ethers';
import mongoose from 'mongoose';
import config from '@config';
import { Models } from '@dbModels';

const PLUGIN_SETUP_PROCESSOR_ABI = [
  'event InstallationPrepared(address indexed sender, address indexed dao, bytes32 indexed preparedSetupId, address pluginSetupRepo, uint256 versionTag, bytes data, address plugin, address[] helpers)',
];

interface BackfillConfig {
  network: string;
  rpcUrl: string;
  pspAddress: string;
  pluginAddress: string;
  fromBlock: number;
  toBlock?: number | 'latest';
  chunkSize?: number;
}

async function backfillPluginHelpers(cfg: BackfillConfig) {
  console.log('🔄 Backfilling plugin helpers from chain...\n');
  console.log(`Network: ${cfg.network}`);
  console.log(`Plugin: ${cfg.pluginAddress}`);
  console.log(`PSP: ${cfg.pspAddress}`);
  console.log(`Blocks: ${cfg.fromBlock} → ${cfg.toBlock || 'latest'}\n`);

  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const iface = new ethers.Interface(PLUGIN_SETUP_PROCESSOR_ABI);

  // Connect to MongoDB
  const mongoUri = config.MONGO_DB.URI;
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  // Get event topic hash
  const eventFragment = iface.getEvent('InstallationPrepared');
  if (!eventFragment) {
    throw new Error('InstallationPrepared event not found in ABI');
  }
  const topicHash = eventFragment.topicHash;

  // Determine toBlock
  let toBlock: number;
  if (cfg.toBlock === 'latest' || cfg.toBlock === undefined) {
    toBlock = await provider.getBlockNumber();
    console.log(`📍 Latest block: ${toBlock}`);
  } else {
    toBlock = cfg.toBlock;
  }

  const chunkSize = cfg.chunkSize || 1000;
  const totalBlocks = toBlock - cfg.fromBlock + 1;
  const estimatedChunks = Math.ceil(totalBlocks / chunkSize);
  console.log(`📦 Chunk size: ${chunkSize} blocks`);
  console.log(`📊 Total blocks to scan: ${totalBlocks.toLocaleString()} (~${estimatedChunks} chunks)\n`);

  let totalLogs = 0;
  let processed = 0;
  let updated = 0;
  let inserted = 0;
  let currentChunk = 0;

  console.log('🔍 Fetching InstallationPrepared events in chunks...\n');

  // Fetch logs in chunks
  for (let from = cfg.fromBlock; from <= toBlock; from += chunkSize) {
    const to = Math.min(from + chunkSize - 1, toBlock);
    currentChunk++;
    
    const progress = ((currentChunk / estimatedChunks) * 100).toFixed(1);
    console.log(`   [${currentChunk}/${estimatedChunks}] (${progress}%) Fetching blocks ${from.toLocaleString()} → ${to.toLocaleString()}...`);

    try {
      const logs = await provider.getLogs({
        address: cfg.pspAddress,
        topics: [topicHash],
        fromBlock: from,
        toBlock: to,
      });

      if (logs.length > 0) {
        console.log(`   ✅ Found ${logs.length} events in this chunk`);
        totalLogs += logs.length;

        for (const log of logs) {
          const parsed = iface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });

          if (!parsed) continue;

          const { dao, preparedSetupId, pluginSetupRepo, versionTag, data: setupData, plugin, helpers } = parsed.args;

          // Only process the specific plugin we care about
          if (plugin.toLowerCase() !== cfg.pluginAddress.toLowerCase()) {
            continue;
          }

          processed++;

          console.log(`\n   📋 Processing event #${processed}`);
          console.log(`      Block: ${log.blockNumber}`);
          console.log(`      Tx: ${log.transactionHash}`);
          console.log(`      DAO: ${dao}`);
          console.log(`      Plugin: ${plugin}`);
          console.log(`      Helpers (${helpers.length}): ${helpers.join(', ')}`);

          const block = await provider.getBlock(log.blockNumber);

          if (!block) {
            console.log('      ⚠️  Could not fetch block details, skipping');
            continue;
          }

          const versionTagBigInt = BigInt(versionTag.toString());
          const release = Number((versionTagBigInt >> BigInt(128)) & BigInt('0xFFFFFFFFFFFFFFFF'));
          const build = Number(versionTagBigInt & BigInt('0xFFFFFFFFFFFFFFFF'));

          const doc = {
            network: cfg.network,
            event: 'InstallationPrepared',
            blockNumber: log.blockNumber,
            blockTimestamp: Number(block.timestamp),
            transactionHash: log.transactionHash,
            logIndex: log.index,
            daoAddress: dao.toLowerCase(),
            pluginAddress: plugin.toLowerCase(),
            pluginSetupRepo: pluginSetupRepo.toLowerCase(),
            preparedSetupId,
            versionTag: { release, build },
            data: setupData,
            helpers: helpers.map((h: string) => h.toLowerCase()),
            sender: parsed.args.sender.toLowerCase(),
          };

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
            console.log('      ✅ Inserted new document');
          } else if (result.modifiedCount > 0) {
            updated++;
            console.log('      ✅ Updated existing document');
          } else {
            console.log('      ℹ️  Document already up-to-date');
          }
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error fetching blocks ${from}-${to}:`, error.message);
      console.log('   ⏭️  Continuing with next chunk...\n');
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('📊 Summary:');
  console.log(`   Blocks scanned: ${totalBlocks.toLocaleString()}`);
  console.log(`   Total events found: ${totalLogs}`);
  console.log(`   Matching plugin: ${processed}`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

// Parse CLI args (optional: yarn ts-node script.ts --from 54363000 --to 54365000)
const args = process.argv.slice(2);
const fromBlockArg = args.find(arg => arg.startsWith('--from='))?.split('=')[1];
const toBlockArg = args.find(arg => arg.startsWith('--to='))?.split('=')[1];

const HARMONY_MAINNET_CONFIG: BackfillConfig = {
  network: 'harmony-mainnet',
  rpcUrl: 'https://api.harmony.one',
  pspAddress: '0xac1b0f953Ca517F4aB21Cc3E2cdb95b186DBF80D',
  pluginAddress: '0x48D6E7Dc4A289417D6878119092d2Bb040162995',
  fromBlock: fromBlockArg ? parseInt(fromBlockArg) : 83_363_000, // Closer to actual block
  toBlock: toBlockArg ? parseInt(toBlockArg) : 83_365_000, // Limit scan to ~2k blocks (faster)
  chunkSize: 1000,
};

backfillPluginHelpers(HARMONY_MAINNET_CONFIG).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});