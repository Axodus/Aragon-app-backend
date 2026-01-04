import logger from '@logger'
import config from '@config'
import { NetworksEnum, type HexAddress } from '@types'
import ProviderModule from '@modules/provider'
import HarmonyRpc from '@helpers/harmonyRpc'
import MerkleTreeHelper from '@helpers/merkleTree'
import Web3Helper from '@helpers/web3'
import { Contract, ethers, Interface, Wallet, type Log } from 'ethers'
import { HarmonyVotingPlugin } from '@artifacts/HarmonyVotingPlugin'

const llo = logger.logMeta.bind(null, { service: 'service:indexer:HarmonyVotingFinalizer' })

const blockedByKey = new Map<
  string,
  {
    firstSeenAt: number
    onchainRoot: string
    computedRoot: string
  }
>()

type FinalizerMode = 'validators' | 'delegators'

type FinalizerTarget = {
  network: NetworksEnum
  pluginAddress: HexAddress
  mode: FinalizerMode
  electedOnly?: boolean
  validatorAddress?: HexAddress
  fromBlock?: number
}

function safeJsonParseTargets(value: string): FinalizerTarget[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as FinalizerTarget[]) : []
  } catch {
    return []
  }
}

function normalizeAddress(address: string): string {
  return ethers.getAddress(address).toLowerCase()
}

async function getLatestChainTimestamp(network: NetworksEnum): Promise<number> {
  const provider = ProviderModule.getAnyRpcProvider(network)
  if (!provider) throw new Error(`No RPC provider configured for network ${network}`)
  const latestBlockNumber = await provider.getBlockNumber()
  const block = await provider.getBlock(latestBlockNumber)
  return Number(block?.timestamp ?? 0)
}

async function fetchLogsChunked(params: {
  network: NetworksEnum
  address: HexAddress
  topics: string[]
  fromBlock: number
  toBlock: number
  chunkSize: number
}): Promise<Log[]> {
  const { network, address, topics, fromBlock, toBlock } = params

  let chunkSize = Math.max(50, Math.floor(params.chunkSize))
  const all: Log[] = []

  let current = fromBlock
  while (current <= toBlock) {
    const end = Math.min(toBlock, current + chunkSize - 1)

    const logs = await Web3Helper.getLogs(
      {
        fromBlock: `0x${BigInt(current).toString(16)}`,
        toBlock: `0x${BigInt(end).toString(16)}`,
        topics,
      },
      network,
    )

    if (!logs) {
      if (chunkSize <= 50) {
        throw new Error(`Failed to fetch logs for ${address} on ${network} (range ${current}-${end})`)
      }

      chunkSize = Math.max(50, Math.floor(chunkSize / 2))
      logger.warn('Reducing logs chunk size after failure', llo({ network, address, chunkSize, current, end }))
      continue
    }

    all.push(...(logs as Log[]))
    current = end + 1
  }

  return all
}

async function computeEligibleEntries(params: {
  target: FinalizerTarget
  snapshotBlock: number
}): Promise<{ entries: { address: HexAddress; amount: string }[] }> {
  const { target, snapshotBlock } = params

  if (target.mode === 'validators') {
    const validatorAddresses = target.electedOnly
      ? await HarmonyRpc.getElectedValidatorAddresses(target.network)
      : await HarmonyRpc.getAllValidatorAddresses(target.network)

    const entries: { address: HexAddress; amount: string }[] = []

    for (const validatorAddress of validatorAddresses) {
      const info = await HarmonyRpc.getValidatorInformationByBlockNumber(validatorAddress, snapshotBlock, target.network)
      const raw =
        info?.['total-delegation'] ??
        info?.totalDelegation ??
        info?.total_delegation ??
        info?.['totalDelegation'] ??
        '0'

      const amount = String(raw ?? '0')
      entries.push({ address: validatorAddress, amount })
    }

    return { entries }
  }

  if (!target.validatorAddress) {
    throw new Error('Delegators mode requires validatorAddress in target config')
  }

  const info = await HarmonyRpc.getValidatorInformationByBlockNumber(target.validatorAddress, snapshotBlock, target.network)
  const delegations = Array.isArray(info?.validator?.delegations) ? info.validator.delegations : []

  const entries: { address: HexAddress; amount: string }[] = []

  for (const delegation of delegations) {
    const delegator =
      delegation?.delegator_address ??
      delegation?.delegatorAddress ??
      delegation?.['delegator-address'] ??
      delegation?.delegator

    if (!delegator) continue

    const amount = String(delegation?.amount ?? delegation?.delegatedAmount ?? delegation?.['delegated-amount'] ?? '0')
    entries.push({ address: String(delegator) as HexAddress, amount })
  }

  return { entries }
}

async function getVotersForProposal(params: {
  target: FinalizerTarget
  proposalId: bigint
  latestBlock: number
  logsChunkSize: number
}): Promise<HexAddress[]> {
  const { target, proposalId, latestBlock, logsChunkSize } = params

  const iface = new Interface(HarmonyVotingPlugin.abi as any)
  const voteTopic = iface.getEvent('VoteCast')?.topicHash
  if (!voteTopic) throw new Error('VoteCast topic not found in ABI')

  const fromBlock = Math.max(0, Number(target.fromBlock ?? 0))

  // Filter: topic0=VoteCast, topic1=proposalId (indexed)
  const topic1 = ethers.zeroPadValue(ethers.toBeHex(proposalId), 32)

  const logs = await fetchLogsChunked({
    network: target.network,
    address: target.pluginAddress,
    topics: [voteTopic, topic1],
    fromBlock,
    toBlock: latestBlock,
    chunkSize: logsChunkSize,
  })

  const voters = new Set<string>()
  for (const log of logs) {
    try {
      const decoded = iface.parseLog({ topics: log.topics as string[], data: log.data })
      const voter = decoded?.args?.voter as string
      if (voter) voters.add(normalizeAddress(voter))
    } catch {
      // ignore undecodable logs
    }
  }

  return [...voters].map(a => ethers.getAddress(a) as HexAddress)
}

export const HarmonyVotingFinalizer = {
  start: async () => {
    const cfg = config.SERVICES.ARAGON_INDEXER.HARMONY_VOTING_FINALIZER

    if (!cfg?.ENABLED) return

    const targets = safeJsonParseTargets(cfg.TARGETS_JSON)

    if (!cfg.PRIVATE_KEY) {
      logger.warn('Harmony voting finalizer enabled but missing PRIVATE_KEY', llo({}))
      return
    }

    if (!Array.isArray(targets) || targets.length === 0) {
      logger.warn('Harmony voting finalizer enabled but no targets configured', llo({}))
      return
    }

    for (const target of targets) {
      if (target.network !== NetworksEnum.harmonyMainnet && target.network !== NetworksEnum.harmonyTestnet) {
        logger.warn('Skipping non-Harmony target', llo({ target }))
        continue
      }

      try {
        const provider = ProviderModule.getAnyRpcProvider(target.network)
        if (!provider) {
          logger.warn('Skipping target; missing RPC provider', llo({ target }))
          continue
        }

        const wallet = new Wallet(cfg.PRIVATE_KEY, provider)
        const contract = new Contract(target.pluginAddress, HarmonyVotingPlugin.abi as any, wallet)

        const latestBlock = await provider.getBlockNumber()
        const nowTs = await getLatestChainTimestamp(target.network)

        const proposalCount = (await contract.proposalCount()) as bigint
        if (proposalCount === 0n) continue

        const finalizationPeriod = Number((await contract.FINALIZATION_PERIOD()) as bigint)
        const logsChunkSize = Number(cfg.LOGS_CHUNK_SIZE || 1000)

        const blockOnMerkleMismatch = cfg.BLOCK_ON_MERKLE_MISMATCH !== false
        const revalidateBlocked = cfg.REVALIDATE_BLOCKED === true

        for (let proposalId = 1n; proposalId <= proposalCount; proposalId++) {
          const p = await contract.getProposal(proposalId)

          const endDate = Number(p.endDate as bigint)
          const snapshotBlock = Number(p.snapshotBlock as bigint)
          const closed = Boolean(p.closed)
          const merkleRoot = String(p.merkleRoot)

          if (closed) continue
          if (endDate === 0) continue

          const finalizationEndsAt = endDate + finalizationPeriod

          // Before endDate: nothing to do.
          if (nowTs < endDate) continue

          // After finalization window: try closing (only if root already set).
          if (nowTs >= finalizationEndsAt) {
            if (merkleRoot && merkleRoot !== ethers.ZeroHash) {
              try {
                const tx = await contract.closeProposal(proposalId)
                await tx.wait()
                logger.info('Closed proposal', llo({ target, proposalId: proposalId.toString(), tx: tx.hash }))
              } catch (error: any) {
                logger.debug('Close proposal skipped/failed', llo({ target, proposalId: proposalId.toString(), error }))
              }
            }
            continue
          }

          // Inside finalization window.
          if (snapshotBlock > latestBlock) {
            logger.debug('Snapshot not reached yet, skipping', llo({ target, proposalId: proposalId.toString() }))
            continue
          }

          const blockKey = `${target.network}:${normalizeAddress(target.pluginAddress)}:${proposalId.toString()}`
          const blocked = blockedByKey.get(blockKey)
          if (blocked && !revalidateBlocked) {
            logger.debug('Proposal is blocked; skipping', llo({
              target,
              proposalId: proposalId.toString(),
              onchainRoot: blocked.onchainRoot,
              computedRoot: blocked.computedRoot,
            }))
            continue
          }

          const { entries } = await computeEligibleEntries({ target, snapshotBlock })
          const { merkleRoot: computedRoot, members } = await MerkleTreeHelper.generateTreeWithProofs(entries)

          const totalEligiblePower = entries.reduce((acc, e) => {
            try {
              return acc + BigInt(e.amount || '0')
            } catch {
              return acc
            }
          }, 0n)

          if (merkleRoot && merkleRoot !== ethers.ZeroHash) {
            if (merkleRoot.toLowerCase() !== computedRoot.toLowerCase()) {
              if (blockOnMerkleMismatch) {
                if (!blocked) {
                  blockedByKey.set(blockKey, {
                    firstSeenAt: Date.now(),
                    onchainRoot: merkleRoot,
                    computedRoot,
                  })
                  logger.error('Merkle root mismatch; proposal BLOCKED (use REVALIDATE_BLOCKED to retry)', llo({
                    target,
                    proposalId: proposalId.toString(),
                    onchainRoot: merkleRoot,
                    computedRoot,
                  }))
                } else {
                  logger.debug('Merkle root mismatch; still blocked', llo({
                    target,
                    proposalId: proposalId.toString(),
                    onchainRoot: merkleRoot,
                    computedRoot,
                  }))
                }
              } else {
                logger.warn('Merkle root mismatch; skipping submissions', llo({
                  target,
                  proposalId: proposalId.toString(),
                  onchainRoot: merkleRoot,
                  computedRoot,
                }))
              }
              continue
            }

            // Root matches: if it was blocked before, unblock.
            if (blocked) {
              blockedByKey.delete(blockKey)
              logger.info('Merkle root revalidated; proposal UNBLOCKED', llo({
                target,
                proposalId: proposalId.toString(),
                onchainRoot: merkleRoot,
                computedRoot,
              }))
            }
          } else {
            try {
              const tx = await contract.setMerkleRoot(proposalId, computedRoot, totalEligiblePower)
              await tx.wait()
              logger.info('Set merkle root', llo({ target, proposalId: proposalId.toString(), tx: tx.hash }))
            } catch (error: any) {
              logger.warn('Failed to set merkle root', llo({ target, proposalId: proposalId.toString(), error }))
              continue
            }
          }

          const voters = await getVotersForProposal({
            target,
            proposalId,
            latestBlock,
            logsChunkSize,
          })

          if (voters.length === 0) continue

          const proofByAddress = new Map<string, { votingPower: string; proof: string[] }>()
          for (const m of members) {
            proofByAddress.set(normalizeAddress(m.address), { votingPower: m.amount, proof: m.proof })
          }

          for (const voter of voters) {
            const normalized = normalizeAddress(voter)
            const proofEntry = proofByAddress.get(normalized)
            if (!proofEntry) continue

            const votingPower = proofEntry.votingPower
            if (!votingPower || BigInt(votingPower) === 0n) continue

            const [, powerSubmitted] = (await contract.getVote(proposalId, voter)) as [bigint, boolean]
            if (powerSubmitted) continue

            try {
              const tx = await contract.submitVotingPower(proposalId, voter, votingPower, proofEntry.proof)
              await tx.wait()
              logger.info('Submitted voting power', llo({
                target,
                proposalId: proposalId.toString(),
                voter,
                tx: tx.hash,
              }))
            } catch (error: any) {
              logger.warn('Failed to submit voting power', llo({
                target,
                proposalId: proposalId.toString(),
                voter,
                error: error?.message || error,
              }))
            }
          }

          // Try to close early as oracle once voting ended and root is set.
          try {
            const tx = await contract.oracleCloseProposal(proposalId)
            await tx.wait()
            logger.info('Closed proposal (oracle)', llo({ target, proposalId: proposalId.toString(), tx: tx.hash }))
          } catch (error: any) {
            logger.debug('Oracle close skipped/failed', llo({ target, proposalId: proposalId.toString(), error }))
          }
        }
      } catch (error: any) {
        logger.error('Error running harmony voting finalizer target', llo({ target, error: error?.message || error }))
      }
    }
  },
}

export default HarmonyVotingFinalizer
