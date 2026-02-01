import mongoose from 'mongoose'
import { setMongoModels } from '@models/utils/setModels'
import { type IMongoModel } from '@types'

const modelsStore: IMongoModel | any = {}

export const Models: IMongoModel | any = new Proxy(modelsStore, {
  get(target, prop) {
    // Check modelsStore first (has custom statics)
    if (prop in target) {
      return target[prop as keyof typeof target]
    }
    // Fallback to mongoose.models (does NOT have custom statics)
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

    // Set compiled models first
    Object.keys(models).forEach(modelName => {
      modelsStore[modelName] = models[modelName]
    })

    // Then set fallbacks only for mongoose models not present in our compiled set
    Object.keys(mongoose.models).forEach(modelName => {
      if (!(modelName in modelsStore)) {
        modelsStore[modelName] = mongoose.models[modelName]
      }
    })
  },
}
