import { ethers } from 'ethers'
import mongoose from 'mongoose'
import config from '@config'

async function extractHelpersWithDebug() {
  console.log('🔍 Extracting helpers from plugin state (DEBUG MODE)...\n')

  const provider = new ethers.JsonRpcProvider('https://api.harmony.one')
  const pluginAddress = '0x48D6E7Dc4A289417D6878119092d2Bb040162995'
  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783'
  const blockNumber = 83642085
  const txHash = '0x47b1b8fc588afe80f6ffc86e9097a2bae9d960d80f9a12729e0370b3bdcbed79'

  // Connect to MongoDB
  const mongoUri = config.MONGO_DB.URI
  console.log(`📍 MongoDB URI: ${mongoUri}\n`)

  await mongoose.connect(mongoUri)
  console.log('✅ Connected to MongoDB')
  console.log(`   Database: ${mongoose.connection.db?.databaseName}`)
  console.log(`   Host: ${mongoose.connection.host}`)
  console.log(`   Port: ${mongoose.connection.port}\n`)

  // List all collections in the current database
  const collections = await mongoose.connection.db?.listCollections().toArray()
  console.log(`📦 Available collections (${collections?.length}):`)
  collections?.forEach(col => console.log(`   - ${col.name}`))
  console.log('')

  // Fetch transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash)
  if (!receipt) {
    throw new Error('Transaction receipt not found')
  }

  console.log(`📦 Transaction has ${receipt.logs.length} logs\n`)

  // Extract helpers
  const potentialHelpers = new Set<string>()
  receipt.logs.forEach(log => {
    if (log.address.toLowerCase() !== pluginAddress.toLowerCase()) {
      potentialHelpers.add(log.address.toLowerCase())
    }
  })

  const helpers = Array.from(potentialHelpers)
  console.log(`🔍 Found ${helpers.length} helper(s): ${helpers.join(', ')}\n`)

  // Get block timestamp
  const block = await provider.getBlock(blockNumber)
  if (!block) {
    throw new Error('Block not found')
  }

  // Create document
  const doc = {
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

  console.log('💾 Attempting to save to MongoDB...')
  console.log('   Collection: logpluginsetupprocessors')
  console.log(`   Database: ${mongoose.connection.db?.databaseName}\n`)

  try {
    // Direct collection insert (bypass model)
    const collection = mongoose.connection.db?.collection('logpluginsetupprocessors')

    if (!collection) {
      throw new Error('Collection not accessible')
    }

    const result = await collection.updateOne(
      {
        network: 'harmony-mainnet',
        transactionHash: txHash,
        logIndex: 0,
      },
      {
        $set: doc,
        $setOnInsert: {
          createdAt: new Date(),
        },
        $currentDate: {
          updatedAt: true,
        },
      },
      { upsert: true },
    )

    console.log('✅ MongoDB operation result:')
    console.log(`   Matched: ${result.matchedCount}`)
    console.log(`   Modified: ${result.modifiedCount}`)
    console.log(`   Upserted: ${result.upsertedCount}`)
    console.log(`   Upserted ID: ${result.upsertedId || 'N/A'}\n`)

    // Verify the document was inserted
    console.log('🔍 Verifying document in MongoDB...')
    const found = await collection.findOne({
      network: 'harmony-mainnet',
      transactionHash: txHash,
      logIndex: 0,
    })

    if (found) {
      console.log('✅ Document found in database!')
      console.log(`   _id: ${found._id}`)
      console.log(`   Plugin: ${found.pluginAddress}`)
      console.log(`   Helpers: ${found.helpers?.join(', ') || 'none'}\n`)
    } else {
      console.log('❌ Document NOT found in database after insert!\n')
    }

    // Count total documents in collection
    const count = await collection.countDocuments()
    console.log(`📊 Total documents in collection: ${count}\n`)
  } catch (error: any) {
    console.error('❌ MongoDB operation failed:', error)
    throw error
  }

  await mongoose.disconnect()
  console.log('✅ Disconnected from MongoDB')

  console.log('\n📋 Manual verification command:')
  console.log('   docker exec -it mongo1 mongosh')
  console.log(`   use ${mongoose.connection.db?.databaseName || 'aragon'}`)
  console.log(`   db.logpluginsetupprocessors.findOne({transactionHash: '${txHash}'})`)
}

extractHelpersWithDebug().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
