export interface ChainExplorerMetadata {
  readonly name: string
  readonly url: string
  readonly apiUrl?: string
}

export interface ChainMetadata {
  readonly chainId: number
  readonly slug: string
  readonly displayName: string
  readonly explorers: readonly ChainExplorerMetadata[]
}
