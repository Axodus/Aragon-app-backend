/* eslint-env mocha */

import { afterEach, describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import HarmonyRpc from '@helpers/harmonyRpc'
import { NetworksEnum } from '@types'
import { HarmonyRpcService } from '@services/harmonyRpcService'

describe('HarmonyRpcService', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('normalizes validator info and caches results', async () => {
    const service = new HarmonyRpcService({ network: NetworksEnum.harmonyMainnet, cacheTtlMs: 60_000 })

    const stub = sinon.stub(HarmonyRpc, 'getValidatorInformation').resolves({
      validator: {
        address: 'one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7',
        name: 'My Validator',
        rate: '0.050000000000000000',
      },
      'total-delegation': '123',
      'active-status': 'active',
      'currently-in-committee': true,
    })

    const first = await service.getValidatorInformation('one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7')
    const second = await service.getValidatorInformation('one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7')

    expect(stub.callCount).to.equal(1)

    expect(first.address).to.match(/^0x[0-9a-fA-F]{40}$/)
    expect(first.name).to.equal('My Validator')
    expect(first.rate).to.equal('0.050000000000000000')
    expect(first.totalDelegation).to.equal(123n)
    expect(first.activeStatus).to.equal('active')
    expect(first.currentlyInCommittee).to.equal(true)

    expect(second).to.deep.equal(first)
  })

  it('maps delegations from validator', async () => {
    const service = new HarmonyRpcService({ network: NetworksEnum.harmonyMainnet, cacheTtlMs: 60_000 })

    const stub = sinon.stub(HarmonyRpc, 'getDelegationsByValidator').resolves([
      {
        validator_address: 'one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7',
        delegator_address: 'one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7',
        amount: '42',
        reward: '7',
      },
    ])

    const delegations = await service.getDelegationsByValidator('one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7')

    expect(stub.callCount).to.equal(1)
    expect(delegations).to.have.length(1)
    expect(delegations[0].validatorAddress).to.match(/^0x[0-9a-fA-F]{40}$/)
    expect(delegations[0].delegatorAddress).to.match(/^0x[0-9a-fA-F]{40}$/)
    expect(delegations[0].amount).to.equal(42n)
    expect(delegations[0].reward).to.equal(7n)
  })
})
