import { Token } from '@ubeswap/sdk'
import { LightCard } from 'components/Card'
import { PoolPriceBar } from 'pages/AddLiquidity/PoolPriceBar'
import { CompoundBotSummaryBase } from 'pages/Compound/useCompoundRegistry'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDerivedMintInfo } from 'state/mint/hooks'
import styled from 'styled-components'

import { useLPValue } from './useLPValue'

const Wrapper = styled.div`
  width: 100%;
  max-width: 640px;
`

interface Props {
  token0: Token
  token1: Token
  compoundBotSummary: CompoundBotSummaryBase
}

export default function AddLiquidity({ token0, token1, compoundBotSummary }: Props) {
  const { t } = useTranslation()
  const {
    dependentField,
    currencies,
    pair,
    pairState,
    currencyBalances,
    parsedAmounts,
    price,
    noLiquidity,
    liquidityMinted,
    poolTokenPercentage,
    error,
    showRampA,
    showRampB,
  } = useDerivedMintInfo(token0, token1)

  const { userValueCUSD: tvlCUSD } = useLPValue(compoundBotSummary.totalLP ?? 0, {
    token0Address: compoundBotSummary.token0Address,
    token1Address: compoundBotSummary.token1Address,
    lpAddress: compoundBotSummary.stakingTokenAddress,
  })

  return (
    <Wrapper>
      <p>{`Pool name: ${token0.symbol}/${compoundBotSummary.token0Name}-${compoundBotSummary.token1Name} ${token1.symbol} LP`}</p>
      <p>{`Total deposited: ${Number(tvlCUSD?.toFixed(2)).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })}`}</p>
      <p>On expand:</p>
      <p>{`Token 0: ${token0.symbol}`}</p>
      <p>{`Token 1: ${token1.symbol}`}</p>
      <LightCard padding="1rem" borderRadius={'20px'}>
        <PoolPriceBar
          currencies={currencies}
          poolTokenPercentage={poolTokenPercentage}
          noLiquidity={noLiquidity}
          price={price}
        />
      </LightCard>
    </Wrapper>
  )
}
