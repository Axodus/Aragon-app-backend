import type {
  ActorActivityReadModel,
  AuditTrailReadModel,
  DecisionHistoryReadModel,
  EmergencyActionReadModel,
  GovernanceTimelineReadModel,
  ProposalDetailReadModel,
  ProposalListReadModel,
  TenantGovernanceSummaryReadModel,
} from '@src/read-models'
import type { GovernanceQueryContext } from './governance-query-context'
import { hasGovernanceQueryRole } from './governance-query-authorization'

const sensitiveValuePatterns = [
  /private[-_\s]?key/i,
  /secret/i,
  /credential/i,
  /provider[-_\s]?token/i,
  /production[-_\s]?config/i,
  /permission[-_\s]?context/i,
  /sensitive[-_\s]?evidence/i,
  /risk[-_\s]?note/i,
]

const redactString = (value: string) =>
  sensitiveValuePatterns.some(pattern => pattern.test(value)) ? '[redacted]' : value

const sanitizeStringArray = (values: string[]) => values.map(redactString)

const sanitizeModelMetadata = <T extends { metadata: { correlationId: string | null } }>(model: T): T => ({
  ...model,
  metadata: {
    ...model.metadata,
    correlationId: null,
  },
})

export const sanitizeProposalListReadModel = (model: ProposalListReadModel): ProposalListReadModel =>
  sanitizeModelMetadata({
    ...model,
    items: model.items.map(item => ({
      ...item,
      title: redactString(item.title),
      summary: item.summary ? redactString(item.summary) : null,
      tags: sanitizeStringArray(item.tags),
    })),
  })

export const sanitizeProposalDetailReadModel = (model: ProposalDetailReadModel): ProposalDetailReadModel =>
  sanitizeModelMetadata({
    ...model,
    proposal: {
      ...model.proposal,
      title: redactString(model.proposal.title),
    },
    latestVersion: model.latestVersion
      ? {
          ...model.latestVersion,
          title: model.latestVersion.title ? redactString(model.latestVersion.title) : null,
          contentHash: model.latestVersion.contentHash ? redactString(model.latestVersion.contentHash) : null,
        }
      : null,
    versions: model.versions.map(version => ({
      ...version,
      title: version.title ? redactString(version.title) : null,
      contentHash: version.contentHash ? redactString(version.contentHash) : null,
    })),
    decisions: model.decisions.map(decision => ({
      ...decision,
      authority: redactString(decision.authority),
    })),
    auditReferences: model.auditReferences.map(audit => ({
      ...audit,
      actionType: redactString(audit.actionType),
    })),
    emergencyActions: model.emergencyActions.map(action => ({
      ...action,
      actionType: redactString(action.actionType),
    })),
    receiptReferences: model.receiptReferences.map(receipt => ({
      ...receipt,
      source: redactString(receipt.source),
      reference: redactString(receipt.reference),
    })),
  })

export const sanitizeTimelineReadModel = (model: GovernanceTimelineReadModel): GovernanceTimelineReadModel =>
  sanitizeModelMetadata({
    ...model,
    entries: model.entries.map(entry => ({
      ...entry,
      summary: redactString(entry.summary),
    })),
  })

export const sanitizeDecisionHistoryReadModel = (model: DecisionHistoryReadModel): DecisionHistoryReadModel =>
  sanitizeModelMetadata({
    ...model,
    items: model.items.map(item => ({
      ...item,
      authority: redactString(item.authority),
      evidenceReferences: sanitizeStringArray(item.evidenceReferences),
    })),
  })

export const sanitizeEmergencyActionReadModel = (
  model: EmergencyActionReadModel,
  context: GovernanceQueryContext,
): EmergencyActionReadModel => {
  const canReadRestrictedEmergencyDetails = hasGovernanceQueryRole(context, 'governance:auditor')

  return sanitizeModelMetadata({
    ...model,
    items: model.items.map(item => {
      const restrictCriticalDetails = item.severity === 'critical' && !canReadRestrictedEmergencyDetails
      return {
        ...item,
        actionType: restrictCriticalDetails ? 'restricted_emergency_action' : redactString(item.actionType),
        reason: restrictCriticalDetails ? 'redacted emergency action' : redactString(item.reason),
        auditId: restrictCriticalDetails ? null : item.auditId,
      }
    }),
  })
}

export const sanitizeTenantGovernanceSummaryReadModel = (
  model: TenantGovernanceSummaryReadModel,
): TenantGovernanceSummaryReadModel => sanitizeModelMetadata(model)

export const sanitizeAuditTrailReadModel = (model: AuditTrailReadModel): AuditTrailReadModel =>
  sanitizeModelMetadata({
    ...model,
    items: model.items.map(item => ({
      ...item,
      actionType: redactString(item.actionType),
      decisionReference: item.decisionReference ? redactString(item.decisionReference) : null,
      receiptReference: item.receiptReference ? redactString(item.receiptReference) : null,
    })),
  })

export const sanitizeActorActivityReadModel = (model: ActorActivityReadModel): ActorActivityReadModel =>
  sanitizeModelMetadata({
    ...model,
    items: model.items.map(item => ({
      ...item,
      actionType: redactString(item.actionType),
      summary: redactString(item.summary),
    })),
  })
