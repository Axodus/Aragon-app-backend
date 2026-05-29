// @ts-nocheck
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import './sinon-mongoose'
import { ModelProxy } from '@dbModels'
import config from '@config'

const mockDbLog = (phase: string, metadata: Record<string, unknown> = {}) => {
  const safeMetadata = {
    dbName: config.MONGO_DB.NAME,
    mongomsVersion: process.env.MONGOMS_VERSION || '7.0.5',
    mongomsSystemBinary: process.env.MONGOMS_SYSTEM_BINARY ? '[configured]' : '[not configured]',
    mongomsRuntimeDownload: process.env.MONGOMS_RUNTIME_DOWNLOAD,
    ...metadata,
  }

  console.log(`[MockDB] ${phase}`, safeMetadata) // eslint-disable-line no-console
}

const MockDB = {
  replSet: null as typeof MongoMemoryReplSet | null,
  mongoUri: null as string | null,

  mongoOptions: {
    dbName: `${config.MONGO_DB.NAME}`,
    retryWrites: false,
    autoIndex: true,
  },

  connect: async () => {
    mockDbLog('connect:start')
    await MockDB._connectMongoDB()
    mockDbLog('syncIndexes:start')
    await MockDB.syncIndexesForAllModels()
    mockDbLog('syncIndexes:complete')
    // Sanity check: verify critical model statics exist
    await MockDB._verifyModelStatics()
    mockDbLog('connect:complete')
  },

  _verifyModelStatics: async () => {
    const { Models } = require('@dbModels')
    const criticalStatics = ['create', 'findByAddress', 'findAllByTokenAddress', 'findOne']
    const missingStatics: string[] = []

    if (!Models.Plugin) {
      console.error(`[MockDB] CRITICAL: Models.Plugin is undefined!`)
      return
    }

    criticalStatics.forEach(staticName => {
      const exists = typeof Models.Plugin[staticName] === 'function'
      if (!exists) {
        missingStatics.push(`${staticName} (type: ${typeof Models.Plugin[staticName]})`)
      }
    })

    if (missingStatics.length > 0) {
      console.error(`[MockDB] CRITICAL: Models.Plugin missing statics: ${missingStatics.join(', ')}`)
      const allKeys = Object.getOwnPropertyNames(Models.Plugin).filter(k => typeof Models.Plugin[k] === 'function')
      console.error(`[MockDB] Available Plugin methods:`, allKeys.slice(0, 30))
    } else {
      console.log(`[MockDB] ✓ Models.Plugin statics verified: ${criticalStatics.join(', ')}`)
    }
  },

  drop: async () => {
    /*eslint-disable no-async-promise-executor*/
    return new Promise(async resolve => {
      await Promise.all(
        Object.keys(mongoose.models).map(async name => {
          await mongoose.models[name].deleteMany()
        }),
      )
      resolve(true)
    })
  },

  async disconnect() {
    await mongoose.disconnect()
    await MockDB.replSet?.stop()
    MockDB.replSet = null

    console.log('Mongoose successfully disconnected') // eslint-disable-line no-console
  },

  _connectMongoDB: async () => {
    // MongoDB 5.x binaries depend on OpenSSL 1.1 (libcrypto.so.1.1) which is not
    // available on newer Linux distros (e.g. Ubuntu 22.04+). Default to a newer
    // MongoDB version, but allow overriding via env for reproducibility.
    const mongoMemoryServerVersion = process.env.MONGOMS_VERSION || '7.0.5'
    const mongoMemoryLaunchTimeoutMs = Number(process.env.MONGOMS_LAUNCH_TIMEOUT_MS || 60000)

    mockDbLog('replSet:create', { storageEngine: 'wiredTiger', launchTimeoutMs: mongoMemoryLaunchTimeoutMs })
    MockDB.replSet = new MongoMemoryReplSet({
      binary: {
        version: mongoMemoryServerVersion,
      },
      instanceOpts: [
        {
          storageEngine: 'wiredTiger',
          launchTimeout: mongoMemoryLaunchTimeoutMs,
        },
      ],
      replSet: {
        name: `${config.MONGO_DB.NAME}`,
        dbName: `${config.MONGO_DB.NAME}`,
        count: 1,
      },
    })

    mockDbLog('replSet:start')
    await MockDB.replSet.start()
    mockDbLog('replSet:started')
    const uri = MockDB.replSet.getUri()

    mockDbLog('mongoose:connect:start')
    await mongoose.connect(uri, MockDB.mongoOptions)
    mockDbLog('mongoose:connect:complete')
    mockDbLog('models:set:start')
    await ModelProxy.setMongoModels()
    mockDbLog('models:set:complete')
    mongoose.set('debug', config.MONGO_DB.DEBUGGER)
    MockDB.mongoUri = uri
    return uri
  },

  _dropMongoDB: async () => {
    /*eslint-disable no-async-promise-executor*/
    return new Promise(async resolve => {
      await Promise.all(
        Object.keys(mongoose.models).map(async name => {
          await mongoose.models[name].deleteMany()
        }),
      )
      resolve(true)
    })
  },

  _disconnectMongoDB: async () => {
    await mongoose.disconnect()
    await MockDB.replSet?.stop()
    MockDB.replSet = null
    console.log('Mongoose successfully disconnected') // eslint-disable-line no-console
  },

  syncIndexesForAllModels: async () => {
    const modelNames = Object.keys(mongoose.models)
    mockDbLog('syncIndexes:model-count', { modelCount: modelNames.length })
    await Promise.all(
      modelNames.map(async name => {
        try {
          await mongoose.models[name].syncIndexes()
          console.log(`Indexes synchronized for model: ${name}`)
        } catch (error) {
          console.error(`Failed to synchronize indexes for model: ${name}`, error)
        }
      }),
    )
  },
}

export { MockDB }
