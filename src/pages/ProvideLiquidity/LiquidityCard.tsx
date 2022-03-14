import { PoolCard } from 'components/earn/PoolCard'
import { RowBetween, RowFixed } from 'components/Row'
import { LiquiditySummary } from 'pages/Compound/useLiquidityRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { TYPE } from 'theme'
import { fromWei, toBN } from 'web3-utils'

import AddLiquidityConfirm from './AddLiquidityConfirm'
import AddLiquidityForm from './AddLiquidityForm'

const Container = styled.div<{ $expanded: boolean }>`
  margin-top: ${({ $expanded }) => ($expanded ? '12px' : '0')};
  max-height: ${({ $expanded }) => ($expanded ? '610px' : '0')};
  transition: all 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
`

export default function LiquidityCard({ token, rfpToken, farmBotSummary, userBalance }: LiquiditySummary) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

  const { userValueCUSD: tvlCUSD } = useLPValue(farmBotSummary.totalLP ?? 0, {
    token0Address: farmBotSummary.token0Address,
    token1Address: farmBotSummary.token1Address,
    lpAddress: farmBotSummary.stakingTokenAddress,
  })

  const PoolDetails = (
    <RowBetween padding="8px 0">
      <TYPE.black fontWeight={500}>{t('YourTotalPoolTokens')}</TYPE.black>
      <RowFixed>
        <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
          {Number(fromWei(toBN(userBalance))).toPrecision(4)}
        </TYPE.black>
      </RowFixed>
    </RowBetween>
  )

  const handleAddLiquidity = () => {
    setExpanded((prev) => !prev)
  }

  return (
    <PoolCard
      token0={token}
      token1={rfpToken}
      poolTitle={`${token.symbol} / ${farmBotSummary.token0Name}-${farmBotSummary.token1Name} ${rfpToken.symbol} LP`}
      buttonLabel={t('addLiquidity')}
      buttonOnPress={handleAddLiquidity}
      buttonActive={expanded}
      tvlCUSD={tvlCUSD}
      tvlCUSDInfo={t('farmBotTVLInfo')}
      PoolDetails={PoolDetails}
    >
      <Container $expanded={expanded}>
        <AddLiquidityConfirm
          token0={token}
          token1={rfpToken}
          isOpen={showConfirm}
          onDismiss={() => {
            setShowConfirm(false)
          }}
        />
        <AddLiquidityForm
          token0={token}
          token1={rfpToken}
          onConfirmAddLiquidity={() => {
            setShowConfirm(true)
          }}
        />
      </Container>
    </PoolCard>
  )
}
