import { useContractKit } from '@celo-tools/use-contractkit'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { useCallback, useEffect, useState } from 'react'
import { AbiItem } from 'web3-utils'

import { ERC20_ABI } from '../../constants/abis/erc20'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import MOOLA_STAKING_REWARDS_ABI from '../../constants/abis/moola/MoolaStakingRewards.json'
import { useFarmRegistry } from '../Earn/useFarmRegistry'

export interface FarmBotSummaryBase {
  token0Address: string
  token1Address: string
  token0Name: string
  token1Name: string
  stakingTokenAddress: string
  totalLP: number
}

export interface FarmBotSummary extends FarmBotSummaryBase {
  address: string
  amountUserFP: number
  amountUserLP: number
  totalFP: number
  exchangeRate: number
  // userLPValue: number
  stakingRewardsAddress: string
  rewardsUSDPerYear?: string
  tvlUSD?: string
  totalLPInFarm: number
  totalLPSupply: number
}

export const farmBotAddresses = ['0xCB34fbfC3b9a73bc04D2eb43B62532c7918d9E81']

export const useFarmBotRegistry = () => {
  const { address, kit } = useContractKit()
  const [botSummaries, setBotSummaries] = useState<FarmBotSummary[]>([])

  const farmSummaries = useFarmRegistry()

  const call = useCallback(async () => {
    const botSummaries: FarmBotSummary[] = []
    for (const farmBotAddress of farmBotAddresses) {
      const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], farmBotAddress)

      const totalFP = await farmBot.methods.totalSupply().call()
      const totalLP = await farmBot.methods.getLpAmount(totalFP).call()
      const exchangeRate = totalLP / totalFP

      let amountUserFP = address ? await farmBot.methods.balanceOf(address).call() : 0
      amountUserFP = amountUserFP > 10 ? amountUserFP : 0
      const amountUserLP = await farmBot.methods.getLpAmount(amountUserFP).call()

      const stakingTokenAddress = await farmBot.methods.stakingToken().call()
      const stakingTokenContract = new kit.web3.eth.Contract(IUniswapV2Pair as AbiItem[], stakingTokenAddress)

      const token0Address = await stakingTokenContract.methods.token0().call()
      const token0Contract = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], token0Address)
      const token0Name = await token0Contract.methods.symbol().call()

      const token1Address = await stakingTokenContract.methods.token1().call()
      const token1Contract = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], token1Address)
      const token1Name = await token1Contract.methods.symbol().call()

      const stakingRewardsAddress = await farmBot.methods.stakingRewards().call()
      const farmSummary = farmSummaries.find((farm) => farm.stakingAddress == stakingRewardsAddress)

      const rewardsUSDPerYear = farmSummary?.rewardsUSDPerYear
      const tvlUSD = farmSummary?.tvlUSD

      const stakingRewardsContract = new kit.web3.eth.Contract(
        MOOLA_STAKING_REWARDS_ABI as AbiItem[],
        stakingRewardsAddress
      )
      const totalLPInFarm = await stakingRewardsContract.methods.totalSupply().call()
      const totalLPSupply = await stakingTokenContract.methods.totalSupply().call()

      const botSummary: FarmBotSummary = {
        address: farmBotAddress,
        token0Name,
        token1Name,
        token0Address,
        token1Address,
        amountUserFP,
        amountUserLP,
        stakingTokenAddress,
        totalLP,
        totalFP,
        exchangeRate,
        stakingRewardsAddress,
        rewardsUSDPerYear,
        tvlUSD,
        totalLPInFarm,
        totalLPSupply,
      }
      botSummaries.push(botSummary)
    }
    setBotSummaries(botSummaries)
  }, [kit.web3.eth, address, farmSummaries])

  useEffect(() => {
    call()
  }, [call])
  return botSummaries
}
