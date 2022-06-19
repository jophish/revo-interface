import { ButtonPrimary } from 'components/Button'
import Loader from 'components/Loader'
import { RowBetween, RowFixed } from 'components/Row'
import { useToken } from 'hooks/Tokens'
import { FarmBotSummary } from 'pages/Compound/useFarmBotRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import { PoolCard } from 'pages/Zap/PoolCard'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { TYPE } from 'theme'

import { useCalculateMetaFarmAPY } from '../../utils/calcAPY'
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

interface Props {
  farmBotSummary: FarmBotSummary
}

export default function LiquidityCard({ farmBotSummary }: Props) {
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

  const { userValueCUSD } = useLPValue(farmBotSummary.amountUserLP ?? 0, {
    token0Address: farmBotSummary.token0Address,
    token1Address: farmBotSummary.token1Address,
    lpAddress: farmBotSummary.stakingTokenAddress,
  })

  const token0 = useToken(farmBotSummary.token0Address)
  const token1 = useToken(farmBotSummary.token1Address)
  const rfpToken = useToken(farmBotSummary.address)
  const isStaking = farmBotSummary.amountUserFP > 0

  const PoolDetails = (
    <>
      {userValueCUSD ? (
        <RowBetween padding="8px 0">
          <TYPE.black fontWeight={500}>{t('yourStake')}</TYPE.black>
          <RowFixed>
            <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
              {`$${userValueCUSD.toFixed(2, { groupSeparator: ',' })}`}
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

  const apy = useCalculateMetaFarmAPY(farmBotSummary, undefined) // todo provide underlying farm APY as a param

  if (!token0 || !token1 || !rfpToken) {
    return <Loader centered size="24px" />
  }

  return (
    <PoolCard
      token0={token0}
      token1={token1}
      poolTitle={t('liquidityCardTitle', { token0: farmBotSummary.token0Name, token1: farmBotSummary.token1Name })}
      APY={apy}
      APYInfo={t('APYInfo')}
      buttonLabel={isStaking ? t('manage') : t('addLiquidity')}
      buttonOnPress={handleAddLiquidity}
      buttonActive={expanded}
      tvlCUSD={tvlCUSD}
      tvlCUSDInfo={t('farmBotTVLInfo')}
      PoolDetails={PoolDetails}
    >
      <Container $expanded={expanded}>
        {isStaking ? (
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
              token0={token0}
              token1={token1}
              isOpen={showConfirmAdd}
              onDismiss={() => {
                setShowConfirmAdd(false)
              }}
            />
            <AddLiquidityForm
              token0={token0}
              token1={token1}
              onConfirmAddLiquidity={() => {
                setShowConfirmAdd(true)
              }}
            />
          </>
        )}
        {actionType == 'remove' && (
          <>
            <RemoveLiquidityConfirm
              token0={token0}
              token1={token1}
              isOpen={showConfirmRemove}
              onDismiss={() => {
                setShowConfirmRemove(false)
              }}
              userTotalRFPBalance={farmBotSummary.amountUserFP}
            />
            <RemoveLiquidityForm
              token0={token0}
              token1={token1}
              rfpToken={rfpToken}
              onConfirmRemoveLiquidity={() => {
                setShowConfirmRemove(true)
              }}
              userTotalRFPBalance={farmBotSummary.amountUserFP}
            />
          </>
        )}
      </Container>
    </PoolCard>
  )
}
