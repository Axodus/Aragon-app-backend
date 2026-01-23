#!/usr/bin/env node
/**
 * CLI script to reprocess DAORegistry events for a targeted block range.
 *
 * Examples:
 *   yarn reindex:dao --network=harmony-mainnet --block=83822003
 *   yarn reindex:dao --network=harmony-mainnet --from=83822000 --to=83822100
 *   yarn reindex:dao --network=harmony-mainnet --from=83822000 --events=DAORegistered,MetadataSet
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import logger from '../src/logger'
import config from '../config'
import { ModelProxy } from '@dbModels'
import { BlockchainLogCrawler } from '@modules/crawlers'
import configIndexer from '@indexer/configIndexer'
import ConfigIndexerHelper from '@helpers/configIndexer'
import utils from '@helpers/utils'
import harmonyMainnetContracts from '../config/contracts/harmonyMainnet.json'
import harmonyTestnetContracts from '../config/contracts/harmonyTestnet.json'

const llo = logger.logMeta.bind(null, { service: 'scripts:DaoRegistryReplay' })
const DEFAULT_EVENTS = ['DAORegistered']
let memoryServer: MongoMemoryServer | null = null

interface CliArgs {
  network?: string
  fromBlock?: number
  toBlock?: number | 'latest'
  block?: number
  batchSize?: number
  events?: string[]
  address?: string
}

type ContractsConfig = Record<string, Record<string, { address?: string }>>

const CONTRACTS_BY_NETWORK: Partial<Record<string, ContractsConfig>> = {
  'harmony-mainnet': harmonyMainnetContracts as unknown as ContractsConfig,
  'harmony-testnet': harmonyTestnetContracts as unknown as ContractsConfig,
}

function parseArgs(): CliArgs {
  const args: CliArgs = {}

  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--network=')) {
      args.network = raw.split('=')[1]
    } else if (raw.startsWith('--from=')) {
      const value = Number(raw.split('=')[1])
      if (!Number.isNaN(value)) args.fromBlock = value
    } else if (raw.startsWith('--to=')) {
      const value = raw.split('=')[1]
      if (value === 'latest') {
        args.toBlock = 'latest'
      } else {
        const numeric = Number(value)
        if (!Number.isNaN(numeric)) args.toBlock = numeric
      }
    } else if (raw.startsWith('--block=')) {
      const value = Number(raw.split('=')[1])
      if (!Number.isNaN(value)) args.block = value
    } else if (raw.startsWith('--batch=')) {
      const value = Number(raw.split('=')[1])
      if (!Number.isNaN(value)) args.batchSize = value
    } else if (raw.startsWith('--events=')) {
      args.events = raw
        .split('=')[1]
        .split(',')
        .map(event => event.trim())
        .filter(Boolean)
    } else if (raw.startsWith('--address=')) {
      args.address = raw.split('=')[1].toLowerCase()
    }
  }

  return args
}

function getDaoRegistryAddresses(network: string): string[] {
  const cfg = CONTRACTS_BY_NETWORK[network]
  if (!cfg) return []

  return Object.values(cfg)
    .map(version => version.DAORegistryProxy?.address)
    .filter((address): address is string => typeof address === 'string' && address.length > 0)
    .map(address => address.toLowerCase())
}

function getEventConfigs(requestedEvents?: string[]) {
  const targetNames = (requestedEvents?.length ? requestedEvents : DEFAULT_EVENTS).map(event => event.trim())
  const eventConfigs = configIndexer.filter(cfg => targetNames.includes(cfg.event))

  const missing = targetNames.filter(name => !eventConfigs.find(cfg => cfg.event === name))
  if (missing.length > 0) {
    throw new Error(`Events not found in configIndexer: ${missing.join(', ')}`)
  }

  return eventConfigs
}

function getHarmonyAdaptiveConfig(networkName: string) {
  if (networkName !== 'harmony-mainnet' && networkName !== 'harmony-testnet') return undefined
  return {
    initialBatchDays: 0.02,
    minBatchDays: 0.001,
    maxBatchDays: 1,
  }
}

async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGO_DB.URI)
    logger.info('Database connected', llo())
  } catch (error) {
    logger.warn('Primary DB connection failed, attempting in-memory fallback', llo({ error }))
    memoryServer = await MongoMemoryServer.create()
    const uri = memoryServer.getUri()
    await mongoose.connect(uri)
    logger.info('In-memory MongoDB connected', llo({ uri }))
  }
}

async function disconnectDatabase() {
  try {
    await mongoose.disconnect()
    logger.info('Database disconnected', llo())
  } catch (error) {
    logger.error('Database disconnection failed', llo({ error }))
  } finally {
    if (memoryServer) {
      await memoryServer.stop()
      memoryServer = null
      logger.info('In-memory MongoDB stopped', llo())
    }
  }
}

function resolveBlockRange(args: CliArgs) {
  if (!args.network) {
    throw new Error('Network is required')
  }

  const nodeKey = utils.networkToAragon(args.network)
  const nodeConfig = config.NODES[nodeKey]
  if (!nodeConfig) {
    throw new Error(`Unsupported network: ${args.network}`)
  }

  const defaultFrom = typeof nodeConfig.FROM_BLOCK === 'number' ? nodeConfig.FROM_BLOCK : 0
  const fromBlock = args.block ?? args.fromBlock ?? defaultFrom
  if (typeof fromBlock !== 'number' || Number.isNaN(fromBlock)) {
    throw new Error('Invalid from block. Provide --block or --from.')
  }

  let toBlock: number | 'latest' = 'latest'
  if (typeof args.block === 'number') {
    toBlock = args.block
  } else if (typeof args.toBlock !== 'undefined') {
    toBlock = args.toBlock
  }

  if (toBlock !== 'latest' && toBlock < fromBlock) {
    throw new Error('--to block must be greater than or equal to --from block')
  }

  return { fromBlock, toBlock }
}

async function runReplay(args: CliArgs) {
  if (!args.network) {
    throw new Error('Network is required. Use --network=<network-name>.')
  }

  const events = getEventConfigs(args.events)
  const addresses = (args.address ? [args.address] : getDaoRegistryAddresses(args.network)).map(address => address.toLowerCase())

  if (addresses.length === 0) {
    throw new Error(`No DAORegistry addresses configured for ${args.network}`)
  }

  const { fromBlock, toBlock } = resolveBlockRange(args)
  const logService = `${ConfigIndexerHelper.builders.indexer(args.network)}-dao-replay`

  logger.info('Starting DAORegistry replay', llo({ args: { ...args, fromBlock, toBlock, addresses } }))

  const crawler = new BlockchainLogCrawler({
    network: args.network,
    address: addresses,
    events,
    fromBlock,
    toBlock,
    onlyHistorical: true,
    stopOnError: true,
    logService,
    batchSize: args.batchSize,
    adaptiveConfig: getHarmonyAdaptiveConfig(args.network),
    onError: (error: Error) => logger.error('Crawler error', llo({ error })),
  })

  await crawler.crawl()
  await crawler.end()

  logger.info('DAORegistry replay finished', llo({ fromBlock, toBlock, addresses }))
}

async function main() {
  const args = parseArgs()

  if (!args.network) {
    console.error('Error: --network is required')
    console.log('Usage:')
    console.log('  yarn reindex:dao --network=harmony-mainnet --block=83822003')
    console.log('  yarn reindex:dao --network=harmony-mainnet --from=83822000 --to=83822100')
    process.exit(1)
  }

  try {
    await connectDatabase()
    await ModelProxy.setMongoModels()
    await runReplay(args)
    await disconnectDatabase()
    process.exit(0)
  } catch (error) {
    logger.error('DAORegistry replay failed', llo({ error }))
    await disconnectDatabase()
    process.exit(1)
  }
}

main()
