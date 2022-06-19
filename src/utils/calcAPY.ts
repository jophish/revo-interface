import { gql, useQuery } from '@apollo/client'
import { Percent } from '@ubeswap/sdk'
import { FarmBotSummary } from 'pages/Compound/useFarmBotRegistry'
import { toBN, toWei } from 'web3-utils'

import { FarmBotRewards } from '../pages/Compound/useFarmBotRewards'

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

export function useCalcAPY(farmBotSummary: FarmBotRewards & FarmBotSummary): number | undefined {
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

export function useCalculateMetaFarmAPY(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _farmBotInfo: FarmBotRewards & FarmBotSummary,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _underlyingFarmAPY: number | undefined
) {
  // TODO
  return '100%'
}
