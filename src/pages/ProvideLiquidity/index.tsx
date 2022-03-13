import { ErrorBoundary } from '@sentry/react'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import { LiquiditySummary, useLiquidityRegistry } from 'pages/Compound/useLiquidityRegistry'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { AutoColumn, ColumnCenter } from '../../components/Column'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../theme'
import LiquidityCard from './LiquidityCard'

const VoteCard = styled(DataCard)`
  overflow: hidden;
  margin-bottom: 16px;
`

const PageWrapper = styled.div`
  width: 100%;
  max-width: 640px;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

const PoolWrapper = styled.div`
  margin-bottom: 12px;
`

const Header: React.FC = ({ children }) => {
  return (
    <DataRow style={{ alignItems: 'baseline', marginBottom: '12px' }}>
      <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>{children}</TYPE.mediumHeader>
    </DataRow>
  )
}

export default function ProvideLiquidity() {
  const { t } = useTranslation()
  const isSupportedNetwork = useIsSupportedNetwork()
  const [stakedPools, setStakedPools] = useState<LiquiditySummary[]>([])
  const [unstakedPools, setUnstakedPools] = useState<LiquiditySummary[]>([])

  const liquidityPools = useLiquidityRegistry()

  useEffect(() => {
    setStakedPools(
      liquidityPools.filter((pool) => {
        return pool.userBalance > 0
      })
    )
    setUnstakedPools(
      liquidityPools.filter((pool) => {
        return pool.userBalance <= 0
      })
    )
  }, [liquidityPools])

  if (!isSupportedNetwork) {
    return <ChangeNetworkModal />
  }

  return (
    <PageWrapper>
      <ColumnCenter>{liquidityPools.length === 0 && <Loader size="48px" />}</ColumnCenter>
      {stakedPools.length > 0 && (
        <>
          <Header>{t('yourPools')}</Header>
          {stakedPools.map((pool) => (
            <PoolWrapper key={`${pool.token0}${pool.token1}`}>
              <ErrorBoundary>
                <LiquidityCard {...pool} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
      {unstakedPools.length > 0 && (
        <>
          <VoteCard>
            <CardNoise />
            <CardSection>
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>{t('zapInEdu')}</TYPE.white>
                </RowBetween>
                <RowBetween>
                  <TYPE.white fontSize={14}>
                    Some information about what this page does
                    <a href="https://docs.revo.market/">{t('here')}</a>
                  </TYPE.white>
                </RowBetween>
              </AutoColumn>
            </CardSection>
            <CardNoise />
          </VoteCard>
          <Header>{t('availablePools')}</Header>
          {unstakedPools.map((pool) => (
            <PoolWrapper key={`${pool.token0}${pool.token1}`}>
              <ErrorBoundary>
                <LiquidityCard {...pool} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
    </PageWrapper>
  )
}
