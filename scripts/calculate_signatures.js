const { ethers } = require('ethers');

// Calculate event and function signatures
const harmonyVotingEventSignatures = [
  'ProposalCreated(uint256,bytes32,uint64,uint64,uint64)',
  'MerkleRootSet(uint256,bytes32,uint256)',
  'VoteCast(uint256,address,uint8)',
  'VotingPowerSubmitted(uint256,address,uint256)',
  'ProposalClosed(uint256,bool)',
];

const harmonyVotingFunctionSignatures = [
  'createProposal(bytes32,uint64,uint64,uint64)',
  'castVote(uint256,uint8)',
  'submitVotingPower(uint256,uint256,bytes32[])',
  'closeProposal(uint256)',
  'setMerkleRoot(uint256,bytes32,uint256)',
];

console.log('📝 Harmony Voting Event Signatures:\n');
harmonyVotingEventSignatures.forEach(sig => {
  const topic = ethers.id(sig);
  console.log(`${sig}`);
  console.log(`  Topic: ${topic}\n`);
});

console.log('\n🔧 Harmony Voting Function Selectors:\n');
harmonyVotingFunctionSignatures.forEach(sig => {
  const selector = ethers.id(sig).substring(0, 10);
  console.log(`${sig}`);
  console.log(`  Selector: ${selector}\n`);
});

console.log('\n🎯 Checking observed values:\n');
const observedTopic = '0x7fbc1c2934ab734b9f81e59226a0d0178a6855d85aa5608f93999c4fa1d2f162';
const observedSelector = '0x8d3080b9';

console.log(`Observed Event Topic: ${observedTopic}`);
const matchedEvent = harmonyVotingEventSignatures.find(sig => ethers.id(sig) === observedTopic);
console.log(`Matched: ${matchedEvent || 'NONE'}\n`);

console.log(`Observed Function Selector: ${observedSelector}`);
const matchedFunction = harmonyVotingFunctionSignatures.find(sig => ethers.id(sig).substring(0, 10) === observedSelector);
console.log(`Matched: ${matchedFunction || 'NONE'}\n`);
