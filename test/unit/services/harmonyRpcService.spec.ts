/* eslint-env mocha */

import { afterEach, describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import HarmonyRpc from '@helpers/harmonyRpc'
import { NetworksEnum } from '@types'
import { HarmonyRpcService } from '@services/harmonyRpcService'
import { toHarmonyBech32Address } from '@src/utils/harmonyAddressUtils'

describe('HarmonyRpcService', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('normalizes validator info and caches results', async () => {
    const service = new HarmonyRpcService({ network: NetworksEnum.harmonyMainnet, cacheTtlMs: 60_000 })

    const validatorHex = '0x1111111111111111111111111111111111111111'
    const validatorOne = toHarmonyBech32Address(validatorHex)

    const stub = sinon.stub(HarmonyRpc, 'getValidatorInformation').resolves({
      validator: {
        address: validatorOne,
        name: 'My Validator',
        rate: '0.050000000000000000',
      },
      'total-delegation': '123',
      'active-status': 'active',
      'currently-in-committee': true,
    })

    const first = await service.getValidatorInformation(validatorOne)
    const second = await service.getValidatorInformation(validatorOne)

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

    const validatorHex = '0x1111111111111111111111111111111111111111'
    const delegatorHex = '0x2222222222222222222222222222222222222222'
    const validatorOne = toHarmonyBech32Address(validatorHex)
    const delegatorOne = toHarmonyBech32Address(delegatorHex)

    const stub = sinon.stub(HarmonyRpc, 'getDelegationsByValidator').resolves([
      {
        validator_address: validatorOne,
        delegator_address: delegatorOne,
        amount: '42',
        reward: '7',
      },
    ])

    const delegations = await service.getDelegationsByValidator(validatorOne)

    expect(stub.callCount).to.equal(1)
    expect(delegations).to.have.length(1)
    expect(delegations[0].validatorAddress).to.match(/^0x[0-9a-fA-F]{40}$/)
    expect(delegations[0].delegatorAddress).to.match(/^0x[0-9a-fA-F]{40}$/)
    expect(delegations[0].amount).to.equal(42n)
    expect(delegations[0].reward).to.equal(7n)
  })
})
