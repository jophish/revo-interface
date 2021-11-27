import { useContractKit } from '@celo-tools/use-contractkit'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { useCallback, useEffect, useState } from 'react'
import { AbiItem } from 'web3-utils'

import { ERC20_ABI } from '../../constants/abis/erc20'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import STAKING_REWARDS_ABI from '../../constants/abis/StakingRewards.json'

export type CompoundBotSummary = {
  address: string
  token0Name: string
  token1Name: string
  token0Address: string
  token1Address: string
  amountUserFP: number
  amountUserLP: number
  rewardsAddress: string
  stakingTokenAddress: string
  totalLP: number
  totalFP: number
  exchangeRate: number
  // userLPValue: number
  stakingRewardsAddress: string
  rewardsRate: number
  totalLPInFarm: number
  totalLPSupply: number
}

const compoundAddresses = ['0xA9947051AA9243d72f8f5578d3BFb992b20AD97d', '0x22fdF8332A8AfD169d90606F4Bc9CBf6CE452Da4']

export const useCompoundRegistry = () => {
  const { address, kit } = useContractKit()
  const [botSummaries, setBotSummaries] = useState<CompoundBotSummary[]>([])

  const call = useCallback(async () => {
    const botSummaries: CompoundBotSummary[] = []
    for (const compounderAddress of compoundAddresses) {
      const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], compounderAddress)

      const totalFP = await farmBot.methods.totalSupply().call()
      const totalLP = await farmBot.methods.getLpAmount(totalFP).call()
      const exchangeRate = totalLP / totalFP

      let amountUserFP = await farmBot.methods.balanceOf(address).call()
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

      const rewardsAddress = await farmBot.methods.rewardsToken().call()

      const stakingRewardsAddress = await farmBot.methods.stakingRewards().call()
      const stakingRewardsContract = new kit.web3.eth.Contract(STAKING_REWARDS_ABI, stakingRewardsAddress)
      const rewardsRate = await stakingRewardsContract.methods.rewardRate().call()

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
        rewardsAddress,
        stakingRewardsAddress,
        rewardsRate,
        totalLPInFarm,
        totalLPSupply,
      }
      botSummaries.push(botSummary)
    }
    setBotSummaries(botSummaries)
  }, [kit.web3.eth, address])

  useEffect(() => {
    call()
  }, [call])
  return botSummaries
}
