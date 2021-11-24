import { ErrorBoundary } from '@sentry/react'
import styled from 'styled-components'
import { useCompoundRegistry } from './useCompoundRegistry'
import { CompoundCard } from '../../components/compound/CompoundCard'
import { ExternalLink, TYPE } from '../../theme'
import { RowBetween } from '../../components/Row'

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
  console.log(botSummaries)
  if (!botSummaries.length) {
    return (
      <div>
	no bots
      </div>)
  }
  return (
    <PageWrapper>
      bots!
    {botSummaries.length > 0 && (
      <>
          <Header>yourPools</Header>
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
