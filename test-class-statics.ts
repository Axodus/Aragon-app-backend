// Quick test to see what statics are on Plugin class
import { default as PluginClass } from './src/models/schema/plugin'

console.log('=== Plugin Class Analysis ===')
console.log('Plugin class name:', PluginClass.name)

const allKeys = Object.getOwnPropertyNames(PluginClass)
console.log('\nAll keys on Plugin class:', allKeys)

const staticMethods = allKeys.filter(key => {
  const value = (PluginClass as any)[key]
  return typeof value === 'function' && !['length', 'prototype', 'name'].includes(key)
})
console.log('\nStatic methods:', staticMethods)

// Check if create exists
console.log('\nPlugin.create exists:', 'create' in PluginClass)
console.log('Plugin.create type:', typeof (PluginClass as any).create)

// Check prototype
const protoKeys = Object.getOwnPropertyNames(PluginClass.prototype)
console.log('\nPrototype keys:', protoKeys.slice(0, 20))
