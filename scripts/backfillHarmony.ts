#!/usr/bin/env node
/**
 * CLI script to backfill HarmonyVoting events
 * 
 * Usage:
 *   yarn backfill:harmony --network=harmony --plugin=0x123...
 *   yarn backfill:harmony --network=harmony --all
 *   yarn backfill:harmony --network=harmony --plugin=0x123... --from=12345 --to=67890
 */

import { HarmonyBackfillJob } from '../src/jobs/harmonyBackfillJob'
import logger from '../src/logger'
import mongoose from 'mongoose'
import config from '../config'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ModelProxy } from '@dbModels'
import { NetworksEnum } from '@types'

const llo = logger.logMeta.bind(null, { service: 'scripts:HarmonyBackfill' })
let memoryServer: MongoMemoryServer | null = null

interface CliArgs {
  network?: string
  plugin?: string
  all?: boolean
  from?: number
  to?: number | 'latest'
  batch?: number
}

function parseArgs(): CliArgs {
  const args: CliArgs = {}

  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--network=')) {
      args.network = arg.split('=')[1]
    } else if (arg.startsWith('--plugin=')) {
      args.plugin = arg.split('=')[1]
    } else if (arg === '--all') {
      args.all = true
    } else if (arg.startsWith('--from=')) {
      args.from = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--to=')) {
      const to = arg.split('=')[1]
      args.to = to === 'latest' ? 'latest' : parseInt(to)
    } else if (arg.startsWith('--batch=')) {
      args.batch = parseInt(arg.split('=')[1])
    }
  })

  return args
}

async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGO_DB.URI)
    logger.info('Database connected', llo())
  } catch (error) {
    logger.warn('Primary DB connection failed, attempting in-memory fallback', llo({ error }))
    // Fallback to in-memory MongoDB for local runs without Docker
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

async function main() {
  console.log('[BackfillHarmony] Script started')
  const args = parseArgs()
  console.log('[BackfillHarmony] Args parsed:', args)

  if (!args.network) {
    console.error('Error: --network is required')
    console.log('Usage:')
    console.log('  yarn backfill:harmony --network=harmony --plugin=0x123...')
    console.log('  yarn backfill:harmony --network=harmony --all')
    console.log('  yarn backfill:harmony --network=harmony --plugin=0x123... --from=12345 --to=67890')
    process.exit(1)
  }

  if (!Object.values(NetworksEnum).includes(args.network as NetworksEnum)) {
    console.error(`Error: --network must be one of: ${Object.values(NetworksEnum).join(', ')}`)
    process.exit(1)
  }

  const network = args.network as NetworksEnum

  if (!args.plugin && !args.all) {
    console.error('Error: Either --plugin or --all is required')
    process.exit(1)
  }

  try {
    console.log('[BackfillHarmony] Attempting database connection...')
    await connectDatabase()
    console.log('[BackfillHarmony] Database connected successfully')

    console.log('[BackfillHarmony] Registering Mongo models...')
    await ModelProxy.setMongoModels()
    console.log('[BackfillHarmony] Mongo models ready')

    logger.info('HarmonyBackfill CLI - Starting', llo({ args }))

    if (args.all) {
      // Backfill all HarmonyVoting plugins on the network
      await HarmonyBackfillJob.backfillAllPlugins(network)
    } else if (args.plugin) {
      // Backfill specific plugin
      await HarmonyBackfillJob.backfillPlugin({
        pluginAddress: args.plugin,
        network,
        startBlock: args.from,
        endBlock: args.to,
        batchSize: args.batch,
      })
    }

    logger.info('HarmonyBackfill CLI - Completed successfully', llo())
    await disconnectDatabase()
    process.exit(0)
  } catch (error) {
    logger.error('HarmonyBackfill CLI - Fatal error', llo({ error }))
    await disconnectDatabase()
    process.exit(1)
  }
}

main()
