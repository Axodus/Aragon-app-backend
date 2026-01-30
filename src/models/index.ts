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
    // CRITICAL: models from setMongoModels have custom statics; they must override mongoose.models
    Object.assign(Models, mongoose.models, models)
    // Double-check: ensure the compiled models are actually in the registry
    Object.keys(models).forEach(key => {
      if (models[key]) {
        Models[key] = models[key]
      }
    })
  },
}
