import {
  type IAVisibilityStatusParams,
  type IDaoExtraParams,
  type IDaoResponse,
  type IPaginatedResult,
  type IPaginationParams,
  ErrorKeyEnum,
  type NetworksEnum,
} from '@src/types'
import { Models } from '@dbModels'
import { assertExposable } from '@errors'
import PairDataModule from '@modules/pairData'
import DaoEnsHelper from '@helpers/daoEns'
import NameResolver from '@helpers/nameResolver'

const DaoAdminController = {
  setVisibilityStatus: async (params: IAVisibilityStatusParams): Promise<any> => {
    const dao = await Models.Dao.findByAddress(params.address, params.network)
    assertExposable(dao, ErrorKeyEnum.notFound)

    dao.isHidden = !params.status
    await dao.save()

    return true
  },

  getVisibilityStatus: async (
    params: Pick<IAVisibilityStatusParams, 'address' | 'network'>,
  ): Promise<{ status: boolean }> => {
    const dao = await Models.Dao.findByAddress(params.address, params.network)
    assertExposable(dao, ErrorKeyEnum.notFound)

    // `status` represents visibility: true = visible, false = hidden
    return { status: !dao.isHidden }
  },

  getArchivedDaosWithPagination: async (
    paginationParams: IPaginationParams,
    extraParams: IDaoExtraParams,
  ): Promise<IPaginatedResult<IDaoResponse>> => {
    paginationParams = await PairDataModule.pairFromPaginationParams(paginationParams)
    const extraQueryData = await PairDataModule.pairExtraQueryData(extraParams)

    return await Models.Dao.findWithPagination({
      extraParams,
      paginationParams,
      extraQueryData: { ...extraQueryData, onlyHidden: true },
    })
  },

  setEns: async (params: { address: string; network: any; ens?: string | null }): Promise<{ ens: string | null }> => {
    return await DaoEnsHelper.setDaoEnsValidated({
      address: params.address,
      network: params.network,
      ens: params.ens ?? null,
    })
  },

  setPrimaryName: async (params: {
    address: string
    network: NetworksEnum
    primaryName?: string | null
  }): Promise<{ primaryName: string | null }> => {
    const dao = await Models.Dao.findByAddress(params.address, params.network)
    assertExposable(dao, ErrorKeyEnum.notFound)

    // If primaryName is null/undefined, clear it
    if (!params.primaryName) {
      dao.primaryName = null
      await dao.save()
      return { primaryName: null }
    }

    // Validate that primaryName is a .country domain
    const isCountryName = /^[a-z0-9-]+\.country$/i.test(params.primaryName)
    assertExposable(isCountryName, ErrorKeyEnum.badParams, 400, 'Primary name must be a .country domain')

    // Validate that primaryName is supported by our resolver
    const isSupported = NameResolver.isSupportedName(params.primaryName)
    assertExposable(isSupported, ErrorKeyEnum.badParams, 400, 'Primary name is not supported')

    // Resolve primaryName to address
    const resolvedAddress = await NameResolver.resolveNameToAddress(params.primaryName, params.network)
    assertExposable(!!resolvedAddress, ErrorKeyEnum.badParams, 400, 'Primary name does not resolve to any address')
    const resolved = resolvedAddress!

    // Validate that resolved address matches DAO address (case-insensitive)
    const addressesMatch = resolved.toLowerCase() === params.address.toLowerCase()
    assertExposable(
      addressesMatch,
      ErrorKeyEnum.badParams,
      400,
      `Primary name resolves to ${resolved} but DAO address is ${params.address}`,
    )

    // Save primaryName
    dao.primaryName = params.primaryName.toLowerCase()
    await dao.save()

    return { primaryName: dao.primaryName }
  },
}

export default DaoAdminController
