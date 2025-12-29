import { ErrorKeyEnum, IJwtAuthType, IJwtTokenType } from '@types'
import JwtHelper from '@helpers/jwt'
import { type SignOptions } from 'jsonwebtoken'
import { assertExposable } from '@errors'
import { Models } from '@dbModels'
import type { RouterContext } from '@koa/router'
import type { Next } from 'koa'
import TwoFaHelper from '@helpers/2fa'
import type { SaveOptions } from 'mongoose'

const AuthMiddleware = {
  _generateJWTLogin(tokenValue: string, userAgent: string | null, tokenType: IJwtTokenType, opts: SignOptions = {}) {
    return JwtHelper.generateJWT(
      {
        auth: `aragon-${tokenType}`,
        agent: userAgent || null,
        token: tokenValue,
      },
      opts,
    )
  },

  _assertJwtTypes: (allowedTypes: IJwtTokenType[]) => async (ctx: RouterContext) => {
    const jwtState = ctx.state[JwtHelper.JWT_KEY]
    const tokenValue = jwtState ? jwtState.token : null
    const auth = jwtState ? jwtState.auth : null

    assertExposable(!!tokenValue, ErrorKeyEnum.accessDenied)
    assertExposable(typeof auth === 'string', ErrorKeyEnum.accessDenied)

    const allowedAuthValues = allowedTypes.map(type => `aragon-${type}`)
    assertExposable(allowedAuthValues.includes(auth), ErrorKeyEnum.accessDenied)

    const token = ctx.state.token || (await Models.Jwt.findByValue(tokenValue))
    assertExposable(!!token && token.type === IJwtAuthType.auth, ErrorKeyEnum.accessDenied)

    await token.updateOnly()
    ctx.state.token = token
  },

  async generateJwtAuth(type: IJwtTokenType, tOpts?: SaveOptions): Promise<string> {
    const secret = TwoFaHelper.generateSecret(20)
    const token = await Models.Jwt.create({ value: secret.base32, type: IJwtAuthType.auth }, tOpts)
    return AuthMiddleware._generateJWTLogin(token.value, null, type)
  },

  authAssertAdmin: () => async (ctx: RouterContext, next: Next) => {
    await AuthMiddleware._assertJwtTypes([IJwtTokenType.admin])(ctx)

    // const tokenExpired = moment(token.updatedAt).isBefore(moment().subtract({ days: CONFIG.SERVICES.API.SESSION_EXPIRATION_DAY }))
    // if (tokenExpired) {
    //   await token.deleteOne()
    //   assertExposable(!tokenExpired, ErrorKeyEnum.tokenExpired)
    // }
    return next()
  },

  authAssertAdminOrRoot: () => async (ctx: RouterContext, next: Next) => {
    await AuthMiddleware._assertJwtTypes([IJwtTokenType.admin, IJwtTokenType.root])(ctx)
    return next()
  },
}

export default AuthMiddleware
