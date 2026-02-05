import { type IContractAbi, type ISelectorActionData, type NetworksEnum } from '@types'
import ProxyContract from '@helpers/proxyContract'
import * as ContractNetspecHelper from '@helpers/contractNetspec'
import ProxyWeb3Provider from '@modules/proxyProvider'
import DecodeActions from '@helpers/decodeAction'

export const ContractInfo = {
  getContractInfo: async (network: NetworksEnum, address: string): Promise<IContractAbi | null> => {
    const mainData = await ContractInfo.fetchVerifiedContractData(network, address)
    const implementationAddress = (await ProxyContract.getImplementationAddress(address, network)) || address
    const isProxy = implementationAddress !== address

    const implementationData = isProxy
      ? await ContractInfo.fetchVerifiedContractData(network, implementationAddress)
      : null

    if (!mainData && !implementationData) return null

    const functions = [...(mainData?.functions || []), ...(implementationData?.functions || [])]

    const name = implementationData?.name || mainData?.name || null

    return {
      implementationAddress: isProxy ? implementationAddress : null,
      address,
      network,
      name,
      proxyName: isProxy ? mainData?.name : null,
      functions,
    } satisfies IContractAbi
  },

  fetchVerifiedContractData: async (
    network: NetworksEnum,
    contractAddress: string,
  ): Promise<{ name: string | null; functions: any[] } | null> => {
    const contractDetails = await ProxyWeb3Provider.fetchContractSourceCode({
      network,
      address: contractAddress,
    })

    if (!contractDetails?.length) return null

    const abi = JSON.parse(contractDetails[0].ABI || '[]')
    const hasAbi = Array.isArray(abi) && abi.length > 0
    const hasSourceCode = Boolean(contractDetails[0].SourceCode)

    // Some explorers provide ABI without verified source code (e.g., Harmony getabi).
    // In this scenario we still want to expose write functions, but we can't enrich with NatSpec.
    if (!hasSourceCode && !hasAbi) return null

    const parsed = hasSourceCode
      ? ContractNetspecHelper.parseNetspec(
          contractDetails[0].SourceCode,
          contractDetails[0].ContractName,
          abi,
          contractDetails[0].CompilerVersion,
        )
      : abi

    if (!parsed?.length) return null

    return {
      name: contractDetails[0].ContractName || null,
      functions: ContractInfo.parseContractAbi(parsed),
    }
  },

  parseContractAbi: (abiResult: any[]) => {
    return abiResult
      .filter(
        fn =>
          fn.type === 'function' &&
          fn.stateMutability !== 'view' &&
          fn.stateMutability !== 'pure' &&
          fn.type !== 'constructor',
      )
      .map(fn => ({
        name: fn.name,
        parameters: fn.inputs,
        notice: fn.notice,
        type: fn.type,
        stateMutability: fn.stateMutability,
      }))
  },

  parseSignature: async (signature: string | null, to: string, network: NetworksEnum): Promise<ISelectorActionData> => {
    const decodeAction = new DecodeActions()
    if (!signature) {
      const toInfo = await ProxyWeb3Provider.searchDetailsOfContract({
        address: to,
        network,
      })

      return {
        functionName: 'NativeTransfer',
        contractName: toInfo?.name || 'Unknown',
      }
    }

    return (await decodeAction.parseContractNetspec(
      signature,
      {
        to,
        data: '0x',
        value: undefined,
      },
      network,
    )) as ISelectorActionData
  },
}
