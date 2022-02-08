import { gql, useQuery } from '@apollo/client'
import { useContractKit } from '@celo-tools/use-contractkit'
import { Percent, Token } from '@ubeswap/sdk'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import QuestionHelper from 'components/QuestionHelper'
import { useToken } from 'hooks/Tokens'
import { useStakingContract } from 'hooks/useContract'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { useSingleCallResult } from 'state/multicall/hooks'
import { updateUserAprMode } from 'state/user/actions'
import { useIsAprMode } from 'state/user/hooks'
import styled, { ThemeContext } from 'styled-components'
import { fromWei, toBN, toWei } from 'web3-utils'
import { borderRadius, TYPE } from '../../theme'
import { ButtonPrimary, ButtonLight } from '../Button'
import { AutoColumn } from '../Column'
import DoubleCurrencyLogo from '../DoubleLogo'
import { RowBetween, RowFixed } from '../Row'
import PoolStatRow from './PoolStats/PoolStatRow'
import { Break } from './styled'

const StatContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  display: none;
`};
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean }>`
  border-radius: ${borderRadius}px;
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 1rem;
  background: ${({ theme }) => theme.bg1};
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 120px;
  grid-gap: 0px;
  align-items: center;
  padding-bottom: 1rem;
  z-index: 1;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 48px 1fr 96px;
  `};
`

const BottomSection = styled.div<{ showBackground: boolean }>`
  padding: 12px 16px;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '0.4')};
  border-radius: 0 0 ${borderRadius}px ${borderRadius}px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  z-index: 1;
`

const PoolDetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.primary3};
`

interface Props {
  farmSummary: FarmSummary
}

const pairDataGql = gql`
  query getPairHourData($id: String!) {
    pair(id: $id) {
      pairHourData(first: 24, orderBy: hourStartUnix, orderDirection: desc) {
        hourStartUnix
        hourlyVolumeUSD
      }
    }
  }
`
const COMPOUNDS_PER_YEAR = 2

export const PoolCard: React.FC<Props> = ({ farmSummary }: Props) => {
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)
  const { address } = useContractKit()
  const userAprMode = useIsAprMode()
  const dispatch = useDispatch()
  const token0 = useToken(farmSummary.token0Address) || undefined
  const token1 = useToken(farmSummary.token1Address) || undefined
  const { data, loading, error } = useQuery(pairDataGql, {
    variables: { id: farmSummary.lpAddress.toLowerCase() },
  })

  const [expanded, setExpanded] = useState(false)
  const [zapInAmount, setZapInAmount] = useState('')
  const [zapInCurrency, setZapInCurrency] = useState<Token | undefined>()

  const stakingContract = useStakingContract(farmSummary.stakingAddress)
  const stakedAmount = useSingleCallResult(stakingContract, 'balanceOf', [address || undefined]).result?.[0]
  const isStaking = Boolean(stakedAmount && stakedAmount.gt('0'))

  const { userValueCUSD, userAmountTokenA, userAmountTokenB } = useLPValue(stakedAmount ?? 0, farmSummary)
  let swapRewardsUSDPerYear = 0
  if (!loading && !error && data) {
    const lastDayVolumeUsd = data.pair.pairHourData.reduce(
      (acc: number, curr: { hourlyVolumeUSD: string }) => acc + Number(curr.hourlyVolumeUSD),
      0
    )
    swapRewardsUSDPerYear = Math.floor(lastDayVolumeUsd * 365 * 0.0025)
  }
  const rewardApr = new Percent(farmSummary.rewardsUSDPerYear, farmSummary.tvlUSD)
  const swapApr = new Percent(toWei(swapRewardsUSDPerYear.toString()), farmSummary.tvlUSD)
  const apr = new Percent(
    toBN(toWei(swapRewardsUSDPerYear.toString())).add(toBN(farmSummary.rewardsUSDPerYear)).toString(),
    farmSummary.tvlUSD
  )

  let compoundedAPY: React.ReactNode | undefined = <>🤯</>
  try {
    compoundedAPY = annualizedPercentageYield(apr, COMPOUNDS_PER_YEAR)
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    console.error('apy calc overflow', farmSummary.farmName, e)
  }

  const handleToggleExpanded = () => {
    setExpanded((prev) => !prev)
  }

  const handleZapIn = () => {
    // do something
  }

  const displayedPercentageReturn =
    apr.denominator.toString() !== '0'
      ? `${userAprMode ? apr.toFixed(0, { groupSeparator: ',' }) : compoundedAPY}%`
      : '-'

  return (
    <Wrapper showBackground>
      <TopSection>
        <DoubleCurrencyLogo currency0={token0} currency1={token1} size={24} />
        <PoolInfo style={{ marginLeft: '8px' }}>
          <TYPE.black fontWeight={600} fontSize={[18, 24]}>
            {token0?.symbol}-{token1?.symbol}
          </TYPE.black>
          {apr && apr.greaterThan('0') && (
            <span
              aria-label="Toggle APR/APY"
              onClick={() => dispatch(updateUserAprMode({ userAprMode: !userAprMode }))}
            >
              <TYPE.black>
                <TYPE.small className="apr" fontWeight={400} fontSize={14}>
                  {displayedPercentageReturn} {userAprMode ? 'APR' : 'APY'}
                </TYPE.small>
              </TYPE.black>
            </span>
          )}
        </PoolInfo>

        <ButtonPrimary onClick={handleToggleExpanded} padding="8px">
          {isStaking ? t('manage') : t('zap')}
        </ButtonPrimary>
      </TopSection>

      <StatContainer>
        <PoolStatRow
          statName={t('totalDeposited')}
          statValue={Number(fromWei(farmSummary.tvlUSD)).toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          })}
        />
        {apr && apr.greaterThan('0') && (
          <div aria-label="Toggle APR/APY" onClick={() => dispatch(updateUserAprMode({ userAprMode: !userAprMode }))}>
            <PoolStatRow
              helperText={
                farmSummary.tvlUSD === '0' ? (
                  'Pool is empty'
                ) : (
                  <>
                    Reward APR: {rewardApr?.greaterThan('0') && rewardApr?.toSignificant(4)}%<br />
                    Swap APR: {swapApr?.greaterThan('0') && swapApr?.toSignificant(4)}%<br />
                    <small>APY assumes compounding {COMPOUNDS_PER_YEAR}/year</small>
                    <br />
                  </>
                )
              }
              statName={`${userAprMode ? 'APR' : 'APY'}`}
              statValue={displayedPercentageReturn}
            />
          </div>
        )}
      </StatContainer>

      {isStaking && (
        <>
          <Break />
          <BottomSection showBackground={true}>
            {userValueCUSD && (
              <RowBetween>
                <TYPE.black fontWeight={500}>
                  <span>Your stake</span>
                </TYPE.black>

                <RowFixed>
                  <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
                    ${userValueCUSD.toFixed(0, { groupSeparator: ',' })}
                  </TYPE.black>
                  <QuestionHelper
                    text={`${userAmountTokenA?.toFixed(0, { groupSeparator: ',' })} ${
                      userAmountTokenA?.token.symbol
                    }, ${userAmountTokenB?.toFixed(0, { groupSeparator: ',' })} ${userAmountTokenB?.token.symbol}`}
                  />
                </RowFixed>
              </RowBetween>
            )}
          </BottomSection>
        </>
      )}

      {expanded && (
        <PoolDetailsContainer>
          <CurrencyInputPanel
            value={zapInAmount}
            onUserInput={setZapInAmount}
            label={t('zapInAmount')}
            showMaxButton={false}
            currency={zapInCurrency}
            onCurrencySelect={setZapInCurrency}
            otherCurrency={null}
            id="zap-in-currency-input"
          />
          <RowBetween>
            <RowFixed>
              <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
                {t('fees')}
              </TYPE.black>
              <QuestionHelper text={t('feesInfo')} />
            </RowFixed>
            <TYPE.black fontSize={14} color={theme.text1}>
              {'TODO: calculate fee'}
            </TYPE.black>
          </RowBetween>
          <ButtonLight onClick={handleZapIn} padding="8px">
            {t('approve')}
          </ButtonLight>
        </PoolDetailsContainer>
      )}
    </Wrapper>
  )
}

// formula is 1 + ((nom/compoundsPerYear)^compoundsPerYear) - 1
function annualizedPercentageYield(nominal: Percent, compounds: number) {
  const ONE = 1

  const divideNominalByNAddOne = Number(nominal.divide(BigInt(compounds)).add(BigInt(ONE)).toFixed(10))

  // multiply 100 to turn decimal into percent, to fixed since we only display integer
  return ((divideNominalByNAddOne ** compounds - ONE) * 100).toFixed(0)
}

const PoolInfo = styled.div`
  .apr {
    margin-top: 4px;
    display: none;
    ${({ theme }) => theme.mediaWidth.upToSmall`
  display: block;
  `}
  }
`
