import { ErrorBoundary } from '@sentry/react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { AutoColumn } from '../../components/Column'
import { CompoundCard } from '../../components/compound/CompoundCard'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../theme'
import { useCompoundRegistry } from './useCompoundRegistry'

const PageWrapper = styled.div`
  width: 100%;
  max-width: 640px;
`

const CompoundWrapper = styled.div`
  margin-bottom: 12px;
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
  const botSummaries = useCompoundRegistry()
  const { t } = useTranslation()

  if (!botSummaries.length) {
    return <div>no bots</div>
  }
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
          <Header>Your Pools</Header>
          {botSummaries.map((botSummary) => (
            <CompoundWrapper key={botSummary.address}>
              <ErrorBoundary>
                <CompoundCard compoundBotSummary={botSummary} />
              </ErrorBoundary>
            </CompoundWrapper>
          ))}
        </>
      )}
    </PageWrapper>
  )
}
