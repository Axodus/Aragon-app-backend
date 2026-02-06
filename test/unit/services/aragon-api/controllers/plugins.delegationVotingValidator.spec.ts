/* eslint-env mocha */

import { afterEach, describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { Models } from '@dbModels'
import { NetworksEnum } from '@types'
import { HarmonyRpcService } from '@services/harmonyRpcService'
import PluginsController from '@api/controllers/plugins'

describe('PluginsController.getDelegationVotingValidator', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('returns validator + paginated members derived from Harmony delegations', async () => {
    const query = {
      select: () => query,
      lean: () => query,
      exec: async () => ({ validatorAddress: '0x1111111111111111111111111111111111111111' }),
    } as any

    sinon.stub(Models.ValidatorConfig, 'findOne').returns(query)

    sinon.stub(HarmonyRpcService.prototype, 'getValidatorInformation').resolves({
      address: '0x1111111111111111111111111111111111111111',
      name: 'My Validator',
      rate: '0.050000000000000000',
      totalDelegation: 0n,
      activeStatus: 'active',
      currentlyInCommittee: true,
    })

    sinon.stub(HarmonyRpcService.prototype, 'getDelegationsByValidator').resolves([
      {
        validatorAddress: '0x1111111111111111111111111111111111111111',
        delegatorAddress: '0x2222222222222222222222222222222222222222',
        amount: 10n * 10n ** 18n,
        reward: 1n * 10n ** 18n,
      },
      {
        validatorAddress: '0x1111111111111111111111111111111111111111',
        delegatorAddress: '0x3333333333333333333333333333333333333333',
        amount: 20n * 10n ** 18n,
        reward: 2n * 10n ** 18n,
      },
    ] as any)

    const res = await PluginsController.getDelegationVotingValidator({
      network: NetworksEnum.harmonyMainnet,
      pluginAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      page: 1,
      pageSize: 1,
    })

    expect(res.validatorAddress).to.equal('0x1111111111111111111111111111111111111111')
    expect(res.validatorName).to.equal('My Validator')
    expect(res.commissionRate).to.equal('5.00%')
    expect(res.isActive).to.equal(true)
    expect(res.isInCommittee).to.equal(true)

    expect(res.membersCount).to.equal(2)
    expect(res.members).to.have.length(1)

    expect(res.totalVotingPowerRaw).to.equal((30n * 10n ** 18n).toString())
    expect(res.members[0].votingPowerRaw).to.equal((10n * 10n ** 18n).toString())
    expect(res.members[0].pendingReward).to.equal('1.0')
    expect(res.members[0].addressOne.startsWith('one1')).to.equal(true)
  })
})
