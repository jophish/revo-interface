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

import { useCalcAPY, useCalculateMetaFarmAPY } from '../../utils/calcAPY'
import { FarmBotRewards } from '../Compound/useFarmBotRewards'
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

export interface MetaFarmInfo {
  underlyingFarmBotInfo: FarmBotSummary & FarmBotRewards
}

interface Props {
  farmBotSummary: FarmBotSummary & MetaFarmInfo
}

export default function LiquidityCard({ farmBotSummary: metaFarmBotSummary }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showConfirmAdd, setShowConfirmAdd] = useState<boolean>(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState<boolean>(false)
  const [actionType, setActionType] = useState<ACTION_TYPE>('add')

  const farmTokenInfo: (FarmBotSummary & FarmBotRewards) | undefined = metaFarmBotSummary.underlyingFarmBotInfo

  const farmTokenAddress = metaFarmBotSummary.underlyingFarmBotInfo?.address
  const normalTokenAddress =
    farmTokenAddress === metaFarmBotSummary.token0Address
      ? metaFarmBotSummary.token1Address
      : metaFarmBotSummary.token0Address

  const farmToken0 = useToken(farmTokenInfo?.token0Address)
  const farmToken1 = useToken(farmTokenInfo?.token1Address)

  const { userValueCUSD: tvlCUSD } = useLPValue(metaFarmBotSummary.totalLP ?? 0, {
    token0Address: metaFarmBotSummary.token0Address,
    token1Address: metaFarmBotSummary.token1Address,
    lpAddress: metaFarmBotSummary.stakingTokenAddress,
  })

  const { userValueCUSD } = useLPValue(metaFarmBotSummary.amountUserLP ?? 0, {
    token0Address: metaFarmBotSummary.token0Address,
    token1Address: metaFarmBotSummary.token1Address,
    lpAddress: metaFarmBotSummary.stakingTokenAddress,
  })

  const normalToken = useToken(normalTokenAddress)
  const farmToken = useToken(farmTokenAddress)
  const rfpToken = useToken(metaFarmBotSummary.address)
  const isStaking = metaFarmBotSummary.amountUserFP > 0

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
  const underlyingFarmApy = useCalcAPY(farmTokenInfo)
  const apy = useCalculateMetaFarmAPY(metaFarmBotSummary, underlyingFarmApy, normalTokenAddress)

  if (!normalToken || !farmToken || !rfpToken || !farmToken0 || !farmToken1) {
    return <Loader centered size="24px" />
  }

  return (
    <PoolCard
      token0={normalToken}
      token1={farmToken}
      poolTitle={t('liquidityCardTitle', {
        normalToken: normalToken.symbol,
        farmToken: farmToken.symbol,
        farmToken0: farmToken0.symbol,
        farmToken1: farmToken1.symbol,
      })}
      APY={apy ? `${apy.toFixed(2)}%` : '-'}
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
              token0={normalToken}
              token1={farmToken}
              isOpen={showConfirmAdd}
              onDismiss={() => {
                setShowConfirmAdd(false)
              }}
            />
            <AddLiquidityForm
              token0={normalToken}
              token1={farmToken}
              onConfirmAddLiquidity={() => {
                setShowConfirmAdd(true)
              }}
            />
          </>
        )}
        {actionType == 'remove' && (
          <>
            <RemoveLiquidityConfirm
              token0={normalToken}
              token1={farmToken}
              isOpen={showConfirmRemove}
              onDismiss={() => {
                setShowConfirmRemove(false)
              }}
              userTotalRFPBalance={metaFarmBotSummary.amountUserFP}
            />
            <RemoveLiquidityForm
              token0={normalToken}
              token1={farmToken}
              rfpToken={rfpToken}
              onConfirmRemoveLiquidity={() => {
                setShowConfirmRemove(true)
              }}
              userTotalRFPBalance={metaFarmBotSummary.amountUserFP}
            />
          </>
        )}
      </Container>
    </PoolCard>
  )
}
