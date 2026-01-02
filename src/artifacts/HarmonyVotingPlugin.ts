export const HarmonyVotingPlugin = {
  contractName: 'HarmonyVotingPlugin',
  abi: [
    {
      inputs: [
        { internalType: 'bytes', name: 'metadata', type: 'bytes' },
        { internalType: 'uint64', name: 'startDate', type: 'uint64' },
        { internalType: 'uint64', name: 'endDate', type: 'uint64' },
        { internalType: 'uint256', name: 'snapshotBlock', type: 'uint256' },
      ],
      name: 'createProposal',
      outputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32' },
      ],
      name: 'setMerkleRoot',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { internalType: 'address', name: 'voter', type: 'address' },
        { internalType: 'uint256', name: 'votingPower', type: 'uint256' },
        { internalType: 'bytes32[]', name: 'proof', type: 'bytes32[]' },
      ],
      name: 'submitVotingPower',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
} as const
