import Joi from 'joi'
import ValidationSchema from '@helpers/validationSchema'
import { IEventLogPluginType, IPluginInterfaceType, IPluginStatus, NetworksEnum } from '@types'

const PluginSchema = {
  getInstallationData: Joi.object({
    pluginAddress: ValidationSchema.joiAddress.required(),
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
  }),

  getPluginsByDaoUrlParams: Joi.object({
    daoAddress: ValidationSchema.joiAddress.required(),
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
  }),

  getPluginsByDaoQueryParams: Joi.object({
    interfaceType: Joi.string()
      .valid(...Object.values(IPluginInterfaceType))
      .optional(),
    status: Joi.string()
      .valid(...Object.values(IPluginStatus))
      .optional(),
    isProcess: Joi.boolean().optional(),
    isSupported: Joi.boolean().optional(),
  }),

  getLogPluginSetupProcessor: Joi.object({
    pluginAddress: ValidationSchema.joiAddress.required(),
    event: Joi.string()
      .valid(...Object.values(IEventLogPluginType))
      .required(),
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
  }),

  getInstallationHelpers: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    pluginAddress: ValidationSchema.joiAddress.required(),
  }),

  getHarmonyValidatorConfig: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    pluginAddress: ValidationSchema.joiAddress.required(),
  }),

  getHarmonyValidatorInfo: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    validatorAddress: ValidationSchema.joiHarmonyAddress.required(),
  }),

  getHarmonyDelegationsByValidator: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    validatorAddress: ValidationSchema.joiHarmonyAddress.required(),
  }),

  getHarmonyDelegationsByDelegator: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    delegatorAddress: ValidationSchema.joiHarmonyAddress.required(),
  }),

  getDelegationVotingValidator: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    pluginAddress: ValidationSchema.joiAddress.required(),
  }),

  getDelegationVotingVotingPower: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    pluginAddress: ValidationSchema.joiAddress.required(),
    voterAddress: ValidationSchema.joiHarmonyAddress.required(),
  }),
}

export default PluginSchema
