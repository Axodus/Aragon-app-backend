import { expect } from 'chai'
import { ReorgDetectionHelper } from '@helpers/reorgDetection'
import { NetworksEnum } from '@types'

describe('Helpers:ReorgDetection', () => {
  describe('getConfirmationThreshold', () => {
    it('uses finality from the Axodus chain registry', () => {
      expect(ReorgDetectionHelper.getConfirmationThreshold(NetworksEnum.ethereumSepolia)).to.equal(12)
      expect(ReorgDetectionHelper.getConfirmationThreshold(NetworksEnum.baseMainnet)).to.equal(30)
      expect(ReorgDetectionHelper.getConfirmationThreshold(NetworksEnum.arbitrumMainnet)).to.equal(30)
      expect(ReorgDetectionHelper.getConfirmationThreshold(NetworksEnum.polygonMainnet)).to.equal(128)
      expect(ReorgDetectionHelper.getConfirmationThreshold(NetworksEnum.harmonyMainnet)).to.equal(100)
    })

    it('keeps legacy aliases compatible', () => {
      expect(ReorgDetectionHelper.getConfirmationThreshold('sepolia')).to.equal(12)
      expect(ReorgDetectionHelper.getConfirmationThreshold('polygon')).to.equal(128)
      expect(ReorgDetectionHelper.getConfirmationThreshold('harmony')).to.equal(100)
    })

    it('falls back to 12 confirmations for unknown networks', () => {
      expect(ReorgDetectionHelper.getConfirmationThreshold('unknown-network')).to.equal(12)
    })
  })
})
