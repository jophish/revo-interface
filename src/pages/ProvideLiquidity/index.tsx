import { useContractKit } from '@celo-tools/use-contractkit'
import { ErrorBoundary } from '@sentry/react'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import ChangeNetworkModal from 'components/ChangeNetworkModal'
import Loader from 'components/Loader'
import { useIsSupportedNetwork } from 'hooks/useIsSupportedNetwork'
import { FarmBotSummary, useFarmBotRegistry } from 'pages/Compound/useFarmBotRegistry'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { AbiItem } from 'web3-utils'

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

export const brokerBotAddress = '0x97d0D4ae7841c9405A80fB8004dbA96123e076De'
// key is token0Address-token1Address
export const metaFarmbotAddressMap = {
  '0x918146359264C492BD6934071c6Bd31C854EDBc3-0xCB34fbfC3b9a73bc04D2eb43B62532c7918d9E81':
    '0xAcA7148642d2C634b318ff36d14764f8Bde4dc95',
}

function useShowLegacyAddLiquidity() {
  const { kit, address: walletAddress } = useContractKit()
  const [showLegacyAddLiquidity, setShowLegacyAddLiquidity] = useState<boolean>(false)
  const call = async () => {
    const liquidityPoolAddress = '0x25938830FBd7619bf6CFcFDf5C37A22AB15A93cA' // mcUSD / mcUSD_mcEUR_RFP pool
    const uniswapV2Pair = new kit.web3.eth.Contract(IUniswapV2Pair as AbiItem[], liquidityPoolAddress)
    const lpBalance = walletAddress ? await uniswapV2Pair.methods.balanceOf(walletAddress).call() : 0
    setShowLegacyAddLiquidity(lpBalance > 0)
  }
  useEffect(() => {
    call()
  }, [call])
  return showLegacyAddLiquidity
}

export default function ProvideLiquidity() {
  const { t } = useTranslation()
  const isSupportedNetwork = useIsSupportedNetwork()
  const [stakedMetaFarms, setStakedMetaFarms] = useState<FarmBotSummary[]>([])
  const [unstakedMetaFarms, setUnstakedMetaFarms] = useState<FarmBotSummary[]>([])
  const metaFarmbotFarmSummaries = useFarmBotRegistry(Object.values(metaFarmbotAddressMap))
  const showLegacyAddLiquidity = useShowLegacyAddLiquidity()

  useEffect(() => {
    const unstakedFarms = metaFarmbotFarmSummaries.filter((botsummary) => botsummary.amountUserLP > 0)
    const stakedFarms = metaFarmbotFarmSummaries.filter((botsummary) => botsummary.amountUserLP <= 0)

    setStakedMetaFarms(unstakedFarms)
    setUnstakedMetaFarms(stakedFarms)
  }, [metaFarmbotFarmSummaries])

  if (!isSupportedNetwork) {
    return <ChangeNetworkModal />
  }

  const cardParams: { title: string; body: string; cta: string; url: string } = showLegacyAddLiquidity
    ? {
        title: t('legacyLiquidityProviderCardTitle'),
        body: t('legacyLiquidityProviderCardBody'),
        cta: t('legacyLiquidityProviderCardCTA'),
        url: 'https://revo.market/#/remove-liquidity-legacy',
      }
    : {
        title: t('liquidityProviderRewards'),
        body: `Zap-in's to Revo farms are supported by liquidity pools. By providing liquidity, you will be
                supporting the ecosystem and enabling other users to zap in. Most importantly, you will be earning
                auto-compounding yield farming rewards <b>on top</b> of the rewards from the underlying farm!`,
        cta: t('liquidityProviderRewardsReadMore'),
        url: 'https://docs.revo.market/',
      }

  return (
    <PageWrapper>
      <VoteCard>
        <CardNoise />
        <CardSection>
          <AutoColumn gap="md">
            <RowBetween>
              <TYPE.white fontWeight={600}>{cardParams.title}</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>{cardParams.body}</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>
                {/* TODO: add more specific link once we have one */}
                <ExternalLink
                  style={{ color: 'white', textDecoration: 'underline' }}
                  target="_blank"
                  href={cardParams.url}
                >
                  <TYPE.white fontSize={14}>{cardParams.cta}</TYPE.white>
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
