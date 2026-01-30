import mongoose from 'mongoose'
import { setMongoModels } from '@models/utils/setModels'
import { type IMongoModel } from '@types'

export const Models: IMongoModel | any = {}

export const ModelProxy = {
  setMongoModels: async () => {
    const models = await setMongoModels()
    // Prefer models built by Typegoose, but always expose mongoose models as a fallback.
    Object.assign(Models, mongoose.models, models)
  },
}
