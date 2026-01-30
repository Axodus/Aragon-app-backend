import mongoose from 'mongoose'
import { setMongoModels } from '@models/utils/setModels'
import { type IMongoModel } from '@types'

const modelsStore: IMongoModel | any = {}

export const Models: IMongoModel | any = new Proxy(modelsStore, {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target]
    }
    if (typeof prop === 'string' && prop in mongoose.models) {
      return (mongoose.models as any)[prop]
    }
    return undefined
  },
  set(target, prop, value) {
    target[prop as keyof typeof target] = value
    return true
  },
})

export const ModelProxy = {
  setMongoModels: async () => {
    const models = await setMongoModels()
    // Prefer models built by Typegoose, but always expose mongoose models as a fallback.
    Object.assign(Models, mongoose.models, models)
  },
}
