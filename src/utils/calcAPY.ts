import { gql, useQuery } from '@apollo/client'
import { Percent } from '@ubeswap/sdk'
import { FarmBotSummary } from 'pages/Compound/useCompoundRegistry'
import { toBN, toWei } from 'web3-utils'

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

export function useCalcAPY(farmBotSummary: FarmBotSummary) {
  const { data, loading, error } = useQuery(pairDataGql, {
    variables: { id: farmBotSummary?.stakingTokenAddress?.toLowerCase() },
  })

  if (!farmBotSummary || !farmBotSummary.rewardsUSDPerYear || !farmBotSummary.tvlUSD) {
    return '-'
  }

  let swapRewardsUSDPerYear = 0
  if (!loading && !error && data) {
    const lastDayVolumeUsd = data.pair.pairHourData.reduce(
      (acc: number, curr: { hourlyVolumeUSD: string }) => acc + Number(curr.hourlyVolumeUSD),
      0
    )
    swapRewardsUSDPerYear = Math.floor(lastDayVolumeUsd * 365 * 0.0025)
  }

  const rewardApr = new Percent(farmBotSummary.rewardsUSDPerYear, farmBotSummary.tvlUSD)
  const swapApr = new Percent(toWei(swapRewardsUSDPerYear.toString()), farmBotSummary.tvlUSD)
  const apr = new Percent(
    toBN(toWei(swapRewardsUSDPerYear.toString())).add(toBN(farmBotSummary.rewardsUSDPerYear)).toString(),
    farmBotSummary.tvlUSD
  )

  let compoundedAPY
  try {
    compoundedAPY = annualizedPercentageYield(apr, COMPOUNDS_PER_YEAR)
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    console.error('apy calc overflow', farmSummary.farmName, e)
  }
  const displayedAPY = compoundedAPY ? `${Number(compoundedAPY).toFixed(2)}%` : `-`
  return displayedAPY
}
