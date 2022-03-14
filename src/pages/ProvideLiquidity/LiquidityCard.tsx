import { Token } from '@ubeswap/sdk'
import { PoolCard } from 'components/earn/PoolCard'
import QuestionHelper from 'components/QuestionHelper'
import { RowBetween, RowFixed } from 'components/Row'
import { FarmBotSummaryBase } from 'pages/Compound/useCompoundRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { TYPE } from 'theme'

import AddLiquidityConfirm from './AddLiquidityConfirm'
import AddLiquidityForm from './AddLiquidityForm'

const Container = styled.div<{ $expanded: boolean }>`
  margin-top: ${({ $expanded }) => ($expanded ? '12px' : '0')};
  max-height: ${({ $expanded }) => ($expanded ? '610px' : '0')};
  transition: all 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
`

interface Props {
  token0: Token
  token1: Token
  farmBotSummary: FarmBotSummaryBase
  userBalance: number
}

export default function LiquidityCard({ token0, token1, farmBotSummary, userBalance }: Props) {
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
    setExpanded((prev) => !prev)
  }

  return (
    <PoolCard
      token0={token0}
      token1={token1}
      poolTitle={`${token0.symbol} / ${farmBotSummary.token0Name}-${farmBotSummary.token1Name} ${token1.symbol} LP`}
      buttonLabel={t('addLiquidity')}
      buttonOnPress={handleAddLiquidity}
      buttonActive={expanded}
      tvlCUSD={tvlCUSD}
      tvlCUSDInfo={t('farmBotTVLInfo')}
      PoolDetails={PoolDetails}
    >
      <Container $expanded={expanded}>
        <AddLiquidityConfirm
          token0={token0}
          token1={token1}
          isOpen={showConfirm}
          onDismiss={() => {
            setShowConfirm(false)
          }}
        />
        <AddLiquidityForm
          token0={token0}
          token1={token1}
          onConfirmAddLiquidity={() => {
            setShowConfirm(true)
          }}
        />
      </Container>
    </PoolCard>
  )
}
