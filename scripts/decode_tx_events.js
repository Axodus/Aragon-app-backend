const { ethers } = require('ethers');
require('dotenv').config();

async function decodeTransactionEvents() {
  const HARMONY_RPC = process.env.NODES_HARMONY_MAINNET || 'https://api.harmony.one';
  const provider = new ethers.JsonRpcProvider(HARMONY_RPC);

  const txHash = '0xe45596c3b23519b8afea0d6381f697a2273b8200bc70c827885913bef80a5bf4';
  
  console.log('🔍 Decoding Transaction Events\n');
  console.log(`TX Hash: ${txHash}\n`);

  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log('❌ Transaction not found');
      return;
    }

    console.log(`✅ Transaction in block ${receipt.blockNumber}\n`);

    // Common Aragon/Delegation Plugin events
    const eventSignatures = [
      'ProposalCreated(uint256,address,uint64,uint64,bytes,tuple[],uint256)',
      'VoteCast(uint256,address,uint8,uint256,string)',
      'Voted(uint256,address,uint8,uint256)',
      'ProposalExecuted(uint256)',
      'ProposalCanceled(uint256)',
      'VotingSettingsUpdated(uint8,uint32,uint32,uint64,uint256)',
      'MembershipContractAnnounced(address)',
      'Initialized(uint8)',
    ];

    console.log('All events in transaction:\n');
    
    for (const log of receipt.logs) {
      console.log(`📦 Event from ${log.address}`);
      console.log(`   Topic0: ${log.topics[0]}`);
      
      // Try to match known events
      let matched = false;
      for (const sig of eventSignatures) {
        const topic = ethers.id(sig);
        if (log.topics[0] === topic) {
          console.log(`   ✅ MATCHED: ${sig}`);
          matched = true;
          
          // Try to decode
          try {
            const iface = new ethers.Interface([`event ${sig}`]);
            const parsed = iface.parseLog(log);
            console.log(`   Decoded args:`, parsed.args);
          } catch (e) {
            console.log(`   (Could not decode)`);
          }
          break;
        }
      }
      
      if (!matched) {
        console.log(`   ❓ Unknown event`);
        console.log(`   Topics: ${log.topics.length}`);
        console.log(`   Data: ${log.data.substring(0, 66)}...`);
      }
      
      console.log('');
    }

    // The actual event emitted
    const unknownTopic = '0x7fbc1c2934ab734b9f81e59226a0d0178a6855d85aa5608f93999c4fa1d2f162';
    
    console.log('\n🔍 Searching for event signature...\n');
    console.log(`Topic0: ${unknownTopic}`);
    console.log('');
    
    // Try some other common signatures
    const otherSigs = [
      'Upgraded(address)',
      'RoleGranted(bytes32,address,address)',
      'RoleRevoked(bytes32,address,address)',
      'AdminChanged(address,address)',
      'BeaconUpgraded(address)',
      'Transfer(address,address,uint256)',
      'Approval(address,address,uint256)',
    ];
    
    for (const sig of otherSigs) {
      const topic = ethers.id(sig);
      if (topic === unknownTopic) {
        console.log(`✅ MATCHED: ${sig}`);
        break;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

decodeTransactionEvents().catch(console.error);
