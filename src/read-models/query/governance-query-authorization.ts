import type { GovernanceQueryContext } from './governance-query-context'
import { governanceQueryError } from './governance-query-errors'
import type { GovernanceQueryError } from './governance-query-errors'

export type GovernanceQueryRole =
  | 'governance:reader'
  | 'governance:reviewer'
  | 'governance:auditor'
  | 'governance:admin'

const roleRank: Record<GovernanceQueryRole, number> = {
  'governance:reader': 1,
  'governance:reviewer': 2,
  'governance:auditor': 3,
  'governance:admin': 4,
}

export const governanceQueryRoles = Object.keys(roleRank) as GovernanceQueryRole[]

export const isGovernanceQueryRole = (role: string): role is GovernanceQueryRole =>
  Object.prototype.hasOwnProperty.call(roleRank, role)

export const hasGovernanceQueryRole = (context: GovernanceQueryContext, minimumRole: GovernanceQueryRole): boolean =>
  context.roles.some(role => isGovernanceQueryRole(role) && roleRank[role] >= roleRank[minimumRole])

export const validateGovernanceQueryRoles = (context: GovernanceQueryContext): GovernanceQueryError | null => {
  if (!context.roles.length) {
    return governanceQueryError('UNAUTHORIZED', 'Governance query context requires at least one local query role')
  }

  const unknownRole = context.roles.find(role => !isGovernanceQueryRole(role))
  if (unknownRole) {
    return governanceQueryError('UNAUTHORIZED', 'Governance query context includes an unsupported local query role')
  }

  return null
}

export const validateGovernanceQueryActor = (context: GovernanceQueryContext): GovernanceQueryError | null => {
  if (context.actorId || hasGovernanceQueryRole(context, 'governance:admin')) {
    return null
  }

  return governanceQueryError(
    'UNAUTHORIZED',
    'Governance query context requires actor scope unless using a local admin context',
  )
}

export const requireGovernanceQueryRole = (
  context: GovernanceQueryContext,
  minimumRole: GovernanceQueryRole,
  resource: string,
): GovernanceQueryError | null => {
  if (hasGovernanceQueryRole(context, minimumRole)) {
    return null
  }

  return governanceQueryError('UNAUTHORIZED', `Reading ${resource} requires ${minimumRole} or stronger`)
}
