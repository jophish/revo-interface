import { useContractKit } from '@celo-tools/use-contractkit'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { useCallback, useEffect, useState } from 'react'
import { AbiItem } from 'web3-utils'

import { ERC20_ABI } from '../../constants/abis/erc20'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import LIQUIDITY_GAUGE_ABI from '../../constants/abis/LiquidityGauge.json'
import MOOLA_STAKING_REWARDS_ABI from '../../constants/abis/moola/MoolaStakingRewards.json'
import mobiusFarmBotAbi from '../../constants/abis/RevoMobiusFarmBot'

export enum FarmBotType {
  Ubeswap,
  Mobius,
}

export interface FarmBotInfo {
  address: string
  type: FarmBotType
}

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
  stakingRewardsAddress?: string
  totalLPInFarm: number
  totalLPSupply: number
  type: FarmBotType
}

async function getUbeswapFarmInfo(kit, stakingTokenAddress, farmBotInfo: FarmBotInfo) {
  const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], farmBotInfo.address)
  const stakingTokenContract = new kit.web3.eth.Contract(IUniswapV2Pair as AbiItem[], stakingTokenAddress)
  const stakingRewardsAddress = await farmBot.methods.stakingRewards().call()

  const stakingRewardsContract = new kit.web3.eth.Contract(
    MOOLA_STAKING_REWARDS_ABI as AbiItem[],
    stakingRewardsAddress
  )

  const totalLPInFarm = await stakingRewardsContract.methods.totalSupply().call()
  const totalLPSupply = await stakingTokenContract.methods.totalSupply().call()
  return {
    stakingRewardsAddress,
    totalLPInFarm,
    totalLPSupply,
  }
}

async function getMobiusFarmInfo(kit, stakingTokenAddress, farmBotInfo: FarmBotInfo) {
  const mobiusFarmBot = new kit.web3.eth.Contract(mobiusFarmBotAbi.abi as AbiItem[], farmBotInfo.address)
  const stakingTokenContract = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], stakingTokenAddress)
  const gaugeAddress = await mobiusFarmBot.methods.liquidityGauge().call()
  const gaugeContract = new kit.web3.eth.Contract(LIQUIDITY_GAUGE_ABI as AbiItem[], gaugeAddress)
  const stakingRewardsAddress = await gaugeContract.methods.reward_contract().call()
  const totalLPInFarm = await stakingTokenContract.methods.balanceOf(stakingRewardsAddress).call()
  const totalLPSupply = await stakingTokenContract.methods.totalSupply().call()
  return {
    stakingRewardsAddress,
    totalLPInFarm,
    totalLPSupply,
  }
}

export const useFarmBotRegistry = (farmBotInfoList: FarmBotInfo[]) => {
  const { address, kit } = useContractKit()
  const [botSummaries, setBotSummaries] = useState<FarmBotSummary[]>([])
  const call = useCallback(async () => {
    const botSummaries: FarmBotSummary[] = []
    for (const farmBotInfo of farmBotInfoList) {
      const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], farmBotInfo.address)

      const totalFP = await farmBot.methods.totalSupply().call()
      const totalLP = await farmBot.methods.getLpAmount(totalFP).call()
      const exchangeRate = totalLP / totalFP

      let amountUserFP = address ? await farmBot.methods.balanceOf(address).call() : 0
      amountUserFP = amountUserFP > 10 ? amountUserFP : 0
      const amountUserLP = await farmBot.methods.getLpAmount(amountUserFP).call()
      const stakingTokenAddress = await farmBot.methods.stakingToken().call()

      const token0Address = await farmBot.methods.stakingToken0().call()
      const token0Contract = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], token0Address)
      const token0Name = await token0Contract.methods.symbol().call()

      const token1Address = await farmBot.methods.stakingToken1().call()
      const token1Contract = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], token1Address)
      const token1Name = await token1Contract.methods.symbol().call()

      const botSummary = {
        address: farmBotInfo.address,
        amountUserFP,
        amountUserLP,
        token0Name,
        token1Name,
        token0Address,
        token1Address,
        stakingTokenAddress,
        totalLP,
        totalFP,
        exchangeRate,
        type: farmBotInfo.type,
      }

      switch (farmBotInfo.type) {
        case FarmBotType.Ubeswap: {
          const ubeswapFarmInfo = await getUbeswapFarmInfo(kit, stakingTokenAddress, farmBotInfo)
          botSummaries.push({
            ...botSummary,
            ...ubeswapFarmInfo,
          })
          break
        }
        case FarmBotType.Mobius: {
          const mobiusFarmInfo = await getMobiusFarmInfo(kit, stakingTokenAddress, farmBotInfo)
          botSummaries.push({
            ...botSummary,
            ...mobiusFarmInfo,
          })
          break
        }
      }
    }
    setBotSummaries(botSummaries)
  }, [address, farmBotInfoList, kit])

  useEffect(() => {
    call()
  }, [call])
  return botSummaries
}
