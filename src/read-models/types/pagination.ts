export interface PageInfo {
  limit: number
  offset: number
  total: number | null
  hasNextPage: boolean
  nextOffset: number | null
}

export interface ReadModelPageInput {
  limit?: number
  offset?: number
}
