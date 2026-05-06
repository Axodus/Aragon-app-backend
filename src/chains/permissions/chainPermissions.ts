export interface ChainPermissionCapability {
  readonly chainId: number
  readonly permissionId: string
  readonly supported: boolean
  readonly conditionTypes: readonly string[]
}
