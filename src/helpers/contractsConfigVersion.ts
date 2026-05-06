export type VersionedContractsConfig<TVersion extends Record<string, any>> = Record<string, TVersion>

function normalizeVersionKey(versionKey: string): string {
  return versionKey.trim().toLowerCase()
}

function parseSemverFromKey(versionKey: string): [number, number, number] | null {
  const normalized = normalizeVersionKey(versionKey)
  const match = normalized.match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return null

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  if ([major, minor, patch].some(n => Number.isNaN(n) || n < 0)) return null

  return [major, minor, patch]
}

function compareSemverDesc(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return b[0] - a[0]
  if (a[1] !== b[1]) return b[1] - a[1]
  return b[2] - a[2]
}

export function resolveActiveContractsVersionKey<TVersion extends Record<string, any>>(
  cfg: VersionedContractsConfig<TVersion>,
  opts?: {
    overrideVersionKey?: string
    allowFallbackOnInvalidOverride?: boolean
  },
): string {
  const keys = Object.keys(cfg)
  if (keys.length === 0) {
    throw new Error('Contracts config is empty; expected at least one version key')
  }

  const override = opts?.overrideVersionKey?.trim()
  if (override) {
    const normalizedOverride = normalizeVersionKey(override)

    const exact = keys.find(k => normalizeVersionKey(k) === normalizedOverride)
    if (exact) return exact

    const normalizedWithV = normalizedOverride.startsWith('v') ? normalizedOverride : `v${normalizedOverride}`
    const withV = keys.find(k => normalizeVersionKey(k) === normalizedWithV)
    if (withV) return withV

    const withoutV = normalizedOverride.startsWith('v') ? normalizedOverride.slice(1) : normalizedOverride
    const withoutVMatch = keys.find(k => {
      const nk = normalizeVersionKey(k)
      return nk.startsWith('v') ? nk.slice(1) === withoutV : nk === withoutV
    })
    if (withoutVMatch) return withoutVMatch

    if (!opts?.allowFallbackOnInvalidOverride) {
      throw new Error(`Invalid contracts version override '${override}'. Available versions: ${keys.sort().join(', ')}`)
    }
  }

  const parsed = keys
    .map(k => ({ key: k, semver: parseSemverFromKey(k) }))
    .filter((x): x is { key: string; semver: [number, number, number] } => x.semver !== null)

  if (parsed.length > 0) {
    parsed.sort((a, b) => compareSemverDesc(a.semver, b.semver))
    return parsed[0].key
  }

  // Fallback when version keys are not semver-like.
  keys.sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? -1 : 1))
  return keys[0]
}

export function resolveActiveContractsVersion<TVersion extends Record<string, any>>(
  cfg: VersionedContractsConfig<TVersion>,
  opts?: {
    overrideVersionKey?: string
    allowFallbackOnInvalidOverride?: boolean
  },
): TVersion {
  const key = resolveActiveContractsVersionKey(cfg, opts)
  const version = cfg[key]
  if (!version) {
    throw new Error(`Resolved contracts version '${key}' but it is missing from the config`)
  }
  return version
}
