import { getModelForClass, prop, modelOptions } from '@typegoose/typegoose'
import type { HexAddress, NetworksEnum } from '@types'

@modelOptions({ schemaOptions: { collection: 'pluginauthorizations', timestamps: true } })
export class PluginAuthorization {
  @prop({ required: true, lowercase: true })
  public daoAddress!: HexAddress

  @prop({ required: true, lowercase: true })
  public network!: NetworksEnum

  @prop({ required: true, lowercase: true })
  public pluginSlug!: string

  @prop({ required: true, default: 'pending' })
  public status!: 'pending' | 'approved' | 'rejected'

  @prop()
  public requestedBy?: HexAddress

  @prop()
  public requestedAt?: Date

  @prop()
  public approvedBy?: HexAddress

  @prop()
  public approvedAt?: Date

  @prop()
  public reason?: string
}

export const PluginAuthorizationModel = getModelForClass(PluginAuthorization)