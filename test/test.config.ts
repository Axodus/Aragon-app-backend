import './environment'
import * as path from 'path'
import * as fs from 'fs'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { glob } from 'glob'
import { argv } from 'process'
import Mocha from 'mocha'
import { MockDB } from '@test/lib/mockDb'
import { reapplyCustomStatics } from '@models/utils/setModels'
import { ModelProxy } from '@dbModels'
import logger from '@logger'
import utils from '@helpers/utils'
import ProviderModule from '@modules/provider'
import MongoDB from '@modules/mongo'

logger.transports[0].level = 'silly'
chai.use(chaiAsPromised)
declare const global: any
global.chai = chai
global.expect = chai.expect

let testFolder = ''
if (argv.includes('--unit-dep')) {
  testFolder = 'unit-dep'
} else if (argv.includes('--unit')) {
  testFolder = 'unit'
} else if (argv.includes('--manual')) {
  testFolder = 'manual'
} else {
  console.error('Please type the correct params')
  process.exit(1)
}

const argValue = (name: string) => {
  const index = argv.indexOf(name)
  if (index >= 0) return argv[index + 1]

  const prefix = `${name}=`
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length)
}

const grepMatchesFile = (file: string, grep?: string) => {
  if (!grep) return true

  try {
    return new RegExp(grep).test(fs.readFileSync(file, 'utf8'))
  } catch {
    return fs.readFileSync(file, 'utf8').includes(grep)
  }
}

const testLog = (phase: string, metadata: Record<string, unknown> = {}) => {
  const safeMetadata = {
    testFolder,
    nodeEnv: process.env.NODE_ENV,
    mongoDbName: process.env.MONGO_DB_NAME,
    mongomsVersion: process.env.MONGOMS_VERSION,
    mongomsSystemBinary: process.env.MONGOMS_SYSTEM_BINARY ? '[configured]' : '[not configured]',
    mongomsRuntimeDownload: process.env.MONGOMS_RUNTIME_DOWNLOAD,
    ...metadata,
  }

  console.log(`[test-runner] ${phase}`, safeMetadata) // eslint-disable-line no-console
}
const verboseDiagnostics = process.env.TEST_DIAGNOSTICS === 'verbose'

async function runTests() {
  const defaultTimeoutMs = testFolder === 'unit' ? 180000 : 60000
  const timeoutMs = Number(process.env.MOCHA_TIMEOUT_MS || defaultTimeoutMs)
  const grep = argValue('--grep')

  const mocha = new Mocha({
    ui: 'bdd',
    timeout: timeoutMs,
    color: true,
    diff: true,
    fullTrace: true,
    grep,
  })

  // MockDB setup
  testLog('configured', { timeoutMs, grep: grep ?? '[none]' })
  mocha.suite.beforeAll(async () => {
    switch (testFolder) {
      case 'unit':
        testLog('MockDB connect:start')
        await MockDB.connect()
        testLog('MockDB connect:complete')
        await utils.wait(500)
        break
      case 'unit-dep':
        testLog('MongoDB connect:start')
        await MongoDB.connect()
        testLog('Provider connect:start')
        await ProviderModule.connectToAllNetworks()
        testLog('unit-dep connect:complete')
        break
      default:
        break
    }
  })

  mocha.suite.beforeEach(async () => {
    // If a previous spec overwrote Models.<Model> with a plain object, restore
    // the original Mongoose model before any test-level stubbing runs.
    ModelProxy.restoreBaselineIfOverwritten()

    // Ensure custom statics exist and are stub-friendly before any test-level stubbing runs.
    reapplyCustomStatics()
    switch (testFolder) {
      case 'unit':
        if (verboseDiagnostics) testLog('MockDB drop:start')
        await MockDB.drop()
        if (verboseDiagnostics) testLog('MockDB drop:complete')
        break
      case 'unit-dep':
        await MongoDB.drop()
        break
      default:
        break
    }
  })

  // CRITICAL: Restore custom model statics after each test
  // Sinon sandbox.restore() may remove custom statics when unstubbing
  mocha.suite.afterEach(() => {
    reapplyCustomStatics()

    // Prevent any Models.<Model> overwrites from leaking into subsequent tests.
    ModelProxy.restoreBaselineIfOverwritten()
  })

  mocha.suite.afterAll(async () => {
    switch (testFolder) {
      case 'unit':
        testLog('MockDB disconnect:start')
        await MockDB.disconnect()
        testLog('MockDB disconnect:complete')
        break
      case 'unit-dep':
        testLog('Provider disconnect:start')
        await ProviderModule.closeAllNetworks()
        testLog('Provider disconnect:complete')
        break
      default:
        break
    }
  })

  // Resolve and add test files
  const pattern = path.join(__dirname, testFolder, '**', '*.ts')

  try {
    testLog('test discovery:start', { pattern })
    const discoveredFiles = await glob(pattern)
    const files = discoveredFiles.filter(file => grepMatchesFile(file, grep))
    testLog('test discovery:complete', { fileCount: files.length, discoveredFileCount: discoveredFiles.length })
    files.forEach(file => mocha.addFile(file))

    mocha.run(failures => {
      process.exitCode = failures ? 1 : 0
      if (failures) {
        console.error(failures)
        process.exit(1)
      } else {
        console.log('All tests passed!')
        process.exit(0)
      }
    })
  } catch (err) {
    console.error('Could not find test files', err)
    process.exit(1)
  }
}

runTests().catch(error => {
  console.error('Unhandled Rejection at: Promise', error)
  process.exit(1)
})
