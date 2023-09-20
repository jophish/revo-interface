import { useCallback, useEffect, useState } from 'react'

import { ERC20_ABI } from '../../constants/abis/erc20'
import { useFarmRegistry } from '../Earn/useFarmRegistry'
import { farmBotAddresses, FarmBotSummaryBase } from './useFarmBotRegistry'
import { usePublicClient } from 'wagmi'
import { getContract } from 'viem'
import { UNISWAP_V2_PAIR_ABI } from '../../constants/abis/uniswap-v2-pair'
import { FARM_BOT_ABI } from '../../constants/abis/farm-bot'

export type LiquiditySummary = {
  tokenAddress: string
  rfpTokenAddress: string
  farmBotSummary: FarmBotSummaryBase
  userBalance: number
}

// pools containing RFP
const liquidityPoolAddresses = ['0x25938830FBd7619bf6CFcFDf5C37A22AB15A93cA'] as const

export const useLiquidityRegistry = () => {
  const publicClient = usePublicClient()
  const address = publicClient.account
  const [summaries, setSummaries] = useState<LiquiditySummary[]>([])

  const farmSummaries = useFarmRegistry()

  const call = useCallback(async () => {
    const liquidityPoolSummaries: LiquiditySummary[] = []
    for (const liquidityPoolAddress of liquidityPoolAddresses) {
      const uniswapV2Pair = getContract({
        address: liquidityPoolAddress,
        abi: UNISWAP_V2_PAIR_ABI,
        publicClient,
      })

      const token0Address = await uniswapV2Pair.read.token0()
      const token1Address = await uniswapV2Pair.read.token1()
      const userBalance = address ? await uniswapV2Pair.read.balanceOf(address) : 0

      // expect token0 or token1 to be RFP token
      const rfpTokenAddress = [token0Address, token1Address].find((address) => farmBotAddresses.includes(address))
      const tokenAddress = token0Address === rfpTokenAddress ? token1Address : token0Address

      if (!rfpTokenAddress) {
        console.warn(`Liquidity pool ${liquidityPoolAddress} does not contain RFP token. Skipping it.`)
        continue
      }
      const farmBot = getContract({
        address: rfpTokenAddress,
        abi: FARM_BOT_ABI,
        publicClient,
      })
      const totalFP = await farmBot.read.totalSupply()
      const totalLP = await farmBot.read.getLpAmount([totalFP])
      const stakingTokenAddress = await farmBot.read.stakingToken()

      const stakingTokenContract = getContract({
        abi: UNISWAP_V2_PAIR_ABI,
        address: stakingTokenAddress,
        publicClient,
      })

      const stakedToken0 = await stakingTokenContract.read.token0()
      const stakedToken0Contract = getContract({
        abi: ERC20_ABI,
        address: stakedToken0,
        publicClient,
      })
      const stakedToken0Name = await stakedToken0Contract.read.symbol()

      const stakedToken1 = await stakingTokenContract.read.token1()

      const stakedToken1Contract = getContract({
        address: stakedToken1,
        abi: ERC20_ABI,
        publicClient,
      })
      const stakedToken1Name = await stakedToken1Contract.read.symbol()

      liquidityPoolSummaries.push({
        tokenAddress,
        rfpTokenAddress,
        farmBotSummary: {
          token0Address: stakedToken0,
          token0Name: stakedToken0Name,
          token1Address: stakedToken1,
          token1Name: stakedToken1Name,
          stakingTokenAddress,
          totalLP: Number(totalLP),
        },
        userBalance: Number(userBalance),
      })
    }
    setSummaries(liquidityPoolSummaries)
  }, [farmSummaries, address])

  useEffect(() => {
    call()
  }, [call])
  return summaries
}
