import {
  type MockGovernancePersistenceAdapter,
  err,
  ok,
  repositoryError,
  type GovernanceAuditRecord,
  type GovernanceDecisionRecord,
  type GovernanceEmergencyActionRecord,
  type GovernanceExecutionIntentRecord,
  type GovernanceProposalRecord,
  type GovernanceProposalVersionRecord,
  type GovernanceReceiptReferenceRecord,
  type GovernanceReviewRecord,
  type GovernanceVoteRecord,
  type RepositoryResult,
} from '@src/persistence'
import type { ActorActivityItem, ActorActivityReadModel } from '../types/actor-activity-read-model'
import type { AuditTrailReadModel } from '../types/audit-trail-read-model'
import type { DecisionHistoryReadModel } from '../types/decision-history-read-model'
import type { EmergencyActionItem, EmergencyActionReadModel } from '../types/emergency-action-read-model'
import type {
  GovernanceTimelineEntry,
  GovernanceTimelineReadModel,
  GovernanceTimelineSeverity,
} from '../types/governance-timeline-read-model'
import type { PageInfo, ReadModelPageInput } from '../types/pagination'
import type { ProposalDetailReadModel } from '../types/proposal-detail-read-model'
import type {
  ProposalExecutionIntentStatus,
  ProposalListItem,
  ProposalListReadModel,
} from '../types/proposal-list-read-model'
import type { ReadModelConsistency, ReadModelMetadata } from '../types/read-model-metadata'
import type { TenantGovernanceSummaryReadModel } from '../types/tenant-governance-summary-read-model'

type TenantInput = ReadModelPageInput & {
  tenantId: string
  proposalId?: string
  actorId?: string
  status?: string
  entityType?: string
  entityId?: string
}

export type ProjectProposalListInput = TenantInput
export interface ProjectProposalDetailInput {
  tenantId: string
  proposalId: string
}
export type ProjectTenantScopedInput = TenantInput

const SOURCE_VERSION = 'governance-read-models/mock-projector/v1'
const severityRank: Record<GovernanceTimelineSeverity, number> = { critical: 0, warning: 1, info: 2 }

const maxDate = (dates: Array<string | null | undefined>) =>
  dates.filter((date): date is string => Boolean(date)).sort((left, right) => right.localeCompare(left))[0] ?? null

const page = <T>(items: T[], input: ReadModelPageInput = {}): { items: T[]; page: PageInfo } => {
  const offset = Math.max(input.offset ?? 0, 0)
  const limit = Math.max(input.limit ?? items.length, 0)
  return {
    items: items.slice(offset, offset + limit),
    page: {
      limit,
      offset,
      total: items.length,
      hasNextPage: offset + limit < items.length,
      nextOffset: offset + limit < items.length ? offset + limit : null,
    },
  }
}

const metadata = (
  readModelId: string,
  tenantId: string,
  sourceDates: Array<string | null | undefined>,
  consistency: ReadModelConsistency = 'snapshot',
): ReadModelMetadata => ({
  readModelId,
  tenantId,
  sourceVersion: SOURCE_VERSION,
  generatedAt: new Date().toISOString(),
  lastSourceEventAt: maxDate(sourceDates),
  freshness: 'fresh',
  consistency,
  indexCheckpointId: null,
  correlationId: null,
})

const updatedAt = (record: { createdAt: string; updatedAt?: string }) => record.updatedAt ?? record.createdAt
const sortDesc = <T>(items: T[], dateOf: (item: T) => string, idOf: (item: T) => string) =>
  [...items].sort((left, right) => {
    const byDate = dateOf(right).localeCompare(dateOf(left))
    return byDate || idOf(left).localeCompare(idOf(right))
  })

const executionIntentStatus = (intents: GovernanceExecutionIntentRecord[]): ProposalExecutionIntentStatus => {
  if (intents.some(intent => intent.executionStatus === 'blocked')) return 'blocked'
  return intents.length ? 'recorded' : 'none'
}

const emergencySeverity = (action: GovernanceEmergencyActionRecord): GovernanceTimelineSeverity => {
  if (action.status === 'active' || action.status === 'requested') return 'critical'
  if (action.status === 'pending' || action.status === 'under-review') return 'warning'
  return 'info'
}

export class MockGovernanceReadModelProjector {
  constructor(private readonly adapter: MockGovernancePersistenceAdapter) {}

  async projectProposalList(input: ProjectProposalListInput): Promise<RepositoryResult<ProposalListReadModel>> {
    const proposals = await this.adapter.proposals.listProposals({ tenantId: input.tenantId, status: input.status })
    if (!proposals.ok) return proposals

    const items = await Promise.all(proposals.value.items.map(async proposal => this.toProposalListItem(proposal)))
    const sorted = sortDesc(
      items,
      item => item.updatedAt,
      item => item.proposalId,
    )
    const paged = page(sorted, input)
    return ok({
      metadata: metadata(
        'proposal-list',
        input.tenantId,
        sorted.map(item => item.updatedAt),
      ),
      items: paged.items,
      page: paged.page,
    })
  }

  async projectProposalDetail(input: ProjectProposalDetailInput): Promise<RepositoryResult<ProposalDetailReadModel>> {
    const proposal = await this.adapter.proposals.getProposalById(input.proposalId)
    if (!proposal.ok) return proposal
    if (proposal.value.tenantId !== input.tenantId) {
      return err(
        repositoryError('NOT_FOUND', 'proposal not found for tenant', {
          tenantId: input.tenantId,
          proposalId: input.proposalId,
        }),
      )
    }

    const [versions, latest, decisions, votes, reviews, intents, emergencies, audits, receipts] = await Promise.all([
      this.adapter.proposalVersions.listProposalVersions(input.proposalId),
      this.adapter.proposalVersions.getLatestProposalVersion(input.proposalId),
      this.adapter.decisions.listDecisionsForProposal(input.proposalId),
      this.adapter.votes.listVotesForProposal(input.proposalId),
      this.adapter.reviews.listReviewsForProposal(input.proposalId),
      this.adapter.executionIntents.listExecutionIntents({ tenantId: input.tenantId, proposalId: input.proposalId }),
      this.adapter.emergencyActions.listEmergencyActions({ tenantId: input.tenantId }),
      this.adapter.audit.listAuditRecordsForEntity('proposal', input.proposalId),
      this.adapter.receiptReferences.listReceiptsForEntity('proposal', input.proposalId),
    ])

    const versionItems = versions.ok ? versions.value : []
    const decisionItems = decisions.ok ? decisions.value : []
    const voteItems = votes.ok ? votes.value : []
    const reviewItems = reviews.ok ? reviews.value : []
    const intentItems = intents.ok ? intents.value.items : []
    const emergencyItems = emergencies.ok ? emergencies.value.items : []
    const auditItems = audits.ok ? audits.value : []
    const receiptItems = receipts.ok ? receipts.value : []

    return ok({
      metadata: metadata('proposal-detail', input.tenantId, [
        updatedAt(proposal.value),
        ...versionItems.map(updatedAt),
        ...decisionItems.map(updatedAt),
        ...auditItems.map(updatedAt),
      ]),
      proposal: {
        proposalId: proposal.value.proposalId,
        tenantId: proposal.value.tenantId,
        daoId: proposal.value.daoId ?? null,
        title: proposal.value.title ?? proposal.value.proposalId,
        status: proposal.value.status,
        proposerActorId: proposal.value.actorId ?? null,
        createdAt: proposal.value.createdAt,
        updatedAt: updatedAt(proposal.value),
      },
      latestVersion: latest.ok ? this.toVersionSummary(latest.value) : null,
      versions: versionItems.map(item => this.toVersionSummary(item)),
      decisions: decisionItems.map(item => this.toDecisionSummary(item)),
      votes: voteItems.map(item => this.toVoteSummary(item)),
      reviews: reviewItems.map(item => this.toReviewSummary(item)),
      executionIntents: intentItems.map(item => ({
        intentId: item.intentId,
        proposalId: item.proposalId,
        executionIntentStatus: executionIntentStatus([item]),
        blockedReason: item.blockedReason ?? null,
        recordedAt: updatedAt(item),
      })),
      emergencyActions: emergencyItems.map(item => this.toEmergencyActionSummary(item)),
      auditReferences: auditItems.map(item => ({
        auditId: item.auditId,
        entityType: item.entityType,
        entityId: item.entityId,
        actionType: item.actionType,
        evidenceReferenceCount: item.evidenceReferences?.length ?? 0,
      })),
      receiptReferences: receiptItems.map(item => ({
        receiptId: item.receiptId,
        entityType: item.entityType,
        entityId: item.entityId,
        source: item.source,
        reference: item.reference,
      })),
    })
  }

  async projectGovernanceTimeline(
    input: ProjectTenantScopedInput,
  ): Promise<RepositoryResult<GovernanceTimelineReadModel>> {
    const [proposals, decisions, emergencies, audits, receipts] = await Promise.all([
      this.adapter.proposals.listProposals({ tenantId: input.tenantId, proposalId: input.proposalId }),
      this.adapter.decisions.listDecisions({ tenantId: input.tenantId, proposalId: input.proposalId }),
      this.adapter.emergencyActions.listEmergencyActions({ tenantId: input.tenantId }),
      this.adapter.audit.listAuditRecords({
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
      }),
      this.adapter.receiptReferences.listReceiptReferences({
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
      }),
    ])
    const voteRows = input.proposalId
      ? await this.adapter.votes.listVotesForProposal(input.proposalId)
      : ok([] as GovernanceVoteRecord[])
    const reviewRows = input.proposalId
      ? await this.adapter.reviews.listReviewsForProposal(input.proposalId)
      : ok([] as GovernanceReviewRecord[])

    const entries: GovernanceTimelineEntry[] = []
    if (proposals.ok) entries.push(...proposals.value.items.map(item => this.proposalTimelineEntry(item)))
    if (decisions.ok) entries.push(...decisions.value.items.map(item => this.decisionTimelineEntry(item)))
    if (voteRows.ok) entries.push(...voteRows.value.map(item => this.voteTimelineEntry(item)))
    if (reviewRows.ok) entries.push(...reviewRows.value.map(item => this.reviewTimelineEntry(item)))
    if (emergencies.ok) entries.push(...emergencies.value.items.map(item => this.emergencyTimelineEntry(item)))
    if (audits.ok) entries.push(...audits.value.items.map(item => this.auditTimelineEntry(item)))
    if (receipts.ok) entries.push(...receipts.value.items.map(item => this.receiptTimelineEntry(item)))

    const filtered = input.proposalId ? entries.filter(entry => entry.entityId === input.proposalId) : entries
    const sorted = sortDesc(
      filtered,
      item => item.occurredAt,
      item => item.timelineId,
    )
    const paged = page(sorted, input)
    return ok({
      metadata: metadata(
        'governance-timeline',
        input.tenantId,
        sorted.map(item => item.occurredAt),
      ),
      entries: paged.items,
      page: paged.page,
    })
  }

  async projectDecisionHistory(input: ProjectTenantScopedInput): Promise<RepositoryResult<DecisionHistoryReadModel>> {
    const decisions = await this.adapter.decisions.listDecisions({
      tenantId: input.tenantId,
      proposalId: input.proposalId,
    })
    if (!decisions.ok) return decisions
    const items = sortDesc(
      decisions.value.items.map(item => ({
        decisionId: item.decisionId,
        proposalId: item.proposalId,
        tenantId: item.tenantId,
        decisionType: 'governance_decision',
        outcome: item.outcome,
        authority: item.authorityRef,
        decidedAt: updatedAt(item),
        evidenceReferences: item.evidenceReferences ?? [],
        executionImpact: 'record_only' as const,
        auditId: null,
      })),
      item => item.decidedAt,
      item => item.decisionId,
    )
    const paged = page(items, input)
    return ok({
      metadata: metadata(
        'decision-history',
        input.tenantId,
        items.map(item => item.decidedAt),
      ),
      items: paged.items,
      page: paged.page,
    })
  }

  async projectActorActivity(
    input: ProjectTenantScopedInput & { actorId: string },
  ): Promise<RepositoryResult<ActorActivityReadModel>> {
    const [proposals, votes, reviews, decisions, audits] = await Promise.all([
      this.adapter.proposals.listProposals({ tenantId: input.tenantId, actorId: input.actorId }),
      this.adapter.votes.listVotesByActor(input.actorId),
      this.adapter.reviews.listPendingReviews({ tenantId: input.tenantId, actorId: input.actorId }),
      this.adapter.decisions.listDecisions({ tenantId: input.tenantId, actorId: input.actorId }),
      this.adapter.audit.listAuditRecords({ tenantId: input.tenantId, actorId: input.actorId }),
    ])
    const items: ActorActivityItem[] = []
    if (proposals.ok) items.push(...proposals.value.items.map(item => this.proposalActivity(item, input.actorId)))
    if (votes.ok)
      items.push(...votes.value.filter(item => item.tenantId === input.tenantId).map(item => this.voteActivity(item)))
    if (reviews.ok) items.push(...reviews.value.map(item => this.reviewActivity(item)))
    if (decisions.ok) items.push(...decisions.value.items.map(item => this.decisionActivity(item)))
    if (audits.ok) items.push(...audits.value.items.map(item => this.auditActivity(item)))
    const sorted = sortDesc(
      items,
      item => item.occurredAt,
      item => item.activityId,
    )
    const paged = page(sorted, input)
    return ok({
      metadata: metadata(
        'actor-activity',
        input.tenantId,
        sorted.map(item => item.occurredAt),
      ),
      actorId: input.actorId,
      items: paged.items,
      page: paged.page,
    })
  }

  async projectTenantGovernanceSummary(input: {
    tenantId: string
  }): Promise<RepositoryResult<TenantGovernanceSummaryReadModel>> {
    const [proposals, reviews, decisions, emergencies, intents, audits] = await Promise.all([
      this.adapter.proposals.listProposals({ tenantId: input.tenantId }),
      this.adapter.reviews.listPendingReviews({ tenantId: input.tenantId }),
      this.adapter.decisions.listDecisions({ tenantId: input.tenantId }),
      this.adapter.emergencyActions.listEmergencyActions({ tenantId: input.tenantId }),
      this.adapter.executionIntents.listExecutionIntents({ tenantId: input.tenantId }),
      this.adapter.audit.listAuditRecords({ tenantId: input.tenantId }),
    ])
    const proposalItems = proposals.ok ? proposals.value.items : []
    const decisionItems = decisions.ok ? decisions.value.items : []
    const auditItems = audits.ok ? audits.value.items : []
    const counts = proposalItems.reduce<Record<string, number>>(
      (memo, item) => ({ ...memo, [item.status]: (memo[item.status] ?? 0) + 1 }),
      {},
    )
    return ok({
      metadata: metadata('tenant-governance-summary', input.tenantId, [
        ...proposalItems.map(updatedAt),
        ...decisionItems.map(updatedAt),
        ...auditItems.map(updatedAt),
      ]),
      tenantId: input.tenantId,
      proposalCountsByStatus: counts,
      openReviews: reviews.ok ? reviews.value.length : 0,
      pendingDecisions: decisionItems.filter(item => item.outcome === 'pending').length,
      activeEmergencyActions: emergencies.ok
        ? emergencies.value.items.filter(item => item.status === 'active' || item.status === 'requested').length
        : 0,
      blockedExecutionIntents: intents.ok
        ? intents.value.items.filter(item => item.executionStatus === 'blocked').length
        : 0,
      latestDecisionAt: maxDate(decisionItems.map(updatedAt)),
      latestAuditAt: maxDate(auditItems.map(updatedAt)),
    })
  }

  async projectEmergencyActions(input: ProjectTenantScopedInput): Promise<RepositoryResult<EmergencyActionReadModel>> {
    const actions = await this.adapter.emergencyActions.listEmergencyActions({
      tenantId: input.tenantId,
      status: input.status,
    })
    if (!actions.ok) return actions
    const sorted = [...actions.value.items.map(item => this.toEmergencyActionItem(item))].sort((left, right) => {
      const bySeverity = severityRank[left.severity] - severityRank[right.severity]
      return (
        bySeverity ||
        right.createdAt.localeCompare(left.createdAt) ||
        left.emergencyActionId.localeCompare(right.emergencyActionId)
      )
    })
    const paged = page(sorted, input)
    return ok({
      metadata: metadata(
        'emergency-actions',
        input.tenantId,
        sorted.map(item => item.createdAt),
      ),
      items: paged.items,
      page: paged.page,
    })
  }

  async projectAuditTrail(input: ProjectTenantScopedInput): Promise<RepositoryResult<AuditTrailReadModel>> {
    const audits = await this.adapter.audit.listAuditRecords({
      tenantId: input.tenantId,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
    })
    if (!audits.ok) return audits
    const items = sortDesc(
      audits.value.items.map(item => ({
        auditId: item.auditId,
        tenantId: item.tenantId,
        actorId: item.actorId,
        actionType: item.actionType,
        entityType: item.entityType,
        entityId: item.entityId,
        timestamp: updatedAt(item),
        decisionReference: null,
        evidenceReferenceCount: item.evidenceReferences?.length ?? 0,
        receiptReference: null,
        riskNotesPresent: false,
      })),
      item => item.timestamp,
      item => item.auditId,
    )
    const paged = page(items, input)
    return ok({
      metadata: metadata(
        'audit-trail',
        input.tenantId,
        items.map(item => item.timestamp),
      ),
      items: paged.items,
      page: paged.page,
    })
  }

  private async toProposalListItem(proposal: GovernanceProposalRecord): Promise<ProposalListItem> {
    const [versions, decisions, reviews, intents, emergencies] = await Promise.all([
      this.adapter.proposalVersions.listProposalVersions(proposal.proposalId),
      this.adapter.decisions.listDecisionsForProposal(proposal.proposalId),
      this.adapter.reviews.listReviewsForProposal(proposal.proposalId),
      this.adapter.executionIntents.listExecutionIntents({
        tenantId: proposal.tenantId,
        proposalId: proposal.proposalId,
      }),
      this.adapter.emergencyActions.listEmergencyActions({ tenantId: proposal.tenantId }),
    ])
    const versionItems = versions.ok ? versions.value : []
    return {
      proposalId: proposal.proposalId,
      tenantId: proposal.tenantId,
      title: proposal.title ?? proposal.proposalId,
      summary: null,
      status: proposal.status,
      proposerActorId: proposal.actorId ?? 'unknown',
      createdAt: proposal.createdAt,
      updatedAt: updatedAt(proposal),
      submittedAt: proposal.status === 'submitted' ? updatedAt(proposal) : null,
      decisionStatus: decisions.ok ? (decisions.value[0]?.outcome ?? null) : null,
      reviewStatus: reviews.ok ? (reviews.value[0]?.status ?? null) : null,
      emergencyFlag: emergencies.ok
        ? emergencies.value.items.some(item => item.status === 'active' || item.status === 'requested')
        : false,
      executionIntentStatus: executionIntentStatus(intents.ok ? intents.value.items : []),
      latestVersion: versionItems.reduce((latest, item) => Math.max(latest, item.version), 0),
      tags: [],
    }
  }

  private readonly toVersionSummary = (item: GovernanceProposalVersionRecord) => ({
    proposalId: item.proposalId,
    version: item.version,
    title: item.title ?? null,
    contentHash: item.contentHash ?? null,
    actorId: item.actorId ?? null,
    createdAt: item.createdAt,
  })

  private readonly toDecisionSummary = (item: GovernanceDecisionRecord) => ({
    decisionId: item.decisionId,
    proposalId: item.proposalId,
    outcome: item.outcome,
    authority: item.authorityRef,
    actorId: item.actorId,
    decidedAt: updatedAt(item),
    evidenceReferenceCount: item.evidenceReferences?.length ?? 0,
  })

  private readonly toVoteSummary = (item: GovernanceVoteRecord) => ({
    voteId: item.voteId,
    proposalId: item.proposalId,
    actorId: item.actorId,
    vote: item.vote,
    votingPower: item.votingPower ?? null,
    castAt: item.createdAt,
  })

  private readonly toReviewSummary = (item: GovernanceReviewRecord) => ({
    reviewId: item.reviewId,
    proposalId: item.proposalId,
    actorId: item.actorId,
    recommendation: item.recommendation,
    status: item.status,
    rationalePresent: Boolean(item.rationale),
    reviewedAt: updatedAt(item),
  })

  private readonly toEmergencyActionSummary = (item: GovernanceEmergencyActionRecord) => ({
    emergencyActionId: item.actionId,
    tenantId: item.tenantId,
    actionType: item.actionType,
    status: item.status,
    ratificationCount: item.ratifications?.length ?? 0,
    createdAt: item.createdAt,
  })

  private readonly toEmergencyActionItem = (item: GovernanceEmergencyActionRecord): EmergencyActionItem => ({
    emergencyActionId: item.actionId,
    tenantId: item.tenantId,
    proposalId: null,
    actionType: item.actionType,
    status: item.status,
    severity: emergencySeverity(item),
    reason: item.actionType,
    createdAt: item.createdAt,
    expiresAt: null,
    ratificationStatus: item.ratifications?.length ? 'ratified' : null,
    auditId: null,
  })

  private readonly proposalTimelineEntry = (item: GovernanceProposalRecord): GovernanceTimelineEntry => ({
    timelineId: `proposal:${item.proposalId}`,
    tenantId: item.tenantId,
    entityType: 'proposal',
    entityId: item.proposalId,
    eventType: `proposal.${item.status}`,
    actorId: item.actorId ?? null,
    occurredAt: updatedAt(item),
    summary: `Proposal ${item.status}`,
    severity: 'info',
    auditId: null,
    decisionReference: null,
    receiptReference: null,
  })

  private readonly decisionTimelineEntry = (item: GovernanceDecisionRecord): GovernanceTimelineEntry => ({
    timelineId: `decision:${item.decisionId}`,
    tenantId: item.tenantId,
    entityType: 'proposal',
    entityId: item.proposalId,
    eventType: 'decision.recorded',
    actorId: item.actorId,
    occurredAt: updatedAt(item),
    summary: `Decision ${item.outcome}`,
    severity: 'info',
    auditId: null,
    decisionReference: item.decisionId,
    receiptReference: null,
  })

  private readonly voteTimelineEntry = (item: GovernanceVoteRecord): GovernanceTimelineEntry => ({
    timelineId: `vote:${item.voteId}`,
    tenantId: item.tenantId,
    entityType: 'proposal',
    entityId: item.proposalId,
    eventType: 'vote.cast',
    actorId: item.actorId,
    occurredAt: item.createdAt,
    summary: `Vote ${item.vote}`,
    severity: 'info',
    auditId: null,
    decisionReference: null,
    receiptReference: null,
  })

  private readonly reviewTimelineEntry = (item: GovernanceReviewRecord): GovernanceTimelineEntry => ({
    timelineId: `review:${item.reviewId}`,
    tenantId: item.tenantId,
    entityType: 'proposal',
    entityId: item.proposalId,
    eventType: 'review.recorded',
    actorId: item.actorId,
    occurredAt: updatedAt(item),
    summary: `Review ${item.status}`,
    severity: item.status === 'pending' ? 'warning' : 'info',
    auditId: null,
    decisionReference: null,
    receiptReference: null,
  })

  private readonly emergencyTimelineEntry = (item: GovernanceEmergencyActionRecord): GovernanceTimelineEntry => ({
    timelineId: `emergency:${item.actionId}`,
    tenantId: item.tenantId,
    entityType: 'emergencyAction',
    entityId: item.actionId,
    eventType: 'emergency.action_recorded',
    actorId: item.actorId,
    occurredAt: updatedAt(item),
    summary: `Emergency action ${item.status}`,
    severity: emergencySeverity(item),
    auditId: null,
    decisionReference: null,
    receiptReference: null,
  })

  private readonly auditTimelineEntry = (item: GovernanceAuditRecord): GovernanceTimelineEntry => ({
    timelineId: `audit:${item.auditId}`,
    tenantId: item.tenantId,
    entityType: item.entityType,
    entityId: item.entityId,
    eventType: item.actionType,
    actorId: item.actorId,
    occurredAt: updatedAt(item),
    summary: item.actionType,
    severity: 'info',
    auditId: item.auditId,
    decisionReference: null,
    receiptReference: null,
  })

  private readonly receiptTimelineEntry = (item: GovernanceReceiptReferenceRecord): GovernanceTimelineEntry => ({
    timelineId: `receipt:${item.receiptId}`,
    tenantId: item.tenantId ?? 'unknown',
    entityType: item.entityType,
    entityId: item.entityId,
    eventType: 'receipt.reference_recorded',
    actorId: null,
    occurredAt: updatedAt(item),
    summary: `Receipt reference from ${item.source}`,
    severity: 'info',
    auditId: null,
    decisionReference: null,
    receiptReference: item.receiptId,
  })

  private readonly proposalActivity = (item: GovernanceProposalRecord, actorId: string): ActorActivityItem => ({
    activityId: `proposal:${item.proposalId}`,
    actorId,
    tenantId: item.tenantId,
    actionType: `proposal.${item.status}`,
    entityType: 'proposal',
    entityId: item.proposalId,
    occurredAt: updatedAt(item),
    summary: `Proposal ${item.status}`,
    auditId: null,
  })

  private readonly voteActivity = (item: GovernanceVoteRecord): ActorActivityItem => ({
    activityId: `vote:${item.voteId}`,
    actorId: item.actorId,
    tenantId: item.tenantId,
    actionType: 'vote.cast',
    entityType: 'proposal',
    entityId: item.proposalId,
    occurredAt: item.createdAt,
    summary: `Vote ${item.vote}`,
    auditId: null,
  })

  private readonly reviewActivity = (item: GovernanceReviewRecord): ActorActivityItem => ({
    activityId: `review:${item.reviewId}`,
    actorId: item.actorId,
    tenantId: item.tenantId,
    actionType: 'review.recorded',
    entityType: 'proposal',
    entityId: item.proposalId,
    occurredAt: updatedAt(item),
    summary: `Review ${item.status}`,
    auditId: null,
  })

  private readonly decisionActivity = (item: GovernanceDecisionRecord): ActorActivityItem => ({
    activityId: `decision:${item.decisionId}`,
    actorId: item.actorId,
    tenantId: item.tenantId,
    actionType: 'decision.recorded',
    entityType: 'proposal',
    entityId: item.proposalId,
    occurredAt: updatedAt(item),
    summary: `Decision ${item.outcome}`,
    auditId: null,
  })

  private readonly auditActivity = (item: GovernanceAuditRecord): ActorActivityItem => ({
    activityId: `audit:${item.auditId}`,
    actorId: item.actorId,
    tenantId: item.tenantId,
    actionType: item.actionType,
    entityType: item.entityType,
    entityId: item.entityId,
    occurredAt: updatedAt(item),
    summary: item.actionType,
    auditId: item.auditId,
  })
}
