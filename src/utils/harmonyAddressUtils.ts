import { getAddress } from 'ethers'

const HRP = 'one'
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const CHARSET_MAP = new Map(CHARSET.split('').map((char, index) => [char, index]))

function polymod(values: number[]): number {
  const GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const value of values) {
    const top = chk >> 25
    chk = ((chk & 0x1ffffff) << 5) ^ value
    for (let i = 0; i < 5; i++) {
      if (((top >> i) & 1) !== 0) {
        chk ^= GENERATORS[i]
      }
    }
  }
  return chk
}

function hrpExpand(hrp: string): number[] {
  const ret: number[] = []
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) >> 5)
  }
  ret.push(0)
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) & 31)
  }
  return ret
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0])
  const mod = polymod(values) ^ 1
  const ret: number[] = []
  for (let i = 0; i < 6; i++) {
    ret.push((mod >> (5 * (5 - i))) & 31)
  }
  return ret
}

function verifyChecksum(hrp: string, data: number[]): boolean {
  return polymod(hrpExpand(hrp).concat(data)) === 1
}

function bech32Encode(hrp: string, data: number[]): string {
  const checksum = createChecksum(hrp, data)
  const combined = data.concat(checksum)
  return `${hrp}1${combined.map((value) => CHARSET[value]).join('')}`
}

function bech32Decode(address: string): { hrp: string; data: number[] } {
  const normalized = address.toLowerCase()
  const pos = normalized.lastIndexOf('1')
  if (pos <= 0 || pos + 7 > normalized.length) {
    throw new Error('Invalid bech32 address separator position.')
  }

  const hrp = normalized.slice(0, pos)
  const dataChars = normalized.slice(pos + 1)
  const data = dataChars.split('').map((char) => {
    const value = CHARSET_MAP.get(char)
    if (value == null) {
      throw new Error('Invalid bech32 character.')
    }
    return value
  })

  if (!verifyChecksum(hrp, data)) {
    throw new Error('Invalid bech32 checksum.')
  }

  return { hrp, data: data.slice(0, -6) }
}

function assertValidConvertBitsValue(value: number, fromBits: number) {
  if (value < 0 || (value >> fromBits) !== 0) {
    throw new Error('Invalid value for bit conversion.')
  }
}

function finalizeConvertBits(params: {
  pad: boolean
  bits: number
  acc: number
  fromBits: number
  toBits: number
  maxv: number
  ret: number[]
}) {
  const { pad, bits, acc, fromBits, toBits, maxv, ret } = params

  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv)
    }
    return
  }

  if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) !== 0) {
    throw new Error('Invalid padding in bit conversion.')
  }
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0
  let bits = 0
  const ret: number[] = []
  const maxv = (1 << toBits) - 1

  for (const value of data) {
    assertValidConvertBitsValue(value, fromBits)
    acc = (acc << fromBits) | value
    bits += fromBits
    while (bits >= toBits) {
      bits -= toBits
      ret.push((acc >> bits) & maxv)
    }
  }

  finalizeConvertBits({ pad, bits, acc, fromBits, toBits, maxv, ret })

  return ret
}

function bytesToHex(bytes: number[]): string {
  return Buffer.from(bytes).toString('hex')
}

function hexToBytes(hex: string): number[] {
  return Array.from(Buffer.from(hex, 'hex'))
}

export function isHexAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function isBech32Address(value: string): boolean {
  try {
    const decoded = bech32Decode(value)
    return decoded.hrp === HRP
  } catch {
    return false
  }
}

export function toHarmonyHexAddress(value: string): string {
  if (isHexAddress(value)) {
    return getAddress(value)
  }

  if (isBech32Address(value)) {
    const { hrp, data } = bech32Decode(value)
    if (hrp !== HRP) {
      throw new Error(`Invalid bech32 prefix ${hrp}. Expected ${HRP}.`)
    }

    const bytes = convertBits(data, 5, 8, false)
    if (bytes.length !== 20) {
      throw new Error('Invalid bech32 address length.')
    }

    return getAddress(`0x${bytesToHex(bytes)}`)
  }

  throw new Error('Address must be a valid hex or bech32 value.')
}

export function toHarmonyBech32Address(value: string): string {
  if (isBech32Address(value)) {
    return value.toLowerCase()
  }

  if (isHexAddress(value)) {
    const normalized = getAddress(value)
    const bytes = hexToBytes(normalized.slice(2))
    if (bytes.length !== 20) {
      throw new Error('Invalid hex address length.')
    }

    const words = convertBits(bytes, 8, 5, true)
    return bech32Encode(HRP, words)
  }

  throw new Error('Address must be a valid hex or bech32 value.')
}
