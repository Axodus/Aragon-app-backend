import Koa from 'koa'
import MainMiddleware from '@middlewares/index'
import logger from '@logger'
import config from '@config'
import MainRouter from '@api/routers'

const llo = logger.logMeta.bind(null, { service: 'api' })

const API = async (): Promise<Koa> =>
  await new Promise(resolve => {
    const app = new Koa()
    app.on('error', (error: any) => logger.error('Unexpected API error', llo({ error })))

    app.use(MainMiddleware(MainRouter.router()))

    const portFromEnv = process.env.PORT ? Number(process.env.PORT) : undefined
    const port = Number.isFinite(portFromEnv) && portFromEnv && portFromEnv > 0 ? portFromEnv : config.SERVICES.ARAGON_API.PORT

    const server = app.listen(port, '0.0.0.0')
    logger.info('Listening', llo({ port }))
    resolve(app)

    server.setTimeout(config.SERVICES.ARAGON_API.TIMEOUT * 1000)
  })

export default API
