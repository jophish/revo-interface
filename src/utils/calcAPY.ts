import { getFarmBotAPY } from '@revo-market/farm-bot-apy'
import { FarmBotSummary } from 'pages/Compound/useFarmBotRegistry'

import { useAsyncState } from '../hooks/useAsyncState'

export function useCalcAPY(farmBotSummary: FarmBotSummary) {
  const [apy] = useAsyncState('-', async () => {
    const apy = await getFarmBotAPY(farmBotSummary.address)
    return apy.toFixed(0)
  })
  return apy
}
