import * as path from 'path'
import * as fs from 'fs'
import { type IMongoModel } from '@types'
import logger from '@logger'
import { deleteModel, getModelForClass } from '@typegoose/typegoose'
import mongoose from 'mongoose'

const llo = logger.logMeta.bind(null, { service: 'db:setMongoModels' })

const STUBBABLE_MONGOOSE_STATICS = [
  'aggregate',
  'countDocuments',
  'create',
  'deleteMany',
  'deleteOne',
  'distinct',
  'estimatedDocumentCount',
  'find',
  'findById',
  'findOne',
  'findOneAndDelete',
  'findOneAndUpdate',
  'insertMany',
  'updateMany',
  'updateOne',
] as const

function materializeInheritedStatics(model: any): void {
  if (!model || (typeof model !== 'function' && typeof model !== 'object')) return

  for (const methodName of STUBBABLE_MONGOOSE_STATICS) {
    if (Object.prototype.hasOwnProperty.call(model, methodName)) continue

    const method = model[methodName]
    if (typeof method !== 'function') continue

    Object.defineProperty(model, methodName, {
      value: method,
      writable: true,
      configurable: true,
    })
  }
}

export const setMongoModels = async (): Promise<any> => {
  const schemas: IMongoModel | any = {}

  const filePath = path.join(__dirname, '..', 'schema/')
  const files = await fs.promises.readdir(filePath)

  for (const filename of files) {
    if (/\.(js|ts)$/.test(filename) && !filename.endsWith('.d.ts')) {
      try {
        const modulePath = path.join(filePath, filename)
        const importedModule = require(modulePath) // eslint-disable-line @typescript-eslint/no-var-requires

        const exportedClass = importedModule?.default
        if (!exportedClass || typeof exportedClass !== 'function' || !exportedClass.name) {
          continue
        }

        try {
          deleteModel(exportedClass.name)
        } catch (_) {
          // ignore if model does not exist
        }

        schemas[exportedClass.name] = getModelForClass(exportedClass, {
          existingMongoose: mongoose,
        })
      } catch (error) {
        logger.error(`Error loading Mongo model from file ${filename}:`, llo({ error }))
      }
    }
  }

  Object.keys(schemas).forEach(modelName => {
    console.log('MongoModel', modelName) // eslint-disable-line no-console
  })

  Object.values(schemas).forEach(model => {
    materializeInheritedStatics(model)
  })

  return schemas
}
