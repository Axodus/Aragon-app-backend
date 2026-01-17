const { ethers } = require('ethers');
require('dotenv').config();

async function analyzeTransaction() {
  const HARMONY_RPC = process.env.NODES_HARMONY_MAINNET || 'https://api.harmony.one';
  const provider = new ethers.JsonRpcProvider(HARMONY_RPC);

  const txHash = '0xe45596c3b23519b8afea0d6381f697a2273b8200bc70c827885913bef80a5bf4';
  const pluginAddress = '0x4d83E8fBaB950a9df568C8baa7382d97a6c0Cdf8';
  
  console.log('🔍 Analyzing Transaction\n');
  console.log(`TX Hash: ${txHash}\n`);

  try {
    // Get transaction
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      console.log('❌ Transaction not found');
      return;
    }

    console.log('📋 Transaction Details:\n');
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Value: ${ethers.formatEther(tx.value)} ONE`);
    console.log(`   Gas Limit: ${tx.gasLimit.toString()}`);
    console.log('');

    // Decode function call
    console.log('🔧 Function Call:\n');
    console.log(`   Data: ${tx.data.substring(0, 10)}... (${tx.data.length} bytes)`);
    
    // Function selectors for Delegation Plugin
    const functionSignatures = {
      '0x0e6a7c7f': 'createProposal(bytes,tuple[],uint256,uint64,uint64,uint8,bool)',
      '0x8c7e4da2': 'createProposal(bytes,tuple[])',
      '0x5d11a1db': 'vote(uint256,uint8,bool)',
      '0x580d747a': 'execute(uint256)',
      '0x3ccfd60b': 'withdraw(address,uint256,string,tuple[])',
    };

    const selector = tx.data.substring(0, 10);
    const functionName = functionSignatures[selector] || 'Unknown function';
    
    console.log(`   Selector: ${selector}`);
    console.log(`   Function: ${functionName}`);
    console.log('');

    if (functionName === 'Unknown function') {
      console.log('⚠️  This is not a standard createProposal call!');
      console.log('   The transaction called an unknown function.');
      console.log('   This might be:');
      console.log('   - A different function on the plugin');
      console.log('   - An initialization or setup call');
      console.log('   - A vote or execute call');
      console.log('');
    }

    // Get receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    console.log('📊 Transaction Result:\n');
    console.log(`   Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Events: ${receipt.logs.length}`);
    console.log('');

    // List all events
    console.log('📝 Events emitted:\n');
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`   ${i + 1}. From: ${log.address}`);
      console.log(`      Topic0: ${log.topics[0]}`);
      console.log(`      Topics: ${log.topics.length}, Data: ${log.data.length} bytes`);
      
      // Check if it's ProposalCreated
      const proposalCreatedTopic = ethers.id('ProposalCreated(uint256,address,uint64,uint64,bytes,tuple[],uint256)');
      if (log.topics[0] === proposalCreatedTopic) {
        console.log(`      ⭐ This is ProposalCreated!`);
      }
      console.log('');
    }

    // Check if this was sent to the right address
    if (tx.to.toLowerCase() !== pluginAddress.toLowerCase()) {
      console.log('⚠️  WARNING: Transaction was not sent to the Delegation Plugin!');
      console.log(`   Expected: ${pluginAddress}`);
      console.log(`   Actual: ${tx.to}`);
      console.log('');
      console.log('   This explains why no ProposalCreated event was emitted.');
      console.log('   The user might have called a different contract.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

analyzeTransaction().catch(console.error);
