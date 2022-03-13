import { Token } from '@ubeswap/sdk'
import { LightCard } from 'components/Card'
import { PoolCard } from 'components/earn/PoolCard'
import QuestionHelper from 'components/QuestionHelper'
import { RowBetween, RowFixed } from 'components/Row'
import { PoolPriceBar } from 'pages/AddLiquidity/PoolPriceBar'
import { CompoundBotSummaryBase } from 'pages/Compound/useCompoundRegistry'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDerivedMintInfo } from 'state/mint/hooks'
import { TYPE } from 'theme'

import { useLPValue } from './useLPValue'

interface Props {
  token0: Token
  token1: Token
  compoundBotSummary: CompoundBotSummaryBase
  userBalance: number
}

export default function LiquidityCard({ token0, token1, compoundBotSummary, userBalance }: Props) {
  const { t } = useTranslation()
  const { currencies, price, noLiquidity, poolTokenPercentage } = useDerivedMintInfo(token0, token1)

  const { userValueCUSD: tvlCUSD } = useLPValue(compoundBotSummary.totalLP ?? 0, {
    token0Address: compoundBotSummary.token0Address,
    token1Address: compoundBotSummary.token1Address,
    lpAddress: compoundBotSummary.stakingTokenAddress,
  })

  const PoolDetails = (
    <RowBetween padding="8px 0">
      <TYPE.black fontWeight={500}>
        <span>Your stake</span>
      </TYPE.black>

      <RowFixed>
        <>
          <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
            ${userBalance}
          </TYPE.black>
          <QuestionHelper text={`Some explanation of this value`} />
        </>
      </RowFixed>
    </RowBetween>
  )

  const handleAddLiquidity = () => {
    // do something
  }

  return (
    <PoolCard
      token0={token0}
      token1={token1}
      poolTitle={`${token0.symbol}/${compoundBotSummary.token0Name}-${compoundBotSummary.token1Name} ${token1.symbol} LP`}
      buttonLabel={t('addLiquidity')}
      buttonOnPress={handleAddLiquidity}
      buttonActive={false}
      tvlCUSD={tvlCUSD}
      tvlCUSDInfo={t('farmBotTVLInfo')}
      PoolDetails={PoolDetails}
    >
      <LightCard padding="16px">
        <PoolPriceBar
          currencies={currencies}
          poolTokenPercentage={poolTokenPercentage}
          noLiquidity={noLiquidity}
          price={price}
        />
      </LightCard>
    </PoolCard>
  )
}
