import { ErrorBoundary } from '@sentry/react'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import { FarmBotSummary, useFarmBotRegistry } from 'pages/Compound/useFarmBotRegistry'
import { useFarmBotRewards } from 'pages/Compound/useFarmBotRewards'
import ZapCard from 'pages/Zap/ZapCard'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { AutoColumn, ColumnCenter } from '../../components/Column'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../theme'

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

export const farmBotAddresses = ['0xCB34fbfC3b9a73bc04D2eb43B62532c7918d9E81']

export default function Zap() {
  const { t } = useTranslation()
  const isSupportedNetwork = useIsSupportedNetwork()
  const [stakedFarms, setStakedFarms] = useState<FarmBotSummary[]>([])
  const [unstakedFarms, setUnstakedFarms] = useState<FarmBotSummary[]>([])

  const farmbotFarmSummaries = useFarmBotRegistry(farmBotAddresses)
  const farmbotFarmRewards = useFarmBotRewards(farmBotAddresses)

  useEffect(() => {
    const unstakedFarms = farmbotFarmSummaries
      .filter((botsummary) => botsummary.amountUserLP > 0)
      .map((farm) => {
        const matchingRewards = farmbotFarmRewards.find((reward) => reward.address === farm.address)
        return {
          ...farm,
          ...matchingRewards,
        }
      })

    const stakedFarms = farmbotFarmSummaries
      .filter((botsummary) => botsummary.amountUserLP <= 0)
      .map((farm) => {
        const matchingRewards = farmbotFarmRewards.find((reward) => reward.address === farm.address)
        return {
          ...farm,
          ...matchingRewards,
        }
      })

    setStakedFarms(unstakedFarms)
    setUnstakedFarms(stakedFarms)
  }, [farmbotFarmSummaries, farmbotFarmRewards])

  if (!isSupportedNetwork) {
    return <ChangeNetworkModal />
  }

  return (
    <PageWrapper>
      <ColumnCenter>{farmbotFarmSummaries.length === 0 && <Loader size="48px" />}</ColumnCenter>
      {stakedFarms.length > 0 && (
        <>
          <Header>{t('yourPools')}</Header>
          {stakedFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.address}>
              <ErrorBoundary>
                <ZapCard farmBotSummary={farmSummary} />
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
                  <TYPE.white fontWeight={600}>{t('zapInEdu')}</TYPE.white>
                </RowBetween>
                <RowBetween>
                  <TYPE.white fontSize={14}>
                    {t('zapInEduDesc')}
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
                <ZapCard farmBotSummary={farmSummary} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
    </PageWrapper>
  )
}
