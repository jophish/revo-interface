import { ButtonPrimary } from 'components/Button'
import { RowBetween, RowFixed } from 'components/Row'
import { useToken } from 'hooks/Tokens'
import { LiquiditySummary } from 'pages/Compound/useLiquidityRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import { PoolCard } from 'pages/Zap/PoolCard'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { TYPE } from 'theme'
import { fromWei, toBN } from 'web3-utils'

import AddLiquidityConfirm from './AddLiquidityConfirm'
import AddLiquidityForm from './AddLiquidityForm'
import RemoveLiquidityForm from './RemoveLiqudityForm'
import RemoveLiquidityConfirm from './RemoveLiquidityConfirm'

const Container = styled.div<{ $expanded: boolean }>`
  margin-top: ${({ $expanded }) => ($expanded ? '12px' : '0')};
  max-height: ${({ $expanded }) => ($expanded ? '610px' : '0')};
  transition: all 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
  overflow: hidden;
`
type ACTION_TYPE = 'add' | 'remove'

export default function LiquidityCard({
  tokenAddress,
  rfpTokenAddress,
  farmBotSummary,
  userBalance,
}: LiquiditySummary) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showConfirmAdd, setShowConfirmAdd] = useState<boolean>(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState<boolean>(false)
  const [actionType, setActionType] = useState<ACTION_TYPE>('add')

  const { userValueCUSD: tvlCUSD } = useLPValue(farmBotSummary.totalLP ?? 0, {
    token0Address: farmBotSummary.token0Address,
    token1Address: farmBotSummary.token1Address,
    lpAddress: farmBotSummary.stakingTokenAddress,
  })

  const token = useToken(tokenAddress)
  const rfpToken = useToken(rfpTokenAddress)

  const PoolDetails = (
    <>
      {userBalance ? (
        <RowBetween padding="8px 0">
          <TYPE.black fontWeight={500}>{t('YourTotalPoolTokens')}</TYPE.black>
          <RowFixed>
            <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
              {Number(fromWei(toBN(userBalance))).toPrecision(4)}
            </TYPE.black>
          </RowFixed>
        </RowBetween>
      ) : null}
    </>
  )

  const handleAddLiquidity = () => {
    setExpanded((prev) => !prev)
  }

  const handleSetActionType = (type: ACTION_TYPE) => {
    setActionType(type)
  }

  if (!token || !rfpToken) {
    return null
  }

  return (
    <PoolCard
      token0={token}
      token1={rfpToken}
      poolTitle={t('liquidityCardTitle', { token0: farmBotSummary.token0Name, token1: farmBotSummary.token1Name })}
      buttonLabel={userBalance ? t('manage') : t('addLiquidity')}
      buttonOnPress={handleAddLiquidity}
      buttonActive={expanded}
      tvlCUSD={tvlCUSD}
      tvlCUSDInfo={t('farmBotTVLInfo')}
      PoolDetails={PoolDetails}
    >
      <Container $expanded={expanded}>
        {userBalance ? (
          <RowBetween marginTop="10px">
            <ButtonPrimary
              onClick={() => handleSetActionType('add')}
              padding="8px"
              borderRadius="8px"
              width="48%"
              inverse={actionType !== 'add'}
            >
              {t('addLiquidity')}
            </ButtonPrimary>
            <ButtonPrimary
              onClick={() => handleSetActionType('remove')}
              padding="8px"
              borderRadius="8px"
              width="48%"
              inverse={actionType !== 'remove'}
            >
              {t('removeLiquidity')}
            </ButtonPrimary>
          </RowBetween>
        ) : null}

        {actionType == 'add' && (
          <>
            <AddLiquidityConfirm
              token0={token}
              token1={rfpToken}
              isOpen={showConfirmAdd}
              onDismiss={() => {
                setShowConfirmAdd(false)
              }}
            />
            <AddLiquidityForm
              token0={token}
              token1={rfpToken}
              onConfirmAddLiquidity={() => {
                setShowConfirmAdd(true)
              }}
            />
          </>
        )}
        {actionType == 'remove' && (
          <>
            <RemoveLiquidityConfirm
              token0={token}
              token1={rfpToken}
              isOpen={showConfirmRemove}
              onDismiss={() => {
                setShowConfirmRemove(false)
              }}
            />
            <RemoveLiquidityForm
              token0={token}
              token1={rfpToken}
              onConfirmRemoveLiquidity={() => {
                setShowConfirmRemove(true)
              }}
            />
          </>
        )}
      </Container>
    </PoolCard>
  )
}
