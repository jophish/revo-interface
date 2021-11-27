import { ErrorBoundary } from '@sentry/react'
import React from 'react'
import styled from 'styled-components'

import { CompoundCard } from '../../components/compound/CompoundCard'
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

const Header: React.FC = ({ children }) => {
  return (
    <DataRow style={{ alignItems: 'baseline', marginBottom: '12px' }}>
      <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>{children}</TYPE.mediumHeader>
    </DataRow>
  )
}

export default function Compound() {
  const botSummaries = useCompoundRegistry()

  if (!botSummaries.length) {
    return <div>no bots</div>
  }
  return (
    <PageWrapper>
      {botSummaries.length > 0 && (
        <>
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
