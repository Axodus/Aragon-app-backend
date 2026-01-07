import {
  type IAVisibilityStatusParams,
  type IDaoExtraParams,
  type IDaoResponse,
  type IPaginatedResult,
  type IPaginationParams,
  ErrorKeyEnum,
} from '@src/types'
import { Models } from '@dbModels'
import { assertExposable } from '@errors'
import PairDataModule from '@modules/pairData'
import DaoEnsHelper from '@helpers/daoEns'

const DaoAdminController = {
  setVisibilityStatus: async (params: IAVisibilityStatusParams): Promise<any> => {
    const dao = await Models.Dao.findByAddress(params.address, params.network)
    assertExposable(dao, ErrorKeyEnum.notFound)

    dao.isHidden = !params.status
    await dao.save()

    return true
  },

  getVisibilityStatus: async (params: Pick<IAVisibilityStatusParams, 'address' | 'network'>): Promise<{ status: boolean }> => {
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
}

export default DaoAdminController
