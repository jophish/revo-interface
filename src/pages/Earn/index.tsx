import { ErrorBoundary } from '@sentry/react'
import { Token } from '@ubeswap/sdk'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOwnerStakedPools } from 'state/stake/useOwnerStakedPools'
import styled from 'styled-components'

import { AutoColumn, ColumnCenter } from '../../components/Column'
import { PoolCard } from '../../components/earn/PoolCard'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { TYPE } from '../../theme'
import { useFarmRegistry } from './useFarmRegistry'

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

function useTokenFilter(): [Token | null, (t: Token | null) => void] {
  const [token, setToken] = useState<Token | null>(null)
  return [token, setToken]
}

export default function Earn() {
  const { t } = useTranslation()
  const isSupportedNetwork = useIsSupportedNetwork()
  const [filteringToken, setFilteringToken] = useTokenFilter()
  const farmSummaries = useFarmRegistry()

  const filteredFarms = useMemo(() => {
    if (filteringToken === null) {
      return farmSummaries
    } else {
      return farmSummaries.filter(
        (farm) => farm?.token0Address === filteringToken?.address || farm?.token1Address === filteringToken?.address
      )
    }
  }, [filteringToken, farmSummaries])

  const { stakedFarms, unstakedFarms } = useOwnerStakedPools(filteredFarms)

  if (!isSupportedNetwork) {
    return <ChangeNetworkModal />
  }

  // TODO add info for new users

  return (
    <PageWrapper>
      {/* <TopSection gap="md">
        <AutoColumn>
          <TokenSelect onTokenSelect={setFilteringToken} token={filteringToken} />
        </AutoColumn>
      </TopSection> */}
      <ColumnCenter>
        {farmSummaries.length > 0 && filteredFarms.length == 0 && `No Farms for ${filteringToken?.symbol}`}
        {farmSummaries.length === 0 && <Loader size="48px" />}
      </ColumnCenter>
      {stakedFarms.length > 0 && (
        <>
          <Header>{t('yourPools')}</Header>
          {stakedFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.stakingAddress}>
              <ErrorBoundary>
                <PoolCard farmSummary={farmSummary} />
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
                  <TYPE.white fontSize={14}>{t('ZapInEduDesc')}</TYPE.white>
                </RowBetween>
              </AutoColumn>
            </CardSection>
            <CardNoise />
          </VoteCard>
          <Header>{t('availablePools')}</Header>
          {unstakedFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.stakingAddress}>
              <ErrorBoundary>
                <PoolCard farmSummary={farmSummary} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
    </PageWrapper>
  )
}
