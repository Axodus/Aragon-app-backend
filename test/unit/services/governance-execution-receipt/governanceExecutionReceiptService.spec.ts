import { expect } from 'chai'
import GovernanceExecutionReceiptService from '@services/governance-execution-receipt/governanceExecutionReceiptService'
import type { GovernanceExecutionReceipt } from '@services/governance-execution-receipt/types'

describe('Service: GovernanceExecutionReceiptService', () => {
  it('lists mock-first execution receipts without production proof', async () => {
    const response = await GovernanceExecutionReceiptService.listExecutionReceipts()
    const receipts = response.data as GovernanceExecutionReceipt[]

    expect(receipts).to.have.length.greaterThan(0)
    expect(response.metadata.defaultReceiptStatus).to.equal('mock')
    expect(response.metadata.productionProofEnabled).to.equal(false)
    expect(response.metadata.fakeTransactionHashesAllowed).to.equal(false)
    expect(receipts.every(receipt => receipt.executionTxHash === null)).to.equal(true)
    expect(receipts.every(receipt => receipt.executionBlockNumber === null)).to.equal(true)
  })

  it('gets execution receipt by proposal id', async () => {
    const response =
      await GovernanceExecutionReceiptService.getExecutionReceiptForProposal('proposal-mock-executable-001')
    const receipt = response.data as GovernanceExecutionReceipt

    expect(receipt.executionReceiptId).to.equal('receipt-mock-executable-001')
    expect(receipt.executionMode).to.equal('mock_execution')
    expect(receipt.receiptStatus).to.equal('mock')
    expect(receipt.receiptSource).to.equal('mock_service')
  })
})
