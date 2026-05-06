import type { RpcEndpoint } from '../types'

export class RpcFailoverPolicy {
  constructor(private readonly endpoints: readonly RpcEndpoint[]) {}

  ordered(): readonly RpcEndpoint[] {
    return [...this.endpoints].sort((a, b) => a.priority - b.priority)
  }

  primary(): RpcEndpoint | undefined {
    return this.ordered()[0]
  }
}
