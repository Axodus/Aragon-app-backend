const { ethers } = require('ethers');
require('dotenv').config();

async function checkInstallationEvents() {
  const HARMONY_RPC = process.env.NODES_HARMONY_MAINNET || 'https://api.harmony.one';
  const provider = new ethers.JsonRpcProvider(HARMONY_RPC);

  const pluginAddress = '0x4d83E8fBaB950a9df568C8baa7382d97a6c0Cdf8';
  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783';
  const pluginSetupProcessor = '0x6300477942944d2501db08cD5b7e37DC6423E77C';

  console.log('🔍 Searching for InstallationApplied events...');
  console.log(`   Plugin: ${pluginAddress}`);
  console.log(`   DAO: ${daoAddress}`);
  console.log(`   PSP: ${pluginSetupProcessor}\n`);

  // Get current block
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}\n`);

  // InstallationApplied event signature
  const installationAppliedTopic = ethers.id('InstallationApplied(address,address,bytes32,bytes32)');
  
  // Harmony RPC limits queries to ~1000 blocks, so we'll search in batches
  const batchSize = 1000;
  const searchDepth = 50000; // Search last 50k blocks
  const fromBlock = Math.max(0, currentBlock - searchDepth);
  
  console.log(`Searching from block ${fromBlock} to ${currentBlock} in batches of ${batchSize}...`);

  try {
    let allLogs = [];
    
    // Search in batches
    for (let start = fromBlock; start <= currentBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, currentBlock);
      process.stdout.write(`\rSearching blocks ${start} to ${end}...`);
      
      const batchLogs = await provider.getLogs({
        address: pluginSetupProcessor,
        topics: [installationAppliedTopic],
        fromBlock: start,
        toBlock: end
      });
      
      allLogs = allLogs.concat(batchLogs);
    }
    
    console.log(`\n\nFound ${allLogs.length} InstallationApplied events total\n`);

    // Filter for our DAO
    const relevantLogs = allLogs.filter(log => {
      // Parse the event
      const iface = new ethers.Interface([
        'event InstallationApplied(address indexed dao, address indexed plugin, bytes32 preparedSetupId, bytes32 appliedSetupId)'
      ]);
      const parsed = iface.parseLog(log);
      return parsed.args.dao.toLowerCase() === daoAddress.toLowerCase();
    });

    console.log(`Found ${relevantLogs.length} InstallationApplied events for this DAO:\n`);

    for (const log of relevantLogs) {
      const iface = new ethers.Interface([
        'event InstallationApplied(address indexed dao, address indexed plugin, bytes32 preparedSetupId, bytes32 appliedSetupId)'
      ]);
      const parsed = iface.parseLog(log);
      const block = await provider.getBlock(log.blockNumber);
      
      console.log(`📦 Block: ${log.blockNumber}`);
      console.log(`   Date: ${new Date(block.timestamp * 1000).toISOString()}`);
      console.log(`   Plugin: ${parsed.args.plugin}`);
      console.log(`   TX: ${log.transactionHash}`);
      console.log(`   DAO: ${parsed.args.dao}`);
      
      if (parsed.args.plugin.toLowerCase() === pluginAddress.toLowerCase()) {
        console.log(`   ⭐ THIS IS THE DELEGATION PLUGIN!`);
      }
      console.log('');
    }

    // Check if we found our plugin
    const foundOurPlugin = relevantLogs.some(log => {
      const iface = new ethers.Interface([
        'event InstallationApplied(address indexed dao, address indexed plugin, bytes32 preparedSetupId, bytes32 appliedSetupId)'
      ]);
      const parsed = iface.parseLog(log);
      return parsed.args.plugin.toLowerCase() === pluginAddress.toLowerCase();
    });

    if (!foundOurPlugin) {
      console.log('⚠️  Delegation plugin installation event NOT FOUND in the last 50k blocks');
      console.log('    This could mean:');
      console.log('    1. The plugin was installed more than 50k blocks ago');
      console.log('    2. The plugin was never installed');
      console.log('    3. The plugin address is incorrect\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInstallationEvents().catch(console.error);
