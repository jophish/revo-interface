import { useContractKit } from '@celo-tools/use-contractkit'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { useCallback, useEffect, useState } from 'react'
import { AbiItem } from 'web3-utils'

import { ERC20_ABI } from '../../constants/abis/erc20'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import MOOLA_STAKING_REWARDS_ABI from '../../constants/abis/moola/MoolaStakingRewards.json'
import { useFarmRegistry } from '../Earn/useFarmRegistry'

export type CompoundBotSummary = {
  address: string
  token0Name: string
  token1Name: string
  token0Address: string
  token1Address: string
  amountUserFP: number
  amountUserLP: number
  stakingTokenAddress: string
  totalLP: number
  totalFP: number
  exchangeRate: number
  // userLPValue: number
  stakingRewardsAddress: string
  rewardsUSDPerYear: string
  tvlUSD: string
  totalLPInFarm: number
  totalLPSupply: number
}

const compoundAddresses = ['0x2e031Fd9930b6aa96e8aC7ad528459817c96Ed70']

export const useCompoundRegistry = () => {
  const { address, kit } = useContractKit()
  const [botSummaries, setBotSummaries] = useState<CompoundBotSummary[]>([])

  const farmSummaries = useFarmRegistry()

  const call = useCallback(async () => {
    const botSummaries: CompoundBotSummary[] = []
    for (const compounderAddress of compoundAddresses) {
      const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], compounderAddress)

      const totalFP = await farmBot.methods.totalSupply().call()
      const totalLP = await farmBot.methods.getLpAmount(totalFP).call()
      const exchangeRate = totalLP / totalFP

      let amountUserFP = address ? await farmBot.methods.balanceOf(address).call() : 0
      amountUserFP = amountUserFP > 10 ? amountUserFP : 0
      const amountUserLP = await farmBot.methods.getLpAmount(amountUserFP).call()

      const stakingTokenAddress = await farmBot.methods.stakingToken().call()
      const stakingTokenContract = new kit.web3.eth.Contract(IUniswapV2Pair, stakingTokenAddress)

      const token0Address = await stakingTokenContract.methods.token0().call()
      const token0Contract = new kit.web3.eth.Contract(ERC20_ABI, token0Address)
      const token0Name = await token0Contract.methods.symbol().call()

      const token1Address = await stakingTokenContract.methods.token1().call()
      const token1Contract = new kit.web3.eth.Contract(ERC20_ABI, token1Address)
      const token1Name = await token1Contract.methods.symbol().call()

      const stakingRewardsAddress = await farmBot.methods.stakingRewards().call()
      const farmSummary = farmSummaries.find((farm) => farm.stakingAddress == stakingRewardsAddress)

      const rewardsUSDPerYear = farmSummary?.rewardsUSDPerYear
      const tvlUSD = farmSummary?.tvlUSD

      const stakingRewardsContract = new kit.web3.eth.Contract(MOOLA_STAKING_REWARDS_ABI, stakingRewardsAddress)
      const totalLPInFarm = await stakingRewardsContract.methods.totalSupply().call()
      const totalLPSupply = await stakingTokenContract.methods.totalSupply().call()

      const botSummary: CompoundBotSummary = {
        address: compounderAddress,
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
