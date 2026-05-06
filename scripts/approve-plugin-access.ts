import mongoose from 'mongoose'
import config from '@config'

const REQUIRED_ARGS = ['dao', 'network', 'pluginSlug', 'approvedBy'] as const

type RequiredArg = (typeof REQUIRED_ARGS)[number]

type ArgsMap = Record<string, string>

const parseArgs = (argv: string[]): ArgsMap => {
  return argv.reduce<ArgsMap>((acc, arg) => {
    if (!arg.startsWith('--')) return acc
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    if (!key || rest.length === 0) return acc
    acc[key] = rest.join('=')
    return acc
  }, {})
}

const validateArgs: (args: ArgsMap) => asserts args is ArgsMap & Record<RequiredArg, string> = (args: ArgsMap): asserts args is ArgsMap & Record<RequiredArg, string> => {
  const missing = REQUIRED_ARGS.filter(key => !args[key])
  if (missing.length > 0) {
    throw new Error(`Missing required args: ${missing.map(arg => `--${arg}=`).join(', ')}`)
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.help === 'true' || args.help === '1') {
    console.log('Usage:')
    console.log(
      '  yarn plugin:approve --dao=0xDAO --network=harmony-mainnet --pluginSlug=harmony-hip --approvedBy=0xADMIN --reason="optional"',
    )
    process.exit(0)
  }

  validateArgs(args)

  const daoAddress = args.dao.toLowerCase()
  const network = args.network
  const pluginSlug = args.pluginSlug.toLowerCase()
  const approvedBy = args.approvedBy.toLowerCase()
  const reason = args.reason

  const mongoUri = config.MONGO_DB.URI
  if (!mongoUri) {
    throw new Error('Missing MONGO_DB.URI in config')
  }

  console.log('🔐 Approving plugin access...')
  console.log(`DAO: ${daoAddress}`)
  console.log(`Network: ${network}`)
  console.log(`Plugin slug: ${pluginSlug}`)
  console.log(`Approved by: ${approvedBy}`)
  if (reason) console.log(`Reason: ${reason}`)

  await mongoose.connect(mongoUri)

  const collection = mongoose.connection.db?.collection('pluginauthorizations')
  if (!collection) {
    throw new Error('Collection pluginauthorizations not available')
  }

  const now = new Date()

  const result = await collection.updateOne(
    {
      daoAddress,
      network,
      pluginSlug,
    },
    {
      $set: {
        daoAddress,
        network,
        pluginSlug,
        status: 'approved',
        approvedBy,
        approvedAt: now,
        ...(reason ? { reason } : {}),
      },
      $setOnInsert: {
        requestedAt: now,
      },
      $currentDate: {
        updatedAt: true,
      },
    },
    { upsert: true },
  )

  console.log('✅ Approval saved')
  console.log(`Matched: ${result.matchedCount}`)
  console.log(`Modified: ${result.modifiedCount}`)
  console.log(`Upserted: ${result.upsertedCount}`)

  await mongoose.disconnect()
}

main().catch(error => {
  console.error('❌ Failed to approve plugin access:', error.message)
  process.exit(1)
})
