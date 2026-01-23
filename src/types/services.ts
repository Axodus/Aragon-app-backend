export enum EnumConnection {
  MONGODB = 'MONGODB',
  BLOCKCHAIN = 'BLOCKCHAIN',
  RABBITMQ = 'RABBITMQ',
}

export enum EnumServiceName {
  ARAGON_DAO = 'aragon-dao',
  ARAGON_INDEXER = 'aragon-indexer',
  ARAGON_TRANSFERS = 'aragon-transfers',
  ARAGON_API = 'aragon-api',
  ARAGON_ADMIN_API = 'aragon-admin-api',
  ARAGON_GATEWAY = 'aragon-gateway',
  ARAGON_PLUGINS = 'aragon-plugins',
  ARAGON_RATES = 'aragon-rates',
  ARAGON_REQUEUE = 'aragon-requeue',
  ARAGON_MIGRATION = 'aragon-migration',
  ARAGON_TOOLS = 'aragon-tools',
}

export interface IMigration {
  start: () => Promise<any>

  stop: () => void | Promise<void>
}

export interface IMigHelper {
  countDocs: number
}

export interface IOptionService {
  mongoSync: boolean
}

export interface IService {
  name?: EnumServiceName
  options?: IOptionService
  NEED_CONNECTIONS: EnumConnection[]
  /**
   * Starts the service (e.g., binds HTTP port) before waiting for external connections.
   * Useful in environments like Cloud Run where the container must listen on $PORT quickly.
   */
  START_BEFORE_CONNECTIONS?: boolean
  start: () => Promise<any>

  stop: () => void | Promise<void>
}

export enum IEnumTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}
