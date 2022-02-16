import { ErrorBoundary } from '@sentry/react'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import { CompoundBotSummary, useCompoundRegistry } from 'pages/Compound/useCompoundRegistry'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { AutoColumn, ColumnCenter } from '../../components/Column'
import { PoolCard } from '../../components/earn/PoolCard'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../theme'

const VoteCard = styled(DataCard)`
  overflow: hidden;
`

const PageWrapper = styled.div`
  width: 100%;
  max-width: 640px;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
  margin-bottom: 24px;
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

export default function Earn() {
  const { t } = useTranslation()
  const isSupportedNetwork = useIsSupportedNetwork()
  const [stakedFarms, setStakedFarms] = useState<CompoundBotSummary[]>([])
  const [unstakedFarms, setUnstakedFarms] = useState<CompoundBotSummary[]>([])

  const farmbotFarmSummaries = useCompoundRegistry()

  useEffect(() => {
    setStakedFarms(
      farmbotFarmSummaries.filter((botsummary) => {
        return botsummary.amountUserLP > 0
      })
    )
    setUnstakedFarms(
      farmbotFarmSummaries.filter((botsummary) => {
        return botsummary.amountUserLP <= 0
      })
    )
  }, [farmbotFarmSummaries])

  console.log(stakedFarms)
  if (!isSupportedNetwork) {
    return <ChangeNetworkModal />
  }

  // TODO add info for new users

  return (
    <PageWrapper>
      <ColumnCenter>{farmbotFarmSummaries.length === 0 && <Loader size="48px" />}</ColumnCenter>
      {stakedFarms.length > 0 && (
        <>
          <Header>{t('yourPools')}</Header>
          {stakedFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.address}>
              <ErrorBoundary>
                <PoolCard compoundBotSummary={farmSummary} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
      {unstakedFarms.length > 0 && (
        <>
          <VoteCard>
            <CardNoise />
            <CardSection>
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>{t('ZapInEdu')}</TYPE.white>
                </RowBetween>
                <RowBetween>
                  <TYPE.white fontSize={14}>
                    {t('ZapInEduDesc')}
                    <a href="https://docs.revo.market/">{t('here')}</a>
                  </TYPE.white>
                </RowBetween>
              </AutoColumn>
            </CardSection>
            <CardNoise />
          </VoteCard>
          <Header>{t('availablePools')}</Header>
          {unstakedFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.address}>
              <ErrorBoundary>
                <PoolCard compoundBotSummary={farmSummary} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
    </PageWrapper>
  )
}
