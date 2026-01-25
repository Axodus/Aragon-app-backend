import { expect } from 'chai'
import sinon from 'sinon'
import { JsonRpcProvider } from 'ethers'
import { NetworksEnum, IProviderType } from '@types'
import rpcPool from '@modules/rpcPool'
import ProviderModule from '@modules/provider'

describe('RpcPool', () => {
  let providerProxiesStub: any
  let mockAragonProvider: sinon.SinonStubbedInstance<JsonRpcProvider>
  let mockDrpcProvider: sinon.SinonStubbedInstance<JsonRpcProvider>
  let mockAlchemyProvider: sinon.SinonStubbedInstance<JsonRpcProvider>

  beforeEach(() => {
    // Create mock providers
    mockAragonProvider = sinon.createStubInstance(JsonRpcProvider)
    mockDrpcProvider = sinon.createStubInstance(JsonRpcProvider)
    mockAlchemyProvider = sinon.createStubInstance(JsonRpcProvider)

    // Setup default successful responses
    mockAragonProvider.getBlockNumber.resolves(100000)
    mockDrpcProvider.getBlockNumber.resolves(100000)
    mockAlchemyProvider.getBlockNumber.resolves(100000)

    // Stub ProviderModule.providerProxies
    providerProxiesStub = {
      [NetworksEnum.harmonyMainnet]: {
        aragon: {
          rpc: mockAragonProvider,
          url: 'https://aragon-rpc.example.com',
        },
        drpc: {
          rpc: mockDrpcProvider,
          url: 'https://drpc.example.com',
        },
        alchemy: {
          rpc: mockAlchemyProvider,
          url: 'https://alchemy.example.com',
        },
      },
    }

    sinon.stub(ProviderModule, 'providerProxies').value(providerProxiesStub)
  })

  afterEach(() => {
    sinon.restore()
    rpcPool.shutdown()
  })

  describe('initialize', () => {
    it('should initialize pool with all available providers', () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)

      const status = rpcPool.getStatus(NetworksEnum.harmonyMainnet)

      expect(status).to.have.lengthOf(3)
      expect(status[0].providerType).to.equal(IProviderType.ARAGON)
      expect(status[1].providerType).to.equal(IProviderType.DRPC)
      expect(status[2].providerType).to.equal(IProviderType.ALCHEMY)

      // All should be healthy initially
      expect(status.every((s) => s.isHealthy)).to.be.true
      expect(status.every((s) => s.failureCount === 0)).to.be.true
    })

    it('should handle network with only one provider', () => {
      providerProxiesStub[NetworksEnum.harmonyTestnet] = {
        aragon: {
          rpc: mockAragonProvider,
          url: 'https://aragon-rpc-testnet.example.com',
        },
      }

      rpcPool.initialize(NetworksEnum.harmonyTestnet)

      const status = rpcPool.getStatus(NetworksEnum.harmonyTestnet)

      expect(status).to.have.lengthOf(1)
      expect(status[0].providerType).to.equal(IProviderType.ARAGON)
      expect(status[0].isHealthy).to.be.true
    })

    it('should not reinitialize if already initialized', () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)
      const statusBefore = rpcPool.getStatus(NetworksEnum.harmonyMainnet)

      // Try to initialize again
      rpcPool.initialize(NetworksEnum.harmonyMainnet)
      const statusAfter = rpcPool.getStatus(NetworksEnum.harmonyMainnet)

      // Status should be unchanged
      expect(statusAfter).to.deep.equal(statusBefore)
    })
  })

  describe('getProvider', () => {
    it('should return first healthy provider (Aragon priority)', () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)

      const provider = rpcPool.getProvider(NetworksEnum.harmonyMainnet)

      expect(provider).to.equal(mockAragonProvider)
    })

    it('should skip unhealthy providers and return next healthy one', async () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)

      // Simulate Aragon provider failure
      mockAragonProvider.getBlockNumber.rejects(new Error('Connection timeout'))

      // Execute operation to trigger failure
      try {
        await rpcPool.executeWithFailover(
          NetworksEnum.harmonyMainnet,
          (provider) => provider.getBlockNumber(),
          'getBlockNumber',
        )
      } catch {
        // Expected to fail on first attempt
      }

      // After 3 failures (maxFailures), Aragon should be marked unhealthy
      mockAragonProvider.getBlockNumber.rejects(new Error('Connection timeout'))
      try {
        await rpcPool.executeWithFailover(
          NetworksEnum.harmonyMainnet,
          (provider) => provider.getBlockNumber(),
          'getBlockNumber',
        )
      } catch {
        // Expected
      }

      try {
        await rpcPool.executeWithFailover(
          NetworksEnum.harmonyMainnet,
          (provider) => provider.getBlockNumber(),
          'getBlockNumber',
        )
      } catch {
        // Expected
      }

      // Now DRPC should be used
      const provider = rpcPool.getProvider(NetworksEnum.harmonyMainnet)
      expect(provider).to.equal(mockDrpcProvider)
    })
  })

  describe('executeWithFailover', () => {
    beforeEach(() => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)
    })

    it('should execute operation with first healthy provider', async () => {
      mockAragonProvider.getBlockNumber.resolves(123456)

      const result = await rpcPool.executeWithFailover(
        NetworksEnum.harmonyMainnet,
        (provider) => provider.getBlockNumber(),
        'getBlockNumber',
      )

      expect(result).to.equal(123456)
      expect(mockAragonProvider.getBlockNumber.calledOnce).to.be.true
    })

    it('should failover to next provider when first fails', async () => {
      mockAragonProvider.getBlockNumber.rejects(new Error('Network error'))
      mockDrpcProvider.getBlockNumber.resolves(123456)

      const result = await rpcPool.executeWithFailover(
        NetworksEnum.harmonyMainnet,
        (provider) => provider.getBlockNumber(),
        'getBlockNumber',
      )

      expect(result).to.equal(123456)
      expect(mockAragonProvider.getBlockNumber.calledOnce).to.be.true
      expect(mockDrpcProvider.getBlockNumber.calledOnce).to.be.true
    })

    it('should try all providers before throwing error', async () => {
      mockAragonProvider.getBlockNumber.rejects(new Error('Aragon error'))
      mockDrpcProvider.getBlockNumber.rejects(new Error('DRPC error'))
      mockAlchemyProvider.getBlockNumber.rejects(new Error('Alchemy error'))

      try {
        await rpcPool.executeWithFailover(
          NetworksEnum.harmonyMainnet,
          (provider) => provider.getBlockNumber(),
          'getBlockNumber',
        )
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error.message).to.include('Alchemy error')
      }

      expect(mockAragonProvider.getBlockNumber.calledOnce).to.be.true
      expect(mockDrpcProvider.getBlockNumber.calledOnce).to.be.true
      expect(mockAlchemyProvider.getBlockNumber.calledOnce).to.be.true
    })

    it('should reset failure count on successful operation', async () => {
      // First failure
      mockAragonProvider.getBlockNumber.onFirstCall().rejects(new Error('Temporary error'))
      mockDrpcProvider.getBlockNumber.resolves(100000)

      await rpcPool.executeWithFailover(
        NetworksEnum.harmonyMainnet,
        (provider) => provider.getBlockNumber(),
        'getBlockNumber',
      )

      const statusAfterFailure = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
      expect(statusAfterFailure[0].failureCount).to.equal(1)

      // Successful operation
      mockAragonProvider.getBlockNumber.resolves(100001)

      await rpcPool.executeWithFailover(
        NetworksEnum.harmonyMainnet,
        (provider) => provider.getBlockNumber(),
        'getBlockNumber',
      )

      const statusAfterRecovery = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
      expect(statusAfterRecovery[0].failureCount).to.equal(0)
    })

    it('should mark endpoint unhealthy after maxFailures consecutive errors', async () => {
      mockAragonProvider.getBlockNumber.rejects(new Error('Persistent error'))
      mockDrpcProvider.getBlockNumber.resolves(100000)

      // Execute 3 times to reach maxFailures threshold
      for (let i = 0; i < 3; i++) {
        await rpcPool.executeWithFailover(
          NetworksEnum.harmonyMainnet,
          (provider) => provider.getBlockNumber(),
          'getBlockNumber',
        )
      }

      const status = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
      const aragonStatus = status.find((s) => s.providerType === IProviderType.ARAGON)

      expect(aragonStatus?.isHealthy).to.be.false
      expect(aragonStatus?.failureCount).to.be.gte(3)
    })
  })

  describe('Health Checks', () => {
    it('should perform periodic health checks on all endpoints', async () => {
      // Use fake timers to control time
      const clock = sinon.useFakeTimers()

      try {
        rpcPool.initialize(NetworksEnum.harmonyMainnet)

        // Fast-forward 30 seconds (default health check interval)
        await clock.tickAsync(30000)

        // All providers should have been health checked
        expect(mockAragonProvider.getBlockNumber.called).to.be.true
        expect(mockDrpcProvider.getBlockNumber.called).to.be.true
        expect(mockAlchemyProvider.getBlockNumber.called).to.be.true
      } finally {
        clock.restore()
      }
    })

    it('should recover unhealthy endpoint when health check succeeds', async () => {
      const clock = sinon.useFakeTimers()

      try {
        rpcPool.initialize(NetworksEnum.harmonyMainnet)

        // Mark Aragon as unhealthy by causing failures
        mockAragonProvider.getBlockNumber.rejects(new Error('Temporary failure'))
        mockDrpcProvider.getBlockNumber.resolves(100000)

        for (let i = 0; i < 3; i++) {
          await rpcPool.executeWithFailover(
            NetworksEnum.harmonyMainnet,
            (provider) => provider.getBlockNumber(),
            'getBlockNumber',
          )
        }

        const statusUnhealthy = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
        expect(statusUnhealthy[0].isHealthy).to.be.false

        // Restore Aragon provider
        mockAragonProvider.getBlockNumber.resolves(100001)

        // Fast-forward to trigger health check (unhealthy endpoints check every 60s)
        await clock.tickAsync(60000)

        const statusRecovered = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
        expect(statusRecovered[0].isHealthy).to.be.true
        expect(statusRecovered[0].failureCount).to.equal(0)
      } finally {
        clock.restore()
      }
    })
  })

  describe('Stress Tests & Edge Cases', () => {
    it('should handle rapid consecutive failures gracefully', async () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)

      mockAragonProvider.getBlockNumber.rejects(new Error('Overloaded'))
      mockDrpcProvider.getBlockNumber.resolves(100000)

      // Execute 10 rapid requests
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          rpcPool.executeWithFailover(
            NetworksEnum.harmonyMainnet,
            (provider) => provider.getBlockNumber(),
            'getBlockNumber',
          ),
        )
      }

      const results = await Promise.all(promises)

      // All should succeed via DRPC failover
      expect(results.every((r) => r === 100000)).to.be.true
    })

    it('should handle all providers being unhealthy', async () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)

      // Make all providers fail
      mockAragonProvider.getBlockNumber.rejects(new Error('Aragon down'))
      mockDrpcProvider.getBlockNumber.rejects(new Error('DRPC down'))
      mockAlchemyProvider.getBlockNumber.rejects(new Error('Alchemy down'))

      // Trigger failures to mark all unhealthy
      for (let i = 0; i < 3; i++) {
        try {
          await rpcPool.executeWithFailover(
            NetworksEnum.harmonyMainnet,
            (provider) => provider.getBlockNumber(),
            'getBlockNumber',
          )
        } catch {
          // Expected
        }
      }

      const status = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
      expect(status.every((s) => !s.isHealthy)).to.be.true

      // Should still return a provider (first one) even if all unhealthy
      const provider = rpcPool.getProvider(NetworksEnum.harmonyMainnet)
      expect(provider).to.exist
    })

    it('should handle provider timeout during health check', async () => {
      const clock = sinon.useFakeTimers()

      try {
        rpcPool.initialize(NetworksEnum.harmonyMainnet)

        // Simulate timeout by never resolving
        mockAragonProvider.getBlockNumber.returns(new Promise(() => {}))

        // Fast-forward past health check timeout (5 seconds)
        await clock.tickAsync(30000)

        const status = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
        const aragonStatus = status.find((s) => s.providerType === IProviderType.ARAGON)

        // Should be marked unhealthy due to timeout
        expect(aragonStatus?.failureCount).to.be.gte(1)
      } finally {
        clock.restore()
      }
    })
  })

  describe('getStatus', () => {
    it('should return status of all endpoints', () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)

      const status = rpcPool.getStatus(NetworksEnum.harmonyMainnet)

      expect(status).to.have.lengthOf(3)
      expect(status[0]).to.have.all.keys(
        'providerType',
        'isHealthy',
        'failureCount',
        'lastHealthCheck',
        'lastFailureTime',
      )
    })

    it('should return empty array for uninitialized network', () => {
      const status = rpcPool.getStatus(NetworksEnum.harmonyTestnet)

      expect(status).to.be.an('array').that.is.empty
    })
  })

  describe('shutdown', () => {
    it('should stop all health checks and clear pools', () => {
      rpcPool.initialize(NetworksEnum.harmonyMainnet)

      const statusBefore = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
      expect(statusBefore).to.have.lengthOf(3)

      rpcPool.shutdown()

      const statusAfter = rpcPool.getStatus(NetworksEnum.harmonyMainnet)
      expect(statusAfter).to.be.an('array').that.is.empty
    })
  })
})
