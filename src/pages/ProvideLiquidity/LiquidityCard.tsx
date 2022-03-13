import { Token } from '@ubeswap/sdk'
import { PoolCard } from 'components/earn/PoolCard'
import QuestionHelper from 'components/QuestionHelper'
import { RowBetween, RowFixed } from 'components/Row'
import { CompoundBotSummaryBase } from 'pages/Compound/useCompoundRegistry'
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
  compoundBotSummary: CompoundBotSummaryBase
  userBalance: number
}

export default function LiquidityCard({ token0, token1, compoundBotSummary, userBalance }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

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
    setExpanded((prev) => !prev)
  }

  return (
    <PoolCard
      token0={token0}
      token1={token1}
      poolTitle={`${token0.symbol} / ${compoundBotSummary.token0Name}-${compoundBotSummary.token1Name} ${token1.symbol} LP`}
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
