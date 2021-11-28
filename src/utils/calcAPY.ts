import { Percent } from '@ubeswap/sdk'
import { CompoundBotSummary } from 'pages/Compound/useCompoundRegistry'
import { fromWei } from 'web3-utils'

function annualizedPercentageYield(nominal: Percent, compounds: number) {
  const ONE = 1

  const divideNominalByNAddOne = Number(nominal.divide(BigInt(compounds)).add(BigInt(ONE)).toFixed(10))

  // multiply 100 to turn decimal into percent, to fixed since we only display integer
  return ((divideNominalByNAddOne ** compounds - ONE) * 100).toFixed(0)
}

export function calcAPY(compoundBotSummary: CompoundBotSummary, cusdPrices, stakingTokenPair) {
  const amountStakedToken0 =
    stakingTokenPair?.tokenAmounts[0]?.numerator / stakingTokenPair?.tokenAmounts[0]?.denominator
  const amountStakedToken1 =
    stakingTokenPair?.tokenAmounts[1]?.numerator / stakingTokenPair?.tokenAmounts[1]?.denominator

  const token0Price = cusdPrices[0]?.numerator / cusdPrices[0]?.denominator
  const token1Price = cusdPrices[1]?.numerator / cusdPrices[1]?.denominator

  const totalStakedCUSD = token0Price * amountStakedToken0 + token1Price * amountStakedToken1
  const CUSDPerStakedLP = totalStakedCUSD / fromWei(compoundBotSummary.totalLPSupply)
  const stakedCUSDInFarm = fromWei(compoundBotSummary.totalLPInFarm) * CUSDPerStakedLP

  const rewardsTokenPrice = cusdPrices[2]?.numerator / cusdPrices[2]?.denominator
  const yearlyRewards = fromWei(compoundBotSummary.rewardsRate) * 60 * 60 * 24 * 365
  const yearlyRewardsValue = yearlyRewards * rewardsTokenPrice

  let rewardApr, compoundedAPY
  try {
    rewardApr = new Percent(Math.round(yearlyRewardsValue), Math.round(stakedCUSDInFarm))
    console.log(yearlyRewardsValue, stakedCUSDInFarm)
    const compoundsPerYear = 365 * 24
    compoundedAPY = annualizedPercentageYield(rewardApr, compoundsPerYear)
  } catch (e) {
    console.log('error calculating rewards apy')
  }

  const displayedAPY = compoundedAPY ? `${Number(compoundedAPY).toFixed(2)}%` : `-`
  return displayedAPY
}
