import Joi from 'joi'
import ValidationSchema from '@helpers/validationSchema'
import { NetworksEnum } from '@types'

const harmonyNetworks = [NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet]

const HarmonyVotingSchema = {
  snapshotParams: Joi.object({
    network: Joi.string()
      .valid(...harmonyNetworks)
      .required(),
    endDate: Joi.number().integer().min(0).required(),
  }),

  weightsValidatorsParams: Joi.object({
    network: Joi.string()
      .valid(...harmonyNetworks)
      .required(),
    snapshotBlock: Joi.number().integer().min(0).required(),
    electedOnly: Joi.boolean().optional().default(true),
  }),

  weightsDelegatorsParams: Joi.object({
    network: Joi.string()
      .valid(...harmonyNetworks)
      .required(),
    snapshotBlock: Joi.number().integer().min(0).required(),
    validatorAddress: ValidationSchema.joiAddress.required(),
  }),

  merkleParams: Joi.object({
    entries: Joi.array()
      .items(
        Joi.object({
          address: ValidationSchema.joiAddress.required(),
          amount: Joi.string().pattern(/^\d+$/).required(),
        }),
      )
      .min(1)
      .required(),
  }),

  calldataSetRootParams: Joi.object({
    proposalId: Joi.number().integer().min(0).required(),
    merkleRoot: Joi.string()
      .pattern(/^0x[0-9a-fA-F]{64}$/)
      .required(),
  }),

  calldataSubmitPowerParams: Joi.object({
    proposalId: Joi.number().integer().min(0).required(),
    voter: ValidationSchema.joiAddress.required(),
    votingPower: Joi.string().pattern(/^\d+$/).required(),
    proof: Joi.array()
      .items(Joi.string().pattern(/^0x[0-9a-fA-F]{64}$/).required())
      .required(),
  }),
}

export default HarmonyVotingSchema
