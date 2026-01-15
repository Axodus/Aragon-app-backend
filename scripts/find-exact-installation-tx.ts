import { ethers } from 'ethers';

async function findInstallationTransaction() {
  console.log('🔍 Searching for plugin installation transaction...\n');

  const provider = new ethers.JsonRpcProvider('https://api.harmony.one');
  const blockNumber = 83642085;
  const pluginAddress = '0x48D6E7Dc4A289417D6878119092d2Bb040162995';
  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783';

  console.log(`Block: ${blockNumber}`);
  console.log(`Plugin: ${pluginAddress}`);
  console.log(`DAO: ${daoAddress}\n`);

  // Fetch block with transactions
  const block = await provider.getBlock(blockNumber, true);
  
  if (!block) {
    console.error('❌ Block not found');
    return;
  }

  console.log(`📦 Block ${blockNumber} has ${block.transactions.length} transactions\n`);

  // Search through all transactions in the block
  for (const txHash of block.transactions) {
    const tx = await provider.getTransaction(txHash as string);
    const receipt = await provider.getTransactionReceipt(txHash as string);

    if (!tx || !receipt) continue;

    // Check if transaction interacts with plugin or DAO
    const involvedAddresses = [
      tx.to?.toLowerCase(),
      tx.from.toLowerCase(),
      ...receipt.logs.map(log => log.address.toLowerCase()),
    ];

    if (
      involvedAddresses.includes(pluginAddress.toLowerCase()) ||
      involvedAddresses.includes(daoAddress.toLowerCase())
    ) {
      console.log(`\n🎯 Found relevant transaction!`);
      console.log(`   Tx: ${txHash}`);
      console.log(`   From: ${tx.from}`);
      console.log(`   To: ${tx.to}`);
      console.log(`   Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
      console.log(`   Logs: ${receipt.logs.length}`);

      // Print all event signatures from this transaction
      console.log(`\n   📋 Event signatures:`);
      for (const log of receipt.logs) {
        console.log(`      - ${log.topics[0]} (address: ${log.address})`);
      }

      // Check for InstallationPrepared signature
      const installationPreparedTopic = '0xae9ff607ac6d0adcbd7d574e178c80b6d448b0885f1cc990e74729e7941c648f';
      const hasInstallationPrepared = receipt.logs.some(log => log.topics[0] === installationPreparedTopic);

      if (hasInstallationPrepared) {
        console.log(`\n   ✅ Contains InstallationPrepared event!`);
        
        const relevantLog = receipt.logs.find(log => log.topics[0] === installationPreparedTopic);
        if (relevantLog) {
          console.log(`      PSP Address: ${relevantLog.address}`);
          console.log(`      Log Index: ${relevantLog.index}`);
        }
      } else {
        console.log(`\n   ⚠️  No InstallationPrepared event found`);
        console.log(`      This might be a direct installation or different setup flow`);
      }

      return { tx, receipt };
    }
  }

  console.log('\n❌ No relevant transactions found in this block');
}

findInstallationTransaction().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});