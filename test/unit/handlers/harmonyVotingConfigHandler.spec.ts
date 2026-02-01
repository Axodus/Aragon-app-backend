import '@test/environment'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { beforeEach, afterEach, describe, it } from 'mocha'
import { Models } from '@dbModels'
import { HarmonyVotingConfigHandler } from '@handlers/harmonyVotingConfigHandler'
import { NetworksEnum } from '@types'

describe('HarmonyVotingConfigHandler', () => {
  let sandbox: sinon.SinonSandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    sandbox
      .stub(Models.ValidatorConfig as any, 'getEntityId')
      .callsFake(({ network, pluginAddress }: any) => `${network}-${pluginAddress}`)

    sandbox.stub(Models.ValidatorConfig as any, 'findOneAndUpdate').resolves({})
    sandbox.stub(Models.Plugin as any, 'updateOne').resolves({ acknowledged: true })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('upserts validator address on ValidatorAddressUpdated', async () => {
    const parsedEvent: any = { args: { oldAddress: '0x0000000000000000000000000000000000000001', newAddress: '0x0000000000000000000000000000000000000002' } }
    const info: any = {
      address: '0x0000000000000000000000000000000000000010',
      network: NetworksEnum.harmonyMainnet,
      transactionHash: '0xabc',
      blockNumber: 123,
    }

    await HarmonyVotingConfigHandler.validatorAddressUpdated(parsedEvent, info)

    expect((Models as any).ValidatorConfig.findOneAndUpdate.calledOnce).to.equal(true)
  })

  it('upserts processKey and updates Plugin.processKey on ProcessKeyConfigured', async () => {
    const parsedEvent: any = { args: { processKey: '0x' + '11'.repeat(32) } }
    const info: any = {
      address: '0x0000000000000000000000000000000000000010',
      network: NetworksEnum.harmonyMainnet,
      transactionHash: '0xabc',
      blockNumber: 123,
    }

    await HarmonyVotingConfigHandler.processKeyConfigured(parsedEvent, info)

    expect((Models as any).ValidatorConfig.findOneAndUpdate.calledOnce).to.equal(true)
    expect((Models as any).Plugin.updateOne.calledOnce).to.equal(true)
  })
})
