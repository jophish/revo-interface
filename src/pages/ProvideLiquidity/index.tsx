import { ErrorBoundary } from '@sentry/react'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import useTheme from 'hooks/useTheme'
import { LiquiditySummary, useLiquidityRegistry } from 'pages/Compound/useLiquidityRegistry'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { AutoColumn, ColumnCenter } from '../../components/Column'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { ExternalLink, TYPE } from '../../theme'
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

  const theme = useTheme()
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

      <VoteCard>
        <CardNoise />
        <CardSection>
          <AutoColumn gap="md">
            <RowBetween>
              <TYPE.white fontWeight={600}>{t('liquidityProviderRewards')}</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>
                Add liquidity for our farmbots to support our ecosystem and earn liquidity provider fees!
              </TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>{t('liquidityProviderRewardsDesc')}</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>
                {/* TODO: add more specific link once we have one */}
                <ExternalLink
                  style={{ color: 'white', textDecoration: 'underline' }}
                  target="_blank"
                  href="https://docs.revo.market/"
                >
                  <TYPE.white fontSize={14}>{t('liquidityProviderRewardsReadMore')}</TYPE.white>
                </ExternalLink>
              </TYPE.white>
            </RowBetween>
          </AutoColumn>
        </CardSection>
        <CardNoise />
      </VoteCard>

      {stakedPools.length > 0 && (
        <>
          <Header>{t('yourPools')}</Header>
          {stakedPools.map((pool) => (
            <PoolWrapper key={`${pool.tokenAddress}${pool.rfpTokenAddress}`}>
              <ErrorBoundary>
                <LiquidityCard {...pool} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
      {unstakedPools.length > 0 && (
        <>
          <Header>{t('availablePools')}</Header>
          {unstakedPools.map((pool) => (
            <PoolWrapper key={`${pool.tokenAddress}${pool.rfpTokenAddress}`}>
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
