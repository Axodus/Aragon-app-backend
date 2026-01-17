const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkProposals() {
  const HARMONY_RPC = process.env.NODES_HARMONY_MAINNET || 'https://api.harmony.one';
  const provider = new ethers.JsonRpcProvider(HARMONY_RPC);

  const pluginAddress = '0x4d83E8fBaB950a9df568C8baa7382d97a6c0Cdf8';
  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783';

  console.log('🔍 Checking Delegation Plugin Proposals\n');
  console.log(`Plugin: ${pluginAddress}`);
  console.log(`DAO: ${daoAddress}\n`);

  // 1. Check database
  console.log('📊 DATABASE CHECK\n');
  const uri = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('aragon_mainnet');
    
    // Check plugin
    const pluginsCollection = db.collection('plugins');
    const plugin = await pluginsCollection.findOne({
      dao: daoAddress.toLowerCase(),
      plugin: pluginAddress.toLowerCase()
    });

    console.log('Plugin in DB:', plugin ? '✅ FOUND' : '❌ NOT FOUND');
    if (plugin) {
      console.log('  Interface Type:', plugin.interfaceType);
      console.log('  Installed At Block:', plugin.installedAt);
    }
    console.log('');

    // Check proposals
    const proposalsCollection = db.collection('proposals');
    const proposals = await proposalsCollection.find({
      plugin: pluginAddress.toLowerCase()
    }).toArray();

    console.log(`Proposals in DB: ${proposals.length}`);
    if (proposals.length > 0) {
      proposals.forEach((p, i) => {
        console.log(`\n  Proposal ${i + 1}:`);
        console.log(`    ID: ${p.proposalId}`);
        console.log(`    Created: ${p.createdAt}`);
        console.log(`    Block: ${p.blockNumber}`);
        console.log(`    Title: ${p.metadata?.title || 'N/A'}`);
      });
    }
    console.log('\n');

    await client.close();

    // 2. Check blockchain
    console.log('⛓️  BLOCKCHAIN CHECK\n');
    
    const currentBlock = await provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    
    // ProposalCreated event signature
    const proposalCreatedTopic = ethers.id('ProposalCreated(uint256,address,uint64,uint64,bytes,tuple[],uint256)');
    
    // Search from plugin installation block
    const installBlock = 83822003;
    const searchFrom = installBlock;
    
    console.log(`Searching from block ${searchFrom} to ${currentBlock}...\n`);

    const batchSize = 1000;
    let allLogs = [];
    
    for (let start = searchFrom; start <= currentBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, currentBlock);
      process.stdout.write(`\rSearching blocks ${start} to ${end}...`);
      
      const batchLogs = await provider.getLogs({
        address: pluginAddress,
        topics: [proposalCreatedTopic],
        fromBlock: start,
        toBlock: end
      });
      
      allLogs = allLogs.concat(batchLogs);
    }
    
    console.log(`\n\nFound ${allLogs.length} ProposalCreated events on-chain\n`);

    if (allLogs.length > 0) {
      const iface = new ethers.Interface([
        'event ProposalCreated(uint256 indexed proposalId, address indexed creator, uint64 startDate, uint64 endDate, bytes metadata, tuple(address to, uint256 value, bytes data)[] actions, uint256 allowFailureMap)'
      ]);

      for (const log of allLogs) {
        const parsed = iface.parseLog(log);
        const block = await provider.getBlock(log.blockNumber);
        
        console.log(`📝 Proposal ${parsed.args.proposalId}`);
        console.log(`   Block: ${log.blockNumber}`);
        console.log(`   Date: ${new Date(block.timestamp * 1000).toISOString()}`);
        console.log(`   Creator: ${parsed.args.creator}`);
        console.log(`   TX: ${log.transactionHash}`);
        console.log(`   Start: ${new Date(Number(parsed.args.startDate) * 1000).toISOString()}`);
        console.log(`   End: ${new Date(Number(parsed.args.endDate) * 1000).toISOString()}`);
        
        // Try to decode metadata
        try {
          const metadataBytes = parsed.args.metadata;
          if (metadataBytes && metadataBytes !== '0x') {
            const metadataStr = ethers.toUtf8String(metadataBytes);
            console.log(`   Metadata: ${metadataStr.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`   Metadata: (binary data)`);
        }
        console.log('');
      }
    }

    // 3. Summary
    console.log('\n📋 SUMMARY\n');
    console.log(`✅ Plugin in database: ${plugin ? 'YES' : 'NO'}`);
    console.log(`✅ Proposals in database: ${proposals.length}`);
    console.log(`✅ Proposals on blockchain: ${allLogs.length}`);
    
    if (allLogs.length > 0 && proposals.length === 0) {
      console.log('\n⚠️  ISSUE DETECTED: Proposals exist on-chain but NOT in database!');
      console.log('    The indexer is not processing ProposalCreated events.');
      console.log('    Possible causes:');
      console.log('    1. Plugin was not properly registered');
      console.log('    2. Indexer needs to be restarted');
      console.log('    3. Indexer is not running or has errors');
    } else if (allLogs.length === 0) {
      console.log('\n⚠️  No proposals have been created on-chain yet.');
    } else if (allLogs.length === proposals.length) {
      console.log('\n✅ All on-chain proposals are indexed!');
      console.log('    If not showing in UI, check frontend query/filters.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkProposals().catch(console.error);
