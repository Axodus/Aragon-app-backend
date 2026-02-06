/* eslint-env mocha */

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { getAddress } from 'ethers'
import { isBech32Address, isHexAddress, toHarmonyBech32Address, toHarmonyHexAddress } from '@utils/harmonyAddressUtils'

describe('harmonyAddressUtils', () => {
  it('converts hex -> bech32 -> hex (round-trip)', () => {
    const hex = '0x1111111111111111111111111111111111111111'

    const bech32 = toHarmonyBech32Address(hex)
    expect(bech32).to.match(/^one1[0-9a-z]+$/)
    expect(isBech32Address(bech32)).to.equal(true)

    const roundTrip = toHarmonyHexAddress(bech32)
    expect(roundTrip).to.equal(getAddress(hex))
  })

  it('accepts checksummed/uppercase hex input', () => {
    const hex = '0x1111111111111111111111111111111111111111'.toUpperCase()
    expect(isHexAddress(hex)).to.equal(true)

    const bech32 = toHarmonyBech32Address(hex)
    expect(bech32.startsWith('one1')).to.equal(true)
  })

  it('rejects invalid bech32 checksum', () => {
    const hex = '0x2222222222222222222222222222222222222222'
    const bech32 = toHarmonyBech32Address(hex)

    const corrupted = `${bech32.slice(0, -1)}${bech32.endsWith('q') ? 'p' : 'q'}`

    expect(() => toHarmonyHexAddress(corrupted)).to.throw('Invalid bech32 checksum')
  })
})
