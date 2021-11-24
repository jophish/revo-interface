import React from 'react'
import { CompoundBotSummary } from 'pages/Compound/useCompoundRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import { AutoColumn } from '../Column'
import styled, { useTheme } from 'styled-components'
import { Break, CardNoise } from '../earn/styled'
import DoubleCurrencyLogo from '../DoubleLogo'
import { useToken } from 'hooks/Tokens'
import { StyledInternalLink, TYPE } from '../../theme'
import PoolStatRow from '../earn/PoolStats/PoolStatRow'

interface Props {
  compoundBotSummary: CompoundBotSummary
}

const StatContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1rem;
  margin-right: 1rem;
  margin-left: 1rem;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  display: none;
`};
`

const PoolInfo = styled.div`
  .apr {
    margin-top: 4px;
    display: none;
    ${({ theme }) => theme.mediaWidth.upToSmall`
  display: block;
  `}
  }
`

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 120px;
  grid-gap: 0px;
  align-items: center;
  padding: 1rem;
  z-index: 1;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 48px 1fr 96px;
  `};
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  border-radius: 12px;
  width: 100%;
  overflow: hidden;
  position: relative;
  background: ${({ bgColor }) => `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%, #212429 100%) `};
  color: ${({ theme, showBackground }) => (showBackground ? theme.white : theme.text1)} !important;
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

export const CompoundCard: React.FC<Props> = ({ compoundBotSummary }: Props) => {
  console.log('AAAAAAAAAAAA')
  const theme = useTheme()
  const farmSummary = {
      token0Address: compoundBotSummary.token0Address,
      token1Address: compoundBotSummary.token1Address,
      lpAddress: compoundBotSummary.stakingTokenAddress
    }

  const { userValueCUSD } = useLPValue(
    compoundBotSummary.amountUserLP,
    farmSummary
  )

  const isStaking = compoundBotSummary.amountUserLP > 0
  const token0 = useToken(compoundBotSummary.token0Address) || undefined
  const token1 = useToken(compoundBotSummary.token1Address) || undefined
  console.log(token0)
  return (
    <Wrapper showBackground={isStaking} bgColor={theme.primary1}>
      <CardNoise />

            <TopSection>
        <DoubleCurrencyLogo currency0={token0} currency1={token1} size={24} />
        <PoolInfo style={{ marginLeft: '8px' }}>
          <TYPE.white fontWeight={600} fontSize={[18, 24]}>
            {token0?.symbol}-{token1?.symbol} [Ubeswap]
          </TYPE.white>
        </PoolInfo>
      </TopSection>

      <StatContainer>
      <PoolStatRow
    statName={'Total staked (underlying farm)'}
    statValue={'$100'}
      />
      <PoolStatRow
    statName={'Total staked (with farmbot)'}
    statValue={'$40'}
      />
      <PoolStatRow
    statName={'Farmbot APY'}
    statValue={'25%'}
      />
      </StatContainer>
      </Wrapper>
  )

}
