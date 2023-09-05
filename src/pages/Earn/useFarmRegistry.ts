import { ethers } from 'ethers'
import React, { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { AppState } from 'state'
import { fromWei, toBN } from 'web3-utils'

import farmRegistryAbi from '../../constants/abis/FarmRegistry.json'
import { useBlockNumber, useNetwork, usePublicClient } from 'wagmi'
import { getContract } from 'viem'
import { FarmDataEventABI, FarmInfoEventABI, LPInfoEventABI } from '../../constants/abis/farmRegistry'

type FarmData = {
  tvlUSD: string
  rewardsUSDPerYear: string
}

export type FarmSummary = {
  farmName: string
  stakingAddress: string
  lpAddress: string
  rewardsUSDPerYear: string
  tvlUSD: string
  token0Address: string
  token1Address: string
}

const CREATION_BLOCK = 9840049
const LAST_N_BLOCKS = 1440 // Last 2 hours

export const useFarmRegistry = () => {
  const [farmSummaries, setFarmSummaries] = React.useState<FarmSummary[]>([])

  const { chain } = useNetwork()
  const chainId = chain?.id
  const state = useSelector<AppState, AppState['transactions']>((state) => state.transactions)
  const transactions = useMemo(() => (chainId ? state[chainId] ?? {} : {}), [chainId, state])

  const call = React.useCallback(async () => {
    const farmBotRegistryAddress = '0xa2bf67e12EeEDA23C7cA1e5a34ae2441a17789Ec'
    const farmRegistryContract = getContract({
      address: farmBotRegistryAddress,
      abi: farmRegistryAbi,
    })
    const lastBlock = useBlockNumber()
    const client = usePublicClient()

    const [farmInfoEvents, lpInfoEvents, farmDataEvents] = await Promise.all([
      client.getLogs({
        address: farmBotRegistryAddress,
        fromBlock: BigInt(CREATION_BLOCK),
        toBlock: lastBlock.data,
        event: FarmInfoEventABI,
      }),
      client.getLogs({
        address: farmBotRegistryAddress,
        fromBlock: BigInt(CREATION_BLOCK),
        toBlock: lastBlock.data,
        event: LPInfoEventABI,
      }),
      client.getLogs({
        address: farmBotRegistryAddress,
        fromBlock: lastBlock.data ? lastBlock.data - BigInt(LAST_N_BLOCKS) : BigInt(CREATION_BLOCK),
        toBlock: lastBlock.data,
        event: FarmDataEventABI,
      }),
    ])

    const lps: Record<string, [string, string]> = {}
    lpInfoEvents.forEach(({ args: { lpAddress, token0Address, token1Address } }) => {
      if (lpAddress && token0Address && token1Address) {
        lps[lpAddress] = [token0Address, token1Address]
      }
    })
    const farmData: Record<string, FarmData> = {}
    farmDataEvents.forEach(({ args: { stakingAddress, tvlUSD, rewardsUSDPerYear } }) => {
      if (stakingAddress) {
        farmData[stakingAddress] = {
          tvlUSD: tvlUSD?.toString() ?? '0',
          rewardsUSDPerYear: rewardsUSDPerYear?.toString() ?? '0',
        }
      }
    })
    const farmSummaries: FarmSummary[] = []
    farmInfoEvents.forEach(({ args: { stakingAddress, farmName, lpAddress } }) => {
      // sometimes there is no farm data for the staking address return early to avoid crash
      if (!stakingAddress || !lpAddress || !farmName || !farmData[stakingAddress]) {
        return
      }
      farmSummaries.push({
        farmName: ethers.utils.parseBytes32String(farmName),
        stakingAddress: stakingAddress,
        lpAddress: lpAddress,
        token0Address: lps[lpAddress][0],
        token1Address: lps[lpAddress][1],
        tvlUSD: farmData[stakingAddress].tvlUSD,
        rewardsUSDPerYear: farmData[stakingAddress].rewardsUSDPerYear,
      })
    })
    farmSummaries
      .sort((a, b) => Number(fromWei(toBN(b.rewardsUSDPerYear).sub(toBN(a.rewardsUSDPerYear)))))
      .sort((a, b) => Number(fromWei(toBN(b.tvlUSD).sub(toBN(a.tvlUSD)))))
    setFarmSummaries(farmSummaries)
  }, [chainId, transactions])

  useEffect(() => {
    call()
  }, [call])

  return farmSummaries
}
