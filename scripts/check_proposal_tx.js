const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkProposalTransaction() {
  const HARMONY_RPC = process.env.NODES_HARMONY_MAINNET || 'https://api.harmony.one';
  const provider = new ethers.JsonRpcProvider(HARMONY_RPC);

  const txHash = '0xe45596c3b23519b8afea0d6381f697a2273b8200bc70c827885913bef80a5bf4';
  const pluginAddress = '0x4d83E8fBaB950a9df568C8baa7382d97a6c0Cdf8';

  console.log('🔍 Checking Proposal Transaction\n');
  console.log(`TX Hash: ${txHash}\n`);

  try {
    // Get transaction receipt
    console.log('📦 Fetching transaction receipt...\n');
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      console.log('❌ Transaction not found or not confirmed yet');
      return;
    }

    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   From: ${receipt.from}`);
    console.log(`   To: ${receipt.to}`);
    console.log('');

    // Check for ProposalCreated event
    console.log('📝 Looking for ProposalCreated event...\n');
    
    const proposalCreatedTopic = ethers.id('ProposalCreated(uint256,address,uint64,uint64,bytes,tuple[],uint256)');
    
    const proposalEvents = receipt.logs.filter(log => 
      log.address.toLowerCase() === pluginAddress.toLowerCase() &&
      log.topics[0] === proposalCreatedTopic
    );

    if (proposalEvents.length === 0) {
      console.log('❌ No ProposalCreated events found in this transaction!');
      console.log('   This might not be a proposal creation transaction.');
      console.log('');
      console.log('All events in transaction:');
      receipt.logs.forEach((log, i) => {
        console.log(`   ${i + 1}. Address: ${log.address}`);
        console.log(`      Topic0: ${log.topics[0]}`);
      });
      return;
    }

    console.log(`✅ Found ${proposalEvents.length} ProposalCreated event(s)!\n`);

    const iface = new ethers.Interface([
      'event ProposalCreated(uint256 indexed proposalId, address indexed creator, uint64 startDate, uint64 endDate, bytes metadata, tuple(address to, uint256 value, bytes data)[] actions, uint256 allowFailureMap)'
    ]);

    for (const log of proposalEvents) {
      const parsed = iface.parseLog(log);
      
      console.log(`📝 Proposal Details:`);
      console.log(`   Proposal ID: ${parsed.args.proposalId}`);
      console.log(`   Creator: ${parsed.args.creator}`);
      console.log(`   Start Date: ${new Date(Number(parsed.args.startDate) * 1000).toISOString()}`);
      console.log(`   End Date: ${new Date(Number(parsed.args.endDate) * 1000).toISOString()}`);
      console.log(`   Actions: ${parsed.args.actions.length}`);
      
      // Try to decode metadata
      try {
        const metadataBytes = parsed.args.metadata;
        if (metadataBytes && metadataBytes !== '0x') {
          // Try as UTF8 string (IPFS CID)
          const metadataStr = ethers.toUtf8String(metadataBytes);
          console.log(`   Metadata: ${metadataStr}`);
        } else {
          console.log(`   Metadata: (empty)`);
        }
      } catch (e) {
        console.log(`   Metadata: (binary data - ${parsed.args.metadata.length} bytes)`);
      }
      console.log('');
    }

    // Check database
    console.log('\n📊 Checking Database...\n');
    const uri = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0';
    const client = new MongoClient(uri);

    await client.connect();
    const db = client.db('aragon_mainnet');
    const proposalsCollection = db.collection('proposals');

    const proposalEvent = proposalEvents[0];
    const parsed = iface.parseLog(proposalEvent);
    const proposalId = parsed.args.proposalId.toString();

    const dbProposal = await proposalsCollection.findOne({
      pluginAddress: pluginAddress.toLowerCase(),
      proposalId: proposalId
    });

    if (dbProposal) {
      console.log('✅ Proposal FOUND in database!');
      console.log(`   MongoDB _id: ${dbProposal._id}`);
      console.log(`   Title: ${dbProposal.metadata?.title || 'N/A'}`);
      console.log(`   Created: ${dbProposal.createdAt}`);
    } else {
      console.log('❌ Proposal NOT in database!');
      console.log('   The indexer has not processed this event yet.');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   1. Check indexer logs: docker logs -f aragon-app-backend-service-aragon-indexer-1');
      console.log('   2. Restart indexer: docker restart aragon-app-backend-service-aragon-indexer-1');
      console.log(`   3. The indexer should process block ${receipt.blockNumber} automatically`);
    }

    await client.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkProposalTransaction().catch(console.error);
