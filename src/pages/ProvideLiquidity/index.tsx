import { ErrorBoundary } from '@sentry/react'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import { FarmBotSummary, useFarmBotRegistry } from 'pages/Compound/useFarmBotRegistry'
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

export const metaFarmBotAddresses = ['0xAcA7148642d2C634b318ff36d14764f8Bde4dc95']

export default function ProvideLiquidity() {
  const { t } = useTranslation()
  const isSupportedNetwork = useIsSupportedNetwork()
  const [stakedMetaFarms, setStakedMetaFarms] = useState<FarmBotSummary[]>([])
  const [unstakedMetaFarms, setUnstakedMetaFarms] = useState<FarmBotSummary[]>([])

  const metaFarmbotFarmSummaries = useFarmBotRegistry(metaFarmBotAddresses)

  useEffect(() => {
    const unstakedFarms = metaFarmbotFarmSummaries.filter((botsummary) => botsummary.amountUserLP > 0)
    const stakedFarms = metaFarmbotFarmSummaries.filter((botsummary) => botsummary.amountUserLP <= 0)

    setStakedMetaFarms(unstakedFarms)
    setUnstakedMetaFarms(stakedFarms)
  }, [metaFarmbotFarmSummaries])

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
              <TYPE.white fontWeight={600}>{t('liquidityProviderRewards')}</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>
                Revo automatically stakes the liquidity that you provide, so that you can earn auto compounding rewards
                for your liquidity while also earning the usual liquidity provider rewards from trade fees!
              </TYPE.white>
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

      <ColumnCenter>{metaFarmbotFarmSummaries.length === 0 && <Loader size="48px" />}</ColumnCenter>

      {stakedMetaFarms.length > 0 && (
        <>
          <Header>{t('yourFarms')}</Header>
          {stakedMetaFarms.map((stakedMetaFarm) => (
            <PoolWrapper key={stakedMetaFarm.address}>
              <ErrorBoundary>
                <LiquidityCard farmBotSummary={stakedMetaFarm} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
      {unstakedMetaFarms.length > 0 && (
        <>
          <Header>{t('availableFarms')}</Header>
          {unstakedMetaFarms.map((unstakedMetaFarm) => (
            <PoolWrapper key={unstakedMetaFarm.address}>
              <ErrorBoundary>
                <LiquidityCard farmBotSummary={unstakedMetaFarm} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
    </PageWrapper>
  )
}
