import { gql, useQuery } from '@apollo/client'
import { Fraction, Percent, TokenAmount } from '@ubeswap/sdk'
import { FarmBotSummary } from 'pages/Compound/useFarmBotRegistry'
import { toBN, toWei } from 'web3-utils'

import { usePair } from '../data/Reserves'
import { useCurrency } from '../hooks/Tokens'
import { FarmBotRewards } from '../pages/Compound/useFarmBotRewards'
import { usePairStakingInfo } from '../state/stake/useStakingInfo'
import { useCUSDPrices } from './useCUSDPrice'

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

export function useCalculateMetaFarmAPY(metaFarmBotInfo: FarmBotSummary, underlyingFarmAPY: number | undefined) {
  console.log(`farmBotInfo: ${JSON.stringify(metaFarmBotInfo)}`)
  const tokenA = useCurrency(metaFarmBotInfo.token0Address) ?? undefined
  const tokenB = useCurrency(metaFarmBotInfo.token1Address) ?? undefined
  const [, stakingTokenPair] = usePair(tokenA, tokenB)
  const { totalRewardRates } = usePairStakingInfo(stakingTokenPair, metaFarmBotInfo.stakingRewardsAddress) ?? {
    totalRewardRates: [],
  }
  // console.log(`totalRewardRates: ${JSON.stringify(totalRewardRates)}`)
  const rewardsTokenPrices = useCUSDPrices(totalRewardRates?.map((tokenAmount: TokenAmount) => tokenAmount.token))
  if (!rewardsTokenPrices || !totalRewardRates) {
    return
  }
  let cUSDRewardsPerYear = new Fraction('0', '1')
  for (let idx = 0; idx < totalRewardRates.length; idx++) {
    const price = rewardsTokenPrices[idx]
    if (!price) {
      continue
    }
    cUSDRewardsPerYear = cUSDRewardsPerYear.add(price.raw.multiply(totalRewardRates[idx]).divide(SECONDS_PER_YEAR))
  }
  const metaAPY = cUSDRewardsPerYear // TODO need to divide by TVL
  if (!metaAPY) {
    console.log('Undefined meta apy') // fixme this keeps happening :(
    return
  }
  return Number(metaAPY.toFixed(2)) + 0.5 * (underlyingFarmAPY ?? 0)
}
