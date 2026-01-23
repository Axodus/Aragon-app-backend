import { type IMigration } from '@types'
import logger from '@logger'
import { mongoose } from '@typegoose/typegoose'

const llo = logger.logMeta.bind(null, { service: 'Migration: idempotency-indexes' })

export const idempotencyIndexesMigration: IMigration = {
  start: async () => {
    logger.info('Starting migration', llo({ migration: '20260122-idempotency-indexes' }))

    try {
      const db = mongoose.connection.db

      if (!db) {
        throw new Error('MongoDB connection not established')
      }

      // Add compound unique index for Proposal idempotency
      logger.info('Creating compound unique index on proposals collection', llo({
        index: { network: 1, blockHash: 1, logIndex: 1, eventType: 1 },
        unique: true,
      }))

      await db.collection('proposals').createIndex(
        { network: 1, blockHash: 1, logIndex: 1, eventType: 1 },
        { unique: true, sparse: true }
      )

      logger.info('Successfully created index on proposals', llo({}))

      // Add compound unique index for Vote idempotency
      logger.info('Creating compound unique index on votes collection', llo({
        index: { network: 1, blockHash: 1, logIndex: 1 },
        unique: true,
      }))

      await db.collection('votes').createIndex(
        { network: 1, blockHash: 1, logIndex: 1 },
        { unique: true, sparse: true }
      )

      logger.info('Successfully created index on votes', llo({}))

      // Backfill blockHash for existing proposals (set to null if missing)
      logger.info('Backfilling blockHash for existing proposals without blockHash', llo({}))
      const proposalUpdateResult = await db.collection('proposals').updateMany(
        { blockHash: { $exists: false } },
        { $set: { blockHash: null } }
      )
      logger.info('Backfill complete for proposals', llo({
        matchedCount: proposalUpdateResult.matchedCount,
        modifiedCount: proposalUpdateResult.modifiedCount,
      }))

      // Backfill blockHash for existing votes (set to null if missing)
      logger.info('Backfilling blockHash for existing votes without blockHash', llo({}))
      const voteUpdateResult = await db.collection('votes').updateMany(
        { blockHash: { $exists: false } },
        { $set: { blockHash: null } }
      )
      logger.info('Backfill complete for votes', llo({
        matchedCount: voteUpdateResult.matchedCount,
        modifiedCount: voteUpdateResult.modifiedCount,
      }))

      logger.info('Migration completed successfully', llo({ migration: '20260122-idempotency-indexes' }))
    } catch (error) {
      logger.error('Migration failed', llo({ migration: '20260122-idempotency-indexes', error }))
      throw error
    }
  },

  stop: async () => {
    // Optional: rollback logic if needed
    logger.info('Migration stop (rollback) not implemented', llo({ migration: '20260122-idempotency-indexes' }))
  },
}

export default idempotencyIndexesMigration
