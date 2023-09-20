export interface FarmBotSummaryBase {
  token0Address: string
  token1Address: string
  token0Name: string
  token1Name: string
  stakingTokenAddress: string
  totalLP: number
}

export interface FarmBotSummary extends FarmBotSummaryBase {
  address: string
  amountUserFP: number
  amountUserLP: number
  totalFP: number
  exchangeRate: number
  // userLPValue: number
  stakingRewardsAddress: string
  rewardsUSDPerYear?: string
  tvlUSD?: string
  totalLPInFarm: number
  totalLPSupply: number
}

export const farmBotAddresses: `0x${string}`[] = ['0xCB34fbfC3b9a73bc04D2eb43B62532c7918d9E81']
