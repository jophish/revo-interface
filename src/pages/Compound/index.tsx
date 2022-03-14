import { ErrorBoundary } from '@sentry/react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { AutoColumn } from '../../components/Column'
import { CompoundCard } from '../../components/compound/CompoundCard'
import { Break, CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../theme'
import { useFarmBotRegistry } from './useCompoundRegistry'

const PageWrapper = styled.div`
  width: 100%;
  max-width: 640px;
`

const CompoundWrapper = styled.div`
  margin-bottom: 20px;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

const VoteCard = styled(DataCard)`
  background-color: #8d7c86;
  overflow: hidden;
`

const Header: React.FC = ({ children }) => {
  return (
    <DataRow style={{ alignItems: 'baseline', marginBottom: '12px' }}>
      <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>{children}</TYPE.mediumHeader>
    </DataRow>
  )
}

export default function Compound() {
  const botSummaries = useFarmBotRegistry()

  const { t } = useTranslation()

  if (!botSummaries.length) {
    return <div>no bots</div>
  }

  const botSummariesStakedIn = botSummaries.filter((botsummary) => {
    return botsummary.amountUserLP > 0
  })
  const otherBotSummaries = botSummaries.filter((botsummary) => {
    return botsummary.amountUserLP <= 0
  })
  return (
    <PageWrapper>
      {botSummaries.length > 0 && (
        <>
          <VoteCard>
            <CardNoise />
            <CardSection>
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>{t('compoundInterestTitle')}</TYPE.white>
                </RowBetween>
                <RowBetween>
                  <TYPE.white fontSize={14}>{t('compoundInterestDesc')}</TYPE.white>
                </RowBetween>
              </AutoColumn>
            </CardSection>
            <CardNoise />
          </VoteCard>
          {botSummariesStakedIn.length > 0 && (
            <>
              <Header>Your Pools</Header>
              {botSummariesStakedIn.map((botSummary) => (
                <CompoundWrapper key={botSummary.address}>
                  <ErrorBoundary>
                    <CompoundCard farmBotSummary={botSummary} />
                  </ErrorBoundary>
                  <Break />
                </CompoundWrapper>
              ))}
            </>
          )}
          {otherBotSummaries.length > 0 && (
            <>
              <Header>Other Pools</Header>
              {otherBotSummaries.map((botSummary) => (
                <CompoundWrapper key={botSummary.address}>
                  <ErrorBoundary>
                    <CompoundCard farmBotSummary={botSummary} />
                  </ErrorBoundary>
                  <Break />
                </CompoundWrapper>
              ))}
            </>
          )}
        </>
      )}
    </PageWrapper>
  )
}
