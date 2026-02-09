import { expect } from 'chai'
import { resolveActiveContractsVersionKey } from '@helpers/contractsConfigVersion'

describe('Helpers:contractsConfigVersion', () => {
  it('selects the highest semver key by default', () => {
    const cfg = {
      'v1.3.0': { a: 1 },
      'v1.4.0': { a: 2 },
      'v1.2.9': { a: 3 },
    }

    const key = resolveActiveContractsVersionKey(cfg)
    expect(key).to.equal('v1.4.0')
  })

  it('supports override key (exact match)', () => {
    const cfg = {
      'v1.3.0': { a: 1 },
      'v1.4.0': { a: 2 },
    }

    const key = resolveActiveContractsVersionKey(cfg, { overrideVersionKey: 'v1.3.0' })
    expect(key).to.equal('v1.3.0')
  })

  it('supports override key without v-prefix', () => {
    const cfg = {
      'v1.3.0': { a: 1 },
      'v1.4.0': { a: 2 },
    }

    const key = resolveActiveContractsVersionKey(cfg, { overrideVersionKey: '1.3.0' })
    expect(key).to.equal('v1.3.0')
  })

  it('throws on invalid override by default', () => {
    const cfg = {
      'v1.3.0': { a: 1 },
      'v1.4.0': { a: 2 },
    }

    expect(() => resolveActiveContractsVersionKey(cfg, { overrideVersionKey: 'v9.9.9' })).to.throw(
      "Invalid contracts version override 'v9.9.9'",
    )
  })
})
