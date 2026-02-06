/* eslint-env mocha */

import { afterEach, describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { Models } from '@dbModels'
import { NetworksEnum } from '@types'
import { HarmonyRpcService } from '@services/harmonyRpcService'
import PluginsController from '@api/controllers/plugins'

describe('PluginsController.getDelegationVotingVotingPower', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('returns voting power based on delegation to plugin validator', async () => {
    const query = {
      select: () => query,
      lean: () => query,
      exec: async () => ({ validatorAddress: 'one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7' }),
    } as any

    sinon.stub(Models.ValidatorConfig, 'findOne').returns(query)

    sinon.stub(HarmonyRpcService.prototype, 'getDelegationsByDelegator').resolves([
      {
        validatorAddress: '0x1111111111111111111111111111111111111111',
        delegatorAddress: '0x2222222222222222222222222222222222222222',
        amount: 0n,
        reward: 0n,
      },
      {
        validatorAddress: 'one1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqd39ym7',
        delegatorAddress: '0x2222222222222222222222222222222222222222',
        amount: 5n * 10n ** 18n,
        reward: 0n,
      },
    ] as any)

    const res = await PluginsController.getDelegationVotingVotingPower({
      network: NetworksEnum.harmonyMainnet,
      pluginAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      voterAddress: '0x2222222222222222222222222222222222222222',
    })

    expect(res.votingPowerRaw).to.equal((5n * 10n ** 18n).toString())
    expect(res.votingPower).to.equal('5.0')
    expect(res.canVote).to.equal(true)
  })

  it('returns canVote=false when user has no matching delegation', async () => {
    const query = {
      select: () => query,
      lean: () => query,
      exec: async () => ({ validatorAddress: '0x3333333333333333333333333333333333333333' }),
    } as any

    sinon.stub(Models.ValidatorConfig, 'findOne').returns(query)

    sinon.stub(HarmonyRpcService.prototype, 'getDelegationsByDelegator').resolves([
      {
        validatorAddress: '0x1111111111111111111111111111111111111111',
        delegatorAddress: '0x2222222222222222222222222222222222222222',
        amount: 7n * 10n ** 18n,
        reward: 0n,
      },
    ] as any)

    const res = await PluginsController.getDelegationVotingVotingPower({
      network: NetworksEnum.harmonyMainnet,
      pluginAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      voterAddress: '0x2222222222222222222222222222222222222222',
    })

    expect(res.votingPowerRaw).to.equal('0')
    expect(res.votingPower).to.equal('0.0')
    expect(res.canVote).to.equal(false)
  })
})
