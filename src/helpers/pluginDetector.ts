import { keccak256, toUtf8Bytes, ZeroAddress } from 'ethers'
import { VotingBodyBrandIdentity, type IPluginInfo, IPluginInterfaceType, type NetworksEnum } from '@types'
import ProxyContractHelper from '@helpers/proxyContract'
import ProviderModule from '@modules/provider'
import logger from '@logger'
import utils from '@helpers/utils'

const llo = logger.logMeta.bind(null, { service: 'helper:PluginDetector' })

const PluginDetector = {
  SPP_FUNCTIONS: ['getStages(uint256)'],
  TOKEN_VOTING_FUNCTIONS: ['getVotingToken()', 'totalVotingPower(uint256)'],
  NATIVE_TOKEN_VOTING_FUNCTIONS: ['setProposalSnapshot(uint256,bytes32,uint256)', 'getProposalSnapshot(uint256)'],
  HARMONY_VOTING_FUNCTIONS: [
    'setMerkleRoot(uint256,bytes32,uint256)',
    'submitVotingPower(uint256,address,uint256,bytes32[])',
    'getProposal(uint256)',
  ],
  // Delegation voting extends HarmonyVotingBase with validator/process discriminator getters.
  HARMONY_DELEGATION_VOTING_FUNCTIONS: [
    'setMerkleRoot(uint256,bytes32,uint256)',
    'submitVotingPower(uint256,address,uint256,bytes32[])',
    'getProposal(uint256)',
    'validatorAddress()',
    'processKey()',
  ],
  MULTISIG_FUNCTIONS: ['isMember(address)', 'isListed(address)', 'multisigSettings()'],
  ADMIN_FUNCTIONS: ['isMember(address)'],
  GAUGE_VOTER_FUNCTIONS: [
    'createGauge(address,string)',
    'deactivateGauge(address)',
    'activateGauge(address)',
    'updateGaugeMetadata(address,string)',
    'votingActive()',
    'epochStart()',
    'epochVoteStart()',
    'epochVoteEnd()',
  ],
  HAS_TARGET: ['getTargetConfig()'],
  SAFE_WALLET: 'masterCopy()',
  LOCK_TO_VOTE_FUNCTIONS: [
    'usedVotingPower(uint256,address)',
    'currentTokenSupply()',
    'clearVote(uint256,address)',
    'lockManager()',
  ],
  CAPITAL_DISTRIBUTION_FUNCTIONS: [
    'getCampaign(uint256)',
    'getCampaignStrategyId(uint256)',
    'getCampaignPayout(uint256,address,bytes)',
  ],

  _generateFunctionHash(functionSignature: string): string {
    return keccak256(toUtf8Bytes(functionSignature)).slice(0, 10)
  },

  _bytecodeHasFunction(bytecode: string, signature: string): boolean {
    return bytecode.includes(PluginDetector._generateFunctionHash(signature).replace('0x', ''))
  },

  _bytecodeHasFunctions(bytecode: string, functions: string[]): boolean {
    return functions.every(signature => PluginDetector._bytecodeHasFunction(bytecode, signature))
  },

  _detectTypeFromBytecode(bytecode: string): IPluginInterfaceType {
    const typeRules: Array<{ functions: string[]; type: IPluginInterfaceType }> = [
      { functions: PluginDetector.LOCK_TO_VOTE_FUNCTIONS, type: IPluginInterfaceType.lockToVote },
      // Must be checked before the generic HarmonyVotingBase match.
      { functions: PluginDetector.HARMONY_DELEGATION_VOTING_FUNCTIONS, type: IPluginInterfaceType.harmonyDelegationVoting },
      // Default HarmonyVotingBase match to HIP voting to avoid UI registry mismatches.
      { functions: PluginDetector.HARMONY_VOTING_FUNCTIONS, type: IPluginInterfaceType.harmonyHipVoting },
      { functions: PluginDetector.NATIVE_TOKEN_VOTING_FUNCTIONS, type: IPluginInterfaceType.nativeTokenVoting },
      { functions: PluginDetector.TOKEN_VOTING_FUNCTIONS, type: IPluginInterfaceType.tokenVoting },
      { functions: PluginDetector.SPP_FUNCTIONS, type: IPluginInterfaceType.spp },
      { functions: PluginDetector.MULTISIG_FUNCTIONS, type: IPluginInterfaceType.multisig },
      { functions: PluginDetector.CAPITAL_DISTRIBUTION_FUNCTIONS, type: IPluginInterfaceType.capitalDistributor },
      { functions: PluginDetector.ADMIN_FUNCTIONS, type: IPluginInterfaceType.admin },
      { functions: PluginDetector.GAUGE_VOTER_FUNCTIONS, type: IPluginInterfaceType.gauge },
    ]

    for (const rule of typeRules) {
      if (PluginDetector._bytecodeHasFunctions(bytecode, rule.functions)) {
        return rule.type
      }
    }

    return IPluginInterfaceType.unknown
  },

  _createEmptyPluginInfo(implementationAddress?: string | null): IPluginInfo {
    return {
      proxy: Boolean(implementationAddress),
      implementationAddress: implementationAddress ?? null,
      type: IPluginInterfaceType.unknown,
      hasTarget: false,
    }
  },

  _getCodeAddress(address: string, contractAddress: string): string {
    return contractAddress === utils.zeroAddress ? address : contractAddress
  },

  _isEmptyBytecode(bytecode?: string): boolean {
    return !bytecode || bytecode === '0x'
  },

  async detectPluginType(address: string, network: NetworksEnum): Promise<IPluginInfo> {
    const provider = ProviderModule.getAnyRpcProvider(network)
    if (address === ZeroAddress) return PluginDetector._createEmptyPluginInfo(null)
    const implementationAddress = await ProxyContractHelper.getImplementationAddress(address, network)
    const contractAddress = implementationAddress ?? address
    const pluginDetails = PluginDetector._createEmptyPluginInfo(implementationAddress)

    try {
      const codeAddress = PluginDetector._getCodeAddress(address, contractAddress)
      const bytecode = await provider.getCode(codeAddress)
      if (PluginDetector._isEmptyBytecode(bytecode)) return pluginDetails

      return {
        ...pluginDetails,
        type: PluginDetector._detectTypeFromBytecode(bytecode),
        hasTarget: PluginDetector._bytecodeHasFunctions(bytecode, PluginDetector.HAS_TARGET),
      }
    } catch (error) {
      logger.error('Error detecting plugin type', llo({ address, error }))
      return pluginDetails
    }
  },

  async detectAddressType(address: string, network: NetworksEnum): Promise<VotingBodyBrandIdentity> {
    try {
      if (address === ZeroAddress) {
        return VotingBodyBrandIdentity.EOA
      }

      const provider = ProviderModule.getAnyRpcProvider(network)
      const code = await provider.getCode(address)

      if (!code || code === '0x') {
        return VotingBodyBrandIdentity.EOA
      }

      const signature = PluginDetector._generateFunctionHash(PluginDetector.SAFE_WALLET)
      if (code.includes(signature.replace('0x', ''))) {
        return VotingBodyBrandIdentity.SAFE
      }

      return VotingBodyBrandIdentity.OTHER
    } catch (error: any) {
      return VotingBodyBrandIdentity.OTHER
    }
  },
}

export default PluginDetector
