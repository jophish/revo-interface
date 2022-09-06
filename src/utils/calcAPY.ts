import { getFarmBotAPY } from '@revo-market/farm-bot-apy'
import { FarmBotSummary } from 'pages/Compound/useFarmBotRegistry'

import { useAsyncState } from '../hooks/useAsyncState'

export function useCalcAPY(farmBotSummary: FarmBotSummary) {
  const [apy] = useAsyncState('-', async () => {
    const apyPercent = (await getFarmBotAPY(farmBotSummary.address)).multipliedBy(100, 10)
    return apyPercent.toPrecision(3).toString()
  })
  return apy
}
