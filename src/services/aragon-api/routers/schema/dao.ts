import Joi from 'joi'
import ValidationSchema from '@helpers/validationSchema'
import { NetworksEnum } from '@types'

const DaoSchema = {
  getExtraParams: Joi.object({
    networks: ValidationSchema.joiNetworks.optional(),
    address: ValidationSchema.joiAddress.optional(),
    pluginAddress: ValidationSchema.joiAddress.optional(),
  }),

  getExtraParamsV2: Joi.object({
    networks: ValidationSchema.joiNetworks.required(),
    address: ValidationSchema.joiAddress.optional(),
    pluginAddress: ValidationSchema.joiAddress.optional(),
  }),

  getDaosByMember: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .optional(),
    networks: ValidationSchema.joiNetworks.optional(),
    memberAddress: Joi.alternatives().try(ValidationSchema.joiAddress.required(), ValidationSchema.joiEns.required()),
    excludeDaoId: Joi.string().optional(),
  }),

  getDaoById: Joi.object({
    id: ValidationSchema.joiDaoId.required(),
  }),

  getDaoByAddress: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    address: ValidationSchema.joiAddress.required(),
  }),

  getDaoByEns: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    ens: ValidationSchema.joiEns.required(),
  }),

  setDaoEnsByDaoAdmin: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    address: ValidationSchema.joiAddress.required(),
    ens: Joi.alternatives().try(ValidationSchema.joiEns, Joi.allow(null, '')),
    signer: ValidationSchema.joiAddress.required(),
    signature: Joi.string()
      .trim()
      .pattern(/^0x([0-9a-fA-F]{128}|[0-9a-fA-F]{130})$/)
      .required(),
    issuedAt: Joi.number().integer().min(0).required(),
  }),
}

export default DaoSchema
