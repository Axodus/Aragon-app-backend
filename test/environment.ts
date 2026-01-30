import * as path from 'path'
import * as dotenv from 'dotenv'

// Node.js >= 22 removed `buffer.SlowBuffer`. Some transitive deps (e.g. `buffer-equal-constant-time`)
// still reference it at import time. Polyfill it for the test runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bufferModule = require('buffer') as { Buffer?: typeof Buffer; SlowBuffer?: unknown }
if (bufferModule && typeof bufferModule.SlowBuffer === 'undefined') {
	bufferModule.SlowBuffer = bufferModule.Buffer
}

dotenv.config({ path: path.resolve(__dirname, './test.env') })
