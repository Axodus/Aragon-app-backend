import * as sinon from 'sinon'
import { SinonSandbox } from 'sinon'
import { expect } from 'chai'
import Router from '@koa/router'
import MainAdminRouter from '@admin-api/routers/index'
import StatusAdminRouter from '@admin-api/routers/status'
import QueueAdminRouter from '@admin-api/routers/queue'
import DaoAdminRouter from '@admin-api/routers/dao'
import Koa from 'koa'
import supertest from 'supertest'
import CapitalDistributorAdminRouter from '@admin-api/routers/capitalDistributor'
import MetricsAdminRouter from '@admin-api/routers/metrics'
import HarmonyVotingAdminRouter from '@admin-api/routers/harmonyVoting'

describe('Router: MainAdminRouter', () => {
  let sandbox: SinonSandbox

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox?.restore()
  })

  it('Should get main admin router', async () => {
    const use = sandbox.stub(Router.prototype, 'use')

    function stubRouter(Rt: any, name: string) {
      return sandbox.stub(Rt, 'router').returns({
        routes: sandbox.stub().returns(`${name}Routes`),
        allowedMethods: sandbox.stub().returns(`${name}AllowedMethod`),
      })
    }

    stubRouter(StatusAdminRouter, 'status')
    stubRouter(QueueAdminRouter, 'queue')
    stubRouter(DaoAdminRouter, 'dao')
    stubRouter(CapitalDistributorAdminRouter, 'capital-distributor')
    stubRouter(MetricsAdminRouter, 'metrics')
    stubRouter(HarmonyVotingAdminRouter, 'harmony-voting')

    // Removed unnecessary 1000ms wait

    const mainRouter = MainAdminRouter.router()
    expect(mainRouter instanceof Router).to.be.true

    const routers = [
      StatusAdminRouter,
      MetricsAdminRouter,
      QueueAdminRouter,
      DaoAdminRouter,
      CapitalDistributorAdminRouter,
      HarmonyVotingAdminRouter,
    ]
    // Status is mounted without a path prefix, DAO is mounted twice (with and without "/dao")
    // for reverse-proxy compatibility.
    expect(use.callCount).to.be.eq(7)
    expect(use.calledWith(`statusRoutes`, `statusAllowedMethod`)).to.be.true

    function expectRouter(name: string) {
      expect(use.calledWith(`/${name}`, `${name}Routes`, `${name}AllowedMethod`)).to.be.true
    }

    expectRouter('queue')
    expectRouter('metrics')
    expectRouter('dao')
    expectRouter('capital-distributor')
    expectRouter('harmony-voting')

    // DAO router also mounted at root
    expect(use.calledWith(`daoRoutes`, `daoAllowedMethod`)).to.be.true
  })

  it('Should setup main router with all child routers', async () => {
    const app = new Koa()
    app.use(MainAdminRouter.router().routes())
    const request = supertest(app.callback())

    await request.get('/').expect(200)
  })
})
