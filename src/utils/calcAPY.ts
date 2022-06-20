import { gql, useQuery } from '@apollo/client'
import { Fraction, Percent, TokenAmount } from '@ubeswap/sdk'
import BigNumber from 'bignumber.js'
import { FarmBotSummary } from 'pages/Compound/useFarmBotRegistry'
import { toBN, toWei } from 'web3-utils'

import { usePair } from '../data/Reserves'
import { useCurrency, useToken } from '../hooks/Tokens'
import { useTokenContract } from '../hooks/useContract'
import { FarmBotRewards } from '../pages/Compound/useFarmBotRewards'
import { useSingleCallResult } from '../state/multicall/hooks'
import { usePairStakingInfo } from '../state/stake/useStakingInfo'
import { useCUSDPrice, useCUSDPrices } from './useCUSDPrice'

const pairDataGql = gql`
  query getPairHourData($id: String!) {
    pair(id: $id) {
      pairHourData(first: 24, orderBy: hourStartUnix, orderDirection: desc) {
        hourStartUnix
        hourlyVolumeUSD
      }
    }
  }
`
const COMPOUNDS_PER_YEAR = 365 * 24

function annualizedPercentageYield(nominal: Percent, compounds: number) {
  const ONE = 1

  const divideNominalByNAddOne = Number(nominal.divide(BigInt(compounds)).add(BigInt(ONE)).toFixed(10))

  // multiply 100 to turn decimal into percent, to fixed since we only display integer
  return ((divideNominalByNAddOne ** compounds - ONE) * 100).toFixed(0)
}

export function useCalcAPY(farmBotSummary: (FarmBotRewards & FarmBotSummary) | undefined): number | undefined {
  const { data, loading, error } = useQuery(pairDataGql, {
    variables: { id: farmBotSummary?.stakingTokenAddress?.toLowerCase() },
  })

  if (!farmBotSummary || !farmBotSummary.rewardsUSDPerYear || !farmBotSummary.tvlUSD) {
    return undefined
  }

  let swapRewardsUSDPerYear = 0
  if (!loading && !error && data) {
    const lastDayVolumeUsd = data.pair.pairHourData.reduce(
      (acc: number, curr: { hourlyVolumeUSD: string }) => acc + Number(curr.hourlyVolumeUSD),
      0
    )
    swapRewardsUSDPerYear = Math.floor(lastDayVolumeUsd * 365 * 0.0025)
  }
  const apr = new Percent(
    toBN(toWei(swapRewardsUSDPerYear.toString())).add(toBN(farmBotSummary.rewardsUSDPerYear)).toString(),
    farmBotSummary.tvlUSD
  )

  let compoundedAPY
  try {
    // fixme might need to take swap APR out of this (not sure it's possible to compound swap rewards...)
    compoundedAPY = annualizedPercentageYield(apr, COMPOUNDS_PER_YEAR)
  } catch (e) {
    console.error('apy calc overflow', farmBotSummary.address, e)
  }
  return compoundedAPY ? Number(compoundedAPY) : undefined
}

const SECONDS_PER_YEAR = BigInt(365.25 * 24 * 60 * 60)

export function useCalculateMetaFarmAPY(
  metaFarmBotInfo: FarmBotSummary,
  underlyingFarmAPY: number | undefined,
  normalTokenAddress: string | undefined
) {
  console.log(`farmBotInfo: ${JSON.stringify(metaFarmBotInfo)}`)
  const tokenA = useCurrency(metaFarmBotInfo.token0Address) ?? undefined
  const tokenB = useCurrency(metaFarmBotInfo.token1Address) ?? undefined
  const [, stakingTokenPair] = usePair(tokenA, tokenB)
  const { totalRewardRates } = usePairStakingInfo(stakingTokenPair, metaFarmBotInfo.stakingRewardsAddress) ?? {
    totalRewardRates: [],
  }
  // console.log(`totalRewardRates: ${JSON.stringify(totalRewardRates)}`)
  const rewardsTokenPrices = useCUSDPrices(totalRewardRates?.map((tokenAmount: TokenAmount) => tokenAmount.token))
  const normalTokenContract = useTokenContract(normalTokenAddress)
  const normalTokensInLP =
    useSingleCallResult(normalTokenContract, 'balanceOf', [metaFarmBotInfo.stakingTokenAddress])?.result ?? '0'
  const normalTokenPrice = useCUSDPrice(useToken(normalTokenAddress) ?? undefined)
  if (!rewardsTokenPrices || !totalRewardRates || !normalTokensInLP || !normalTokenPrice) {
    return
  }
  const normalTokenBalance = new BigNumber(normalTokensInLP as unknown as string)
    .times(metaFarmBotInfo.totalLPInFarm)
    .dividedToIntegerBy(metaFarmBotInfo.totalLPSupply)
  // console.log(`normalTokenBalance: ${normalTokenBalance}, normalTokenPrice: ${normalTokenPrice.toFixed(2)}`)
  const metaFarmTVL = normalTokenPrice.raw.multiply(normalTokenBalance.toString()).multiply('2') // multiplying by 2 since there is 1 other token in the pool with equal value
  // console.log(`tvl: ${metaFarmTVL.toFixed(2)}`)
  let cUSDRewardsPerYear = new Fraction('0', '1')
  for (let idx = 0; idx < totalRewardRates.length; idx++) {
    const price = rewardsTokenPrices[idx]
    if (!price) {
      continue
    }
    cUSDRewardsPerYear = cUSDRewardsPerYear.add(price.raw.multiply(totalRewardRates[idx]).divide(SECONDS_PER_YEAR))
  }
  const metaFarmRewardsAPR = cUSDRewardsPerYear.divide(metaFarmTVL)
  if (!metaFarmRewardsAPR) {
    console.warn('Cannot calculate meta APY, leaving blank')
    return
  }
  const metaFarmRewardsAPY = Number(annualizedPercentageYield(metaFarmRewardsAPR, COMPOUNDS_PER_YEAR))
  return metaFarmRewardsAPY + 0.5 * (underlyingFarmAPY ?? 0) // this probably isn't exactly right, since some rewards from the meta-farm will go into the underlying farm and gain interest. But it's a lower bound and good enough for now.
}
