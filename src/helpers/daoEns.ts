import { Models } from '@dbModels'
import { assertExposable } from '@errors'
import { ErrorKeyEnum, type NetworksEnum } from '@types'
import NameResolver from '@helpers/nameResolver'

export interface SetDaoEnsParams {
  address: string
  network: NetworksEnum
  ens?: string | null
}

const DaoEnsHelper = {
  setDaoEnsValidated: async (params: SetDaoEnsParams): Promise<{ ens: string | null }> => {
    const dao = await Models.Dao.findByAddress(params.address, params.network)
    assertExposable(dao, ErrorKeyEnum.notFound)

    const ensRaw = typeof params.ens === 'string' ? params.ens.trim() : null
    if (!ensRaw) {
      dao.ens = null
      await dao.save()
      return { ens: null }
    }

    const ens = ensRaw.toLowerCase()

    const resolvedAddress = await NameResolver.resolveNameToAddress(ens, params.network)
    assertExposable(!!resolvedAddress, ErrorKeyEnum.badParams)
    assertExposable(resolvedAddress!.toLowerCase() === dao.address.toLowerCase(), ErrorKeyEnum.badParams)

    const existing = await Models.Dao.findOne({ ens, network: params.network })
    if (existing && existing.address.toLowerCase() !== dao.address.toLowerCase()) {
      assertExposable(false, ErrorKeyEnum.alreadyExists)
    }

    dao.ens = ens as any
    await dao.save()

    return { ens }
  },
}

export default DaoEnsHelper
