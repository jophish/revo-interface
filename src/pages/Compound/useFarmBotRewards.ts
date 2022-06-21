import { useContractKit } from '@celo-tools/use-contractkit'
import { FarmBotType } from 'pages/Compound/useFarmBotRegistry'
import { useCallback, useEffect, useState } from 'react'
import { AbiItem } from 'web3-utils'

import farmBotAbi from '../../constants/abis/FarmBot.json'
import { useFarmRegistry } from '../Earn/useFarmRegistry'

export interface FarmBotRewards {
  address: string
  stakingRewardsAddress: string
  rewardsUSDPerYear?: string
  tvlUSD?: string
}

export const useFarmBotRewards = (farmBotInfoList) => {
  const { kit } = useContractKit()
  const [rewardSummaries, setRewardSummaries] = useState<FarmBotRewards[]>([])

  const farmSummaries = useFarmRegistry()

  const call = useCallback(async () => {
    const botSummaries: FarmBotRewards[] = []
    for (const farmBotInfo of farmBotInfoList) {
      if (farmBotInfo.type !== FarmBotType.Ubeswap) {
        continue
      }
      const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], farmBotInfo.address)

      const stakingRewardsAddress = await farmBot.methods.stakingRewards().call()
      const farmSummary = farmSummaries.find((farm) => farm.stakingAddress == stakingRewardsAddress)

      const rewardsUSDPerYear = farmSummary?.rewardsUSDPerYear
      const tvlUSD = farmSummary?.tvlUSD

      const botSummary: FarmBotRewards = {
        address: farmBotInfo.address,
        stakingRewardsAddress,
        rewardsUSDPerYear,
        tvlUSD,
      }
      botSummaries.push(botSummary)
    }
    setRewardSummaries(botSummaries)
  }, [kit.web3.eth, farmSummaries, farmBotInfoList])

  useEffect(() => {
    call()
  }, [call])

  return rewardSummaries
}
