const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkAllPlugins() {
  const HARMONY_RPC = process.env.NODES_HARMONY_MAINNET || 'https://api.harmony.one';
  const provider = new ethers.JsonRpcProvider(HARMONY_RPC);

  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783';
  const pluginSetupProcessor = '0x6300477942944d2501db08cD5b7e37DC6423E77C';

  console.log('🔍 Checking ALL plugins for DAO:', daoAddress);
  console.log('');

  // 1. Database check
  console.log('📊 DATABASE CHECK\n');
  const uri = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('aragon_mainnet');
    
    // Get all plugins for this DAO
    const pluginsCollection = db.collection('plugins');
    const plugins = await pluginsCollection.find({
      dao: daoAddress.toLowerCase()
    }).toArray();

    console.log(`Found ${plugins.length} plugins in database:\n`);
    
    for (const plugin of plugins) {
      console.log(`  📦 Plugin: ${plugin.plugin}`);
      console.log(`     Type: ${plugin.interfaceType}`);
      console.log(`     Installed: Block ${plugin.installedAt}`);
      console.log('');
    }

    // Get all proposals for this DAO
    const proposalsCollection = db.collection('proposals');
    const allProposals = await proposalsCollection.find({
      dao: daoAddress.toLowerCase()
    }).toArray();

    console.log(`Found ${allProposals.length} total proposals in database:\n`);
    
    for (const proposal of allProposals) {
      console.log(`  📝 Proposal ID: ${proposal.proposalId}`);
      console.log(`     Plugin: ${proposal.plugin}`);
      console.log(`     Title: ${proposal.metadata?.title || 'N/A'}`);
      console.log(`     Created: ${proposal.createdAt}`);
      console.log(`     Block: ${proposal.blockNumber}`);
      console.log('');
    }

    await client.close();

    // 2. Blockchain check - find ALL InstallationApplied events
    console.log('\n⛓️  BLOCKCHAIN CHECK - ALL INSTALLED PLUGINS\n');
    
    const currentBlock = await provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}\n`);

    const installationAppliedTopic = ethers.id('InstallationApplied(address,address,bytes32,bytes32)');
    
    // Search last 50k blocks in batches
    const batchSize = 1000;
    const searchDepth = 50000;
    const fromBlock = Math.max(0, currentBlock - searchDepth);
    
    console.log(`Searching InstallationApplied events from block ${fromBlock} to ${currentBlock}...\n`);

    let allInstalls = [];
    
    for (let start = fromBlock; start <= currentBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, currentBlock);
      process.stdout.write(`\rSearching blocks ${start} to ${end}...`);
      
      const batchLogs = await provider.getLogs({
        address: pluginSetupProcessor,
        topics: [installationAppliedTopic],
        fromBlock: start,
        toBlock: end
      });
      
      allInstalls = allInstalls.concat(batchLogs);
    }
    
    console.log(`\n\nFound ${allInstalls.length} total InstallationApplied events\n`);

    // Filter for this DAO
    const iface = new ethers.Interface([
      'event InstallationApplied(address indexed dao, address indexed plugin, bytes32 preparedSetupId, bytes32 appliedSetupId)'
    ]);

    const daoInstalls = allInstalls.filter(log => {
      const parsed = iface.parseLog(log);
      return parsed.args.dao.toLowerCase() === daoAddress.toLowerCase();
    });

    console.log(`Found ${daoInstalls.length} plugins installed for this DAO:\n`);

    const onChainPlugins = [];
    for (const log of daoInstalls) {
      const parsed = iface.parseLog(log);
      const block = await provider.getBlock(log.blockNumber);
      
      console.log(`  📦 Plugin: ${parsed.args.plugin}`);
      console.log(`     Block: ${log.blockNumber}`);
      console.log(`     Date: ${new Date(block.timestamp * 1000).toISOString()}`);
      console.log(`     TX: ${log.transactionHash}`);
      console.log('');
      
      onChainPlugins.push(parsed.args.plugin.toLowerCase());
    }

    // 3. Check for proposals on each on-chain plugin
    console.log('\n⛓️  CHECKING PROPOSALS FOR EACH PLUGIN\n');

    const proposalCreatedTopic = ethers.id('ProposalCreated(uint256,address,uint64,uint64,bytes,tuple[],uint256)');

    for (const pluginAddr of onChainPlugins) {
      console.log(`Checking proposals for plugin ${pluginAddr}...`);
      
      let proposalLogs = [];
      
      for (let start = fromBlock; start <= currentBlock; start += batchSize) {
        const end = Math.min(start + batchSize - 1, currentBlock);
        
        const batchLogs = await provider.getLogs({
          address: pluginAddr,
          topics: [proposalCreatedTopic],
          fromBlock: start,
          toBlock: end
        });
        
        proposalLogs = proposalLogs.concat(batchLogs);
      }
      
      console.log(`  Found ${proposalLogs.length} proposals\n`);
    }

    // 4. Summary
    console.log('\n📋 SUMMARY\n');
    console.log(`Plugins in database: ${plugins.length}`);
    console.log(`Plugins on blockchain: ${daoInstalls.length}`);
    console.log(`Proposals in database: ${allProposals.length}`);
    console.log('');
    
    console.log('Plugin comparison:');
    for (const onChainPlugin of onChainPlugins) {
      const inDb = plugins.some(p => p.plugin.toLowerCase() === onChainPlugin);
      console.log(`  ${onChainPlugin}: ${inDb ? '✅ In DB' : '❌ NOT in DB'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkAllPlugins().catch(console.error);
