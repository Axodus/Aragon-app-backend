import { index, modelOptions, prop, Severity } from '@typegoose/typegoose'
import { Model, type SaveOptions, Schema } from 'mongoose'
import { ICollectionNames, NetworksEnum } from '@types'
import { v4 as uuidv4 } from 'uuid'

const customName = ICollectionNames.CreateProposalRequest

@modelOptions({
  schemaOptions: {
    id: false,
    timestamps: true,
    collection: customName,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  options: {
    customName,
    allowMixed: Severity.ALLOW,
  },
})
@index({ createdAt: -1 })
@index({ network: 1, createdAt: -1 })
@index({ status: 1, createdAt: -1 })
@index({ daoId: 1, createdAt: -1 })
export default class CreateProposalRequest extends Model {
  @prop({ type: () => String, required: true, unique: true })
  public id!: string

  @prop({ type: () => String, enum: NetworksEnum, required: true })
  public network!: NetworksEnum

  @prop({ type: () => String, required: true })
  public status!: string

  @prop({ type: () => String, required: true })
  public submissionMode!: string

  @prop({ type: () => String, default: null })
  public daoId!: string | null

  @prop({ type: () => String, default: null })
  public daoAddress!: string | null

  @prop({ type: () => String, default: null })
  public pluginId!: string | null

  @prop({ type: () => String, default: null })
  public pluginAddress!: string | null

  @prop({ type: () => String, default: null })
  public creatorAddress!: string | null

  @prop({ type: () => String, required: true })
  public title!: string

  @prop({ type: () => String, required: true })
  public actionType!: string

  @prop({ type: () => Schema.Types.Mixed, _id: false, required: true })
  public request!: any

  @prop({ type: () => Schema.Types.Mixed, _id: false, required: true })
  public receipt!: any

  static async create(rawData: Partial<CreateProposalRequest>, tOpts?: SaveOptions) {
    if (!rawData.id) {
      rawData.id = this.getEntityId()
    }

    const data = new this(rawData)
    return await data.save(tOpts)
  }

  static getEntityId() {
    return `backend-create-${uuidv4()}`
  }

  static async findByEntityId(entityId: string, tOpts?: SaveOptions) {
    return await this.findOne({ id: entityId }, null, tOpts)
  }

  static async listRecent(
    params: {
      network?: NetworksEnum
      status?: string
      daoId?: string
      limit?: number
    } = {},
  ) {
    const query: Record<string, any> = {}

    if (params.network) query.network = params.network
    if (params.status) query.status = params.status
    if (params.daoId) query.daoId = params.daoId

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100)

    return await this.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        'id network status submissionMode daoId pluginId creatorAddress title actionType receipt createdAt updatedAt',
      )
      .exec()
  }
}
