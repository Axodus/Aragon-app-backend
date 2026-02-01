import * as path from 'path'
import * as fs from 'fs'
import { type IMongoModel } from '@types'
import logger from '@logger'
import { deleteModel, buildSchema } from '@typegoose/typegoose'
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

const RESERVED_STATIC_KEYS = ['length', 'prototype', 'name'] as const

// Store custom statics for re-application after Sinon restore
const customStaticsRegistry: Record<string, Record<string, Function>> = {}

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

function materializeCustomStatics(modelName: string, model: any): void {
  const statics = customStaticsRegistry[modelName]
  if (!model || !statics) return

  for (const key of Object.keys(statics)) {
    const fn = statics[key]
    if (typeof fn !== 'function') continue

    try {
      Object.defineProperty(model, key, {
        value: fn,
        writable: true,
        configurable: true,
      })
    } catch (_) {
      // Ignore if a test or library defined a non-configurable descriptor.
    }
  }
}

// Helper function to re-apply custom statics (call after Sinon restore)
export function reapplyCustomStatics(modelName?: string): void {
  const modelsToFix = modelName ? [modelName] : Object.keys(customStaticsRegistry)

  modelsToFix.forEach(name => {
    const model = mongoose.models[name]
    if (!model) return

    materializeInheritedStatics(model)
    materializeCustomStatics(name, model)
  })
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

        // CRITICAL: Build schema first, then add custom statics to it
        // This is the Mongoose-approved way to add static methods
        const schema = buildSchema(exportedClass)
        
        // Add custom static methods directly to schema.statics
        const staticKeys = Object.getOwnPropertyNames(exportedClass).filter(
          key => !((RESERVED_STATIC_KEYS as readonly string[]).includes(key)) && typeof exportedClass[key] === 'function'
        )
        
        // Store custom statics in registry for re-application after Sinon restore
        customStaticsRegistry[exportedClass.name] = {}
        
        staticKeys.forEach(key => {
          const staticMethod = exportedClass[key]
          if (typeof staticMethod === 'function') {
            // Store in registry
            customStaticsRegistry[exportedClass.name][key] = staticMethod
            // Add to schema.statics (Mongoose will apply these to the model)
            schema.statics[key] = staticMethod
          }
        })
        
        // Now compile the model with the schema that has custom statics
        const model = mongoose.model(exportedClass.name, schema)

        // Also materialize inherited statics for test stubbing
        materializeInheritedStatics(model)

        // Ensure custom statics are own/writable/configurable for Sinon stubbing
        materializeCustomStatics(exportedClass.name, model)

        schemas[exportedClass.name] = model
      } catch (error) {
        logger.error(`Error loading Mongo model from file ${filename}:`, llo({ error }))
      }
    }
  }

  // Statics are now added via schema.statics (Mongoose standard way)
  // No need to materialize again here

  return schemas
}
