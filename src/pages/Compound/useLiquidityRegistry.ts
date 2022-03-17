import { useContractKit } from '@celo-tools/use-contractkit'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { useCallback, useEffect, useState } from 'react'
import { AbiItem } from 'web3-utils'

import { ERC20_ABI } from '../../constants/abis/erc20'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import { useFarmRegistry } from '../Earn/useFarmRegistry'
import { farmBotAddresses, FarmBotSummaryBase } from './useFarmBotRegistry'

export type LiquiditySummary = {
  tokenAddress: string
  rfpTokenAddress: string
  farmBotSummary: FarmBotSummaryBase
  userBalance: number
}

// pools containing RFP
const liquidityPoolAddresses = ['0x25938830FBd7619bf6CFcFDf5C37A22AB15A93cA']

export const useLiquidityRegistry = () => {
  const { address, kit } = useContractKit()
  const [summaries, setSummaries] = useState<LiquiditySummary[]>([])

  const farmSummaries = useFarmRegistry()

  const call = useCallback(async () => {
    const liquidityPoolSummaries: LiquiditySummary[] = []
    for (const liquidityPoolAddress of liquidityPoolAddresses) {
      const uniswapV2Pair = new kit.web3.eth.Contract(IUniswapV2Pair as AbiItem[], liquidityPoolAddress)

      const token0Address = await uniswapV2Pair.methods.token0().call()
      const token1Address = await uniswapV2Pair.methods.token1().call()
      const userBalance = address ? await uniswapV2Pair.methods.balanceOf(address).call() : 0

      // expect token0 or token1 to be RFP token
      const rfpTokenAddress = [token0Address, token1Address].find((address) => farmBotAddresses.includes(address))
      const tokenAddress = token0Address === rfpTokenAddress ? token1Address : token0Address

      const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], rfpTokenAddress)
      const totalFP = await farmBot.methods.totalSupply().call()
      const totalLP = await farmBot.methods.getLpAmount(totalFP).call()
      const stakingTokenAddress = await farmBot.methods.stakingToken().call()
      const stakingTokenContract = new kit.web3.eth.Contract(IUniswapV2Pair as AbiItem[], stakingTokenAddress)

      const stakedToken0 = await stakingTokenContract.methods.token0().call()
      const stakedToken0Contract = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], stakedToken0)
      const stakedToken0Name = await stakedToken0Contract.methods.symbol().call()

      const stakedToken1 = await stakingTokenContract.methods.token1().call()
      const stakedToken1Contract = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], stakedToken1)
      const stakedToken1Name = await stakedToken1Contract.methods.symbol().call()

      liquidityPoolSummaries.push({
        tokenAddress,
        rfpTokenAddress,
        farmBotSummary: {
          token0Address: stakedToken0,
          token0Name: stakedToken0Name,
          token1Address: stakedToken1,
          token1Name: stakedToken1Name,
          stakingTokenAddress,
          totalLP,
        },
        userBalance,
      })
    }
    setSummaries(liquidityPoolSummaries)
  }, [kit.web3.eth, address, farmSummaries])

  useEffect(() => {
    call()
  }, [call])
  return summaries
}
