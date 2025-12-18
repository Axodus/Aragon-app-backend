import type Koa from 'koa'

const ALLOWED_ORIGINS = new Set([
  'https://governance.country',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4000',
])

const LOCALHOST_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/

const applyCorsHeaders = (ctx: Koa.Context) => {
  const origin = ctx.request.headers.origin
  const isAllowedOrigin =
    typeof origin === 'string' && (ALLOWED_ORIGINS.has(origin) || LOCALHOST_ORIGIN_RE.test(origin))

  if (isAllowedOrigin && origin) {
    ctx.response.set('Access-Control-Allow-Origin', origin)
    ctx.response.set('Vary', 'Origin')
  } else {
    ctx.response.set('Access-Control-Allow-Origin', '*')
  }

  ctx.response.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  ctx.response.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Origin, X-Requested-With, X-API-Key, Access-Control-Request-Private-Network',
  )
}

const applySecurityHeaders = (ctx: Koa.Context) => {
  ctx.response.set('referrer-policy', 'no-referrer')
  ctx.response.set('x-content-type-options', 'nosniff')
  ctx.response.set('x-frame-options', 'DENY')
  ctx.response.set('content-security-policy', "default-src 'self' https:")
  ctx.response.set('x-xss-protection', '1; mode=block')
  ctx.response.set('strict-transport-security', 'max-age=2592000; includeSubDomains')
}

const applyPrivateNetworkAccessHeaders = (ctx: Koa.Context) => {
  // Private Network Access (Chrome): respond positively to PNA preflight.
  // https://developer.chrome.com/blog/private-network-access-preflight/
  if (ctx.request.headers['access-control-request-private-network'] === 'true') {
    ctx.response.set('Access-Control-Allow-Private-Network', 'true')
  }
}

const securityMiddleware = () => async (ctx: Koa.Context, next: Koa.Next) => {
  // CORS: allow local dev and governance.country to call the local backend.
  // Note: browsers may require Private Network Access preflight for public→localhost.
  applyCorsHeaders(ctx)
  applySecurityHeaders(ctx)
  applyPrivateNetworkAccessHeaders(ctx)

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204
    return
  }

  return await next()
}

export default securityMiddleware
