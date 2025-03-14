import { useCelo } from '@celo/react-celo'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { AppState } from 'state'
import { AbiItem } from 'web3-utils'

import { ERC20_ABI } from '../../constants/abis/erc20'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import MOOLA_STAKING_REWARDS_ABI from '../../constants/abis/moola/MoolaStakingRewards.json'

export interface FarmBotSummary {
  token0Address: string
  token1Address: string
  token0Name: string
  token1Name: string
  stakingTokenAddress: string
  totalLP: number
  address: string
  amountUserFP: number
  amountUserLP: number
  totalFP: number
  exchangeRate: number
  // userLPValue: number
  stakingRewardsAddress: string
  totalLPInFarm: number
  totalLPSupply: number
}

export const useFarmBotRegistry = (farmBotAddresses: string[]) => {
  const { address, kit, network } = useCelo()
  const [botSummaries, setBotSummaries] = useState<FarmBotSummary[]>([])
  const transactions = useSelector((state: AppState) => state.transactions[network.chainId])

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
        totalLPInFarm,
        totalLPSupply,
      }
      botSummaries.push(botSummary)
    }
    setBotSummaries(botSummaries)
  }, [kit.web3.eth, address, transactions])

  useEffect(() => {
    call()
  }, [call])
  return botSummaries
}
