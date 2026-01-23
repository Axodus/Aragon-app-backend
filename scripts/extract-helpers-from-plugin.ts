import { ethers } from 'ethers'
import mongoose from 'mongoose'
import config from '@config'

// Define the schema inline since Models export might be incomplete
interface ILogPluginSetupProcessor {
  network: string
  event: string
  blockNumber: number
  blockTimestamp: number
  transactionHash: string
  logIndex: number
  daoAddress: string
  pluginAddress: string
  pluginSetupRepo: string
  preparedSetupId: string
  versionTag: {
    release: number
    build: number
  }
  data: string
  helpers: string[]
  sender: string
  _metadata?: {
    source: string
    reason: string
    extractedAt: Date
  }
}

const LogPluginSetupProcessorSchema = new mongoose.Schema<ILogPluginSetupProcessor>(
  {
    network: { type: String, required: true, index: true },
    event: { type: String, required: true },
    blockNumber: { type: Number, required: true, index: true },
    blockTimestamp: { type: Number, required: true },
    transactionHash: { type: String, required: true, index: true },
    logIndex: { type: Number, required: true },
    daoAddress: { type: String, required: true, index: true },
    pluginAddress: { type: String, required: true, index: true },
    pluginSetupRepo: { type: String, required: true },
    preparedSetupId: { type: String, required: true },
    versionTag: {
      release: { type: Number, required: true },
      build: { type: Number, required: true },
    },
    data: { type: String, required: true },
    helpers: [{ type: String }],
    sender: { type: String, required: true },
    _metadata: {
      source: String,
      reason: String,
      extractedAt: Date,
    },
  },
  {
    timestamps: true,
    collection: 'logpluginsetupprocessors',
  },
)

// Create compound index for uniqueness
LogPluginSetupProcessorSchema.index({ network: 1, transactionHash: 1, logIndex: 1 }, { unique: true })

const LogPluginSetupProcessorModel =
  mongoose.models.LogPluginSetupProcessor ||
  mongoose.model<ILogPluginSetupProcessor>('LogPluginSetupProcessor', LogPluginSetupProcessorSchema)

async function extractHelpersFromPlugin() {
  console.log('🔍 Extracting helpers from plugin state...\n')

  const provider = new ethers.JsonRpcProvider('https://api.harmony.one')
  const pluginAddress = '0x48D6E7Dc4A289417D6878119092d2Bb040162995'
  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783'
  const blockNumber = 83642085
  const txHash = '0x47b1b8fc588afe80f6ffc86e9097a2bae9d960d80f9a12729e0370b3bdcbed79'

  console.log(`Plugin: ${pluginAddress}`)
  console.log(`DAO: ${daoAddress}`)
  console.log(`Block: ${blockNumber}`)
  console.log(`Tx: ${txHash}\n`)

  // Connect to MongoDB
  const mongoUri = config.MONGO_DB.URI
  await mongoose.connect(mongoUri)
  console.log('✅ Connected to MongoDB\n')

  // Fetch transaction receipt to get all logs
  const receipt = await provider.getTransactionReceipt(txHash)

  if (!receipt) {
    throw new Error('Transaction receipt not found')
  }

  console.log(`📦 Transaction has ${receipt.logs.length} logs\n`)

  // Extract unique contract addresses from logs (potential helpers)
  const potentialHelpers = new Set<string>()

  receipt.logs.forEach(log => {
    // Skip the plugin itself
    if (log.address.toLowerCase() !== pluginAddress.toLowerCase()) {
      potentialHelpers.add(log.address.toLowerCase())
    }
  })

  const helpers = Array.from(potentialHelpers)

  console.log(`🔍 Found ${helpers.length} potential helper contract(s):`)
  helpers.forEach((helper, i) => console.log(`   ${i + 1}. ${helper}`))

  if (helpers.length === 0) {
    console.log('\n⚠️  No helper contracts found in transaction logs')
    console.log('   This plugin might not use helpers, or they were deployed separately\n')
    console.log('📝 Creating installation record without helpers...')
  } else {
    console.log('\n✅ Using these as helpers\n')
  }

  // Get block timestamp
  const block = await provider.getBlock(blockNumber)
  if (!block) {
    throw new Error('Block not found')
  }

  // Create document to insert
  const doc: ILogPluginSetupProcessor = {
    network: 'harmony-mainnet',
    event: 'InstallationPrepared',
    blockNumber,
    blockTimestamp: Number(block.timestamp),
    transactionHash: txHash,
    logIndex: 0,
    daoAddress: daoAddress.toLowerCase(),
    pluginAddress: pluginAddress.toLowerCase(),
    pluginSetupRepo: '0x0000000000000000000000000000000000000000',
    preparedSetupId: ethers.ZeroHash,
    versionTag: {
      release: 1,
      build: 1,
    },
    data: '0x',
    helpers,
    sender: receipt.from.toLowerCase(),
    _metadata: {
      source: 'manual-extraction',
      reason: 'direct-installation-without-psp',
      extractedAt: new Date(),
    },
  }

  console.log('💾 Saving to MongoDB...\n')

  const result = await LogPluginSetupProcessorModel.updateOne(
    {
      network: 'harmony-mainnet',
      transactionHash: txHash,
      logIndex: 0,
    },
    { $set: doc },
    { upsert: true },
  )

  if (result.upsertedCount > 0) {
    console.log('✅ Inserted new installation record')
  } else if (result.modifiedCount > 0) {
    console.log('✅ Updated existing installation record')
  } else {
    console.log('ℹ️  Record already exists and is up-to-date')
  }

  console.log('\n═══════════════════════════════════════')
  console.log('📊 Summary:')
  console.log(`   Plugin: ${pluginAddress}`)
  console.log(`   DAO: ${daoAddress}`)
  console.log(`   Block: ${blockNumber}`)
  console.log(`   Tx: ${txHash}`)
  console.log(`   Helpers found: ${helpers.length}`)
  if (helpers.length > 0) {
    console.log('   Helper addresses:')
    helpers.forEach((h, i) => console.log(`      ${i + 1}. ${h}`))
  }
  console.log('═══════════════════════════════════════\n')

  await mongoose.disconnect()
  console.log('✅ Disconnected from MongoDB')

  console.log('\n📋 Next steps:')
  console.log('   1. Verify in MongoDB:')
  console.log('      docker exec -it mongo1 mongosh')
  console.log('      use aragon')
  console.log(`      db.logpluginsetupprocessors.findOne({transactionHash: '${txHash}'})`)
  console.log('\n   2. Test uninstall endpoint:')
  console.log(`      curl http://api.whostler.com/api/v2/plugins/installation-helpers/harmony-mainnet/${pluginAddress}`)
}

extractHelpersFromPlugin().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
