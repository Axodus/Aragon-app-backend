import { index, modelOptions, prop } from '@typegoose/typegoose'
import { ICollectionNames, type HexAddress, NetworksEnum } from '@types'
import { Model, type SaveOptions } from 'mongoose'
import { assert } from '@errors'

const customName = ICollectionNames.ValidatorConfig

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
  },
})
@index({ network: 1, pluginAddress: 1 }, { unique: true })
@index({ network: 1, validatorAddress: 1 })
export default class ValidatorConfig extends Model {
  @prop({ type: () => String, required: true })
  public id!: string

  @prop({ type: () => String, enum: NetworksEnum, required: true })
  public network!: NetworksEnum

  @prop({ type: () => String, required: true })
  public pluginAddress!: HexAddress

  @prop({ type: () => String, default: null })
  public validatorAddress!: HexAddress | null

  @prop({ type: () => String, default: null })
  public processKey!: string | null

  @prop({ type: () => String, default: null })
  public lastUpdateTxHash!: string | null

  @prop({ type: () => Number, default: null })
  public lastUpdateBlock!: number | null

  static getEntityId(params: { network: NetworksEnum; pluginAddress: HexAddress }): string {
    return `${params.network}-${params.pluginAddress}`
  }

  static async create(rawData: Partial<ValidatorConfig>, tOpts?: SaveOptions) {
    assert(!!rawData.network, 'network is required')
    assert(!!rawData.pluginAddress, 'pluginAddress is required')

    const network = rawData.network!
    const pluginAddress = rawData.pluginAddress!

    if (!rawData.id) {
      rawData.id = this.getEntityId({
        network,
        pluginAddress,
      })
    }

    const data = new this(rawData)
    return await data.save(tOpts)
  }
}
