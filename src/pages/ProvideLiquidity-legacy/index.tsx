import { ErrorBoundary } from '@sentry/react'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { AutoColumn, ColumnCenter } from '../../components/Column'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { ExternalLink, TYPE } from '../../theme'
import LiquidityCard from './LiquidityCard'
import { LiquiditySummary, useLiquidityRegistry } from './useLiquidityRegistry'

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
      <VoteCard>
        <CardNoise />
        <CardSection>
          <AutoColumn gap="md">
            <RowBetween>
              <TYPE.white fontWeight={600}>Please remove your liquidity</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>
                Thank you for adding liquidity with our legacy interface. We are providing continued access to this
                interface for a limited time. Please remove your liquidity and re-add it with our updated interface at
                your earliest convenience.
              </TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>
                {/* TODO: add more specific link once we have one */}
                <ExternalLink
                  style={{ color: 'white', textDecoration: 'underline' }}
                  target="_blank"
                  href="https://discord.gg/TBHYqgBnRj"
                >
                  <TYPE.white fontSize={14}>{'Ask on Discord if you have any questions'}</TYPE.white>
                </ExternalLink>
              </TYPE.white>
            </RowBetween>
          </AutoColumn>
        </CardSection>
        <CardNoise />
      </VoteCard>

      <ColumnCenter>{liquidityPools.length === 0 && <Loader size="48px" />}</ColumnCenter>

      {stakedPools.length > 0 && (
        <>
          <Header>{t('yourFarms')}</Header>
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
          <Header>{t('availableFarms')}</Header>
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
