import 'module-alias/register'
import { ModelProxy, Models } from './src/models'

async function testModels() {
  console.log('=== Testing Model Loading ===')
  
  try {
    await ModelProxy.setMongoModels()
    
    console.log('\n=== After setMongoModels ===')
    console.log('Models.Plugin exists:', !!Models.Plugin)
    console.log('Models.Plugin type:', typeof Models.Plugin)
    
    if (Models.Plugin) {
      console.log('\n=== Plugin statics ===')
      const statics = Object.keys(Models.Plugin).filter(k => typeof Models.Plugin[k] === 'function')
      console.log('All static functions:', statics.slice(0, 15))
      console.log('\n=== Critical statics ===')
      console.log('create:', typeof Models.Plugin.create)
      console.log('findByAddress:', typeof Models.Plugin.findByAddress)
      console.log('findAllByTokenAddress:', typeof Models.Plugin.findAllByTokenAddress)
      console.log('getEntityId:', typeof Models.Plugin.getEntityId)
      
      // Try calling getEntityId (doesn't need DB)
      if (typeof Models.Plugin.getEntityId === 'function') {
        const id = Models.Plugin.getEntityId({
          network: 'mainnet',
          transactionHash: '0x123',
          address: '0xabc',
        })
        console.log('\n=== getEntityId test ===')
        console.log('Result:', id)
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testModels()
