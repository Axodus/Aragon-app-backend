const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function manuallyIndexProposal() {
  const HARMONY_RPC = process.env.NODES_HARMONY_MAINNET || 'https://api.harmony.one';
  const provider = new ethers.JsonRpcProvider(HARMONY_RPC);

  const txHash = '0xe45596c3b23519b8afea0d6381f697a2273b8200bc70c827885913bef80a5bf4';
  const pluginAddress = '0x4d83E8fBaB950a9df568C8baa7382d97a6c0Cdf8';
  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783';

  console.log('🔧 Manually Indexing Harmony Delegation Proposal\n');

  try {
    // 1. Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      console.log('❌ Transaction not found');
      return;
    }

    // 2. Find ProposalCreated event
    const proposalCreatedTopic = ethers.id('ProposalCreated(uint256,bytes32,uint64,uint64,uint64)');
    const proposalEvent = receipt.logs.find(log => 
      log.address.toLowerCase() === pluginAddress.toLowerCase() &&
      log.topics[0] === proposalCreatedTopic
    );

    if (!proposalEvent) {
      console.log('❌ ProposalCreated event not found in transaction');
      return;
    }

    // 3. Parse event
    const iface = new ethers.Interface([
      'event ProposalCreated(uint256 indexed proposalId, bytes32 indexed metadata, uint64 startDate, uint64 endDate, uint64 snapshotBlock)'
    ]);
    const parsed = iface.parseLog(proposalEvent);
    
    console.log('📝 Parsed Event:');
    console.log(`   Proposal ID: ${parsed.args.proposalId}`);
    console.log(`   Metadata Hash: ${parsed.args.metadata}`);
    console.log(`   Start: ${new Date(Number(parsed.args.startDate) * 1000).toISOString()}`);
    console.log(`   End: ${new Date(Number(parsed.args.endDate) * 1000).toISOString()}`);
    console.log(`   Snapshot Block: ${parsed.args.snapshotBlock}`);
    console.log('');

    // 4. Get transaction details
    const tx = await provider.getTransaction(txHash);
    const block = await provider.getBlock(receipt.blockNumber);
    
    // 5. Connect to MongoDB
    const uri = 'mongodb://mongo1:27017,mongo2:27018,mongo3:27019/?replicaSet=rs0';
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('aragon_mainnet');

    // 6. Get plugin info
    const pluginsCollection = db.collection('plugins');
    const plugin = await pluginsCollection.findOne({
      plugin: pluginAddress.toLowerCase()
    });

    if (!plugin) {
      console.log('❌ Plugin not found in database');
      await client.close();
      return;
    }

    console.log('✅ Plugin found:', plugin.interfaceType);
    console.log('');

    // 7. Create proposal document
    const proposalId = parsed.args.proposalId.toString();
    const metadataHash = parsed.args.metadata;
    
    const proposalDocument = {
      id: `${pluginAddress.toLowerCase()}_${proposalId}`,
      network: 'harmony-mainnet',
      blockNumber: receipt.blockNumber,
      blockTimestamp: block.timestamp,
      transactionHash: txHash.toLowerCase(),
      transactionIndex: receipt.transactionIndex,
      logIndex: proposalEvent.index,
      
      daoAddress: daoAddress.toLowerCase(),
      pluginAddress: pluginAddress.toLowerCase(),
      pluginSubdomain: plugin.subdomain || null,
      
      proposalId: proposalId,
      proposalIndex: proposalId,
      incrementalId: Number(proposalId),
      
      title: `Harmony Delegation Proposal #${proposalId}`,
      summary: `Metadata hash: ${metadataHash}`,
      description: '',
      
      metadata: {
        title: `Harmony Delegation Proposal #${proposalId}`,
        summary: `Metadata hash: ${metadataHash}`,
        description: '',
        resources: [],
        media: { header: null, logo: null }
      },
      
      metadataUri: metadataHash,
      
      creatorAddress: tx.from.toLowerCase(),
      
      startDate: Number(parsed.args.startDate),
      endDate: Number(parsed.args.endDate),
      
      snapshotBlock: Number(parsed.args.snapshotBlock),
      
      rawActions: [],
      actions: [],
      allowFailureMap: 0,
      
      executed: {
        status: false,
        transactionHash: null,
        blockNumber: null,
        blockTimestamp: null
      },
      
      isSubProposal: false,
      decoding: false,
      
      settings: null,
      
      createdAt: new Date(block.timestamp * 1000),
      updatedAt: new Date()
    };

    // 8. Check if already exists
    const proposalsCollection = db.collection('proposals');
    const existing = await proposalsCollection.findOne({
      pluginAddress: pluginAddress.toLowerCase(),
      proposalId: proposalId
    });

    if (existing) {
      console.log('⚠️  Proposal already exists in database!');
      console.log(`   ID: ${existing._id}`);
      console.log(`   Title: ${existing.metadata?.title || existing.title}`);
      await client.close();
      return;
    }

    // 9. Insert proposal
    console.log('💾 Inserting proposal into database...\n');
    const result = await proposalsCollection.insertOne(proposalDocument);
    
    console.log('✅ Proposal inserted successfully!');
    console.log(`   MongoDB _id: ${result.insertedId}`);
    console.log(`   Proposal ID: ${proposalId}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log('');

    // 10. Verify
    const verify = await proposalsCollection.findOne({ _id: result.insertedId });
    console.log('🔍 Verification:');
    console.log(`   Title: ${verify.title}`);
    console.log(`   Creator: ${verify.creatorAddress}`);
    console.log(`   DAO: ${verify.daoAddress}`);
    console.log(`   Plugin: ${verify.pluginAddress}`);
    console.log('');
    console.log('✅ The proposal should now appear in the UI!');

    await client.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

manuallyIndexProposal().catch(console.error);
