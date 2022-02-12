import { gql } from '@apollo/client'
import { Percent, Token, Trade } from '@ubeswap/sdk'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import Loader from 'components/Loader'
import QuestionHelper from 'components/QuestionHelper'
import confirmPriceImpactWithoutFee from 'components/swap/confirmPriceImpactWithoutFee'
import { useTradeCallback } from 'components/swap/routing/useTradeCallback'
import { useToken } from 'hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade } from 'hooks/useApproveCallback'
import { CompoundBotSummary } from 'pages/Compound/useCompoundRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import React, { useCallback, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Field } from 'state/swap/actions'
import { useDerivedSwapInfo, useSwapActionHandlers } from 'state/swap/hooks'
import { updateUserAprMode } from 'state/user/actions'
import { useExpertModeManager, useIsAprMode, useUserSlippageTolerance } from 'state/user/hooks'
import styled, { ThemeContext } from 'styled-components'
import { computeTradePriceBreakdown, warningSeverity } from 'utils/prices'

import { borderRadius, TYPE } from '../../theme'
import { ButtonConfirmed, ButtonLight, ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import DoubleCurrencyLogo from '../DoubleLogo'
import { AutoRow, RowBetween, RowFixed } from '../Row'

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
    padding-bottom: 0;
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

const PoolDetailsContainer = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: ${({ $expanded }) => ($expanded ? '610px' : '0')};
  transition: max-height 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
  overflow: hidden;
`

interface Props {
  compoundBotSummary: CompoundBotSummary
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

export const PoolCard: React.FC<Props> = ({ compoundBotSummary }: Props) => {
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)
  const userAprMode = useIsAprMode()
  const dispatch = useDispatch()
  const token0 = useToken(compoundBotSummary.token0Address) || undefined
  const token1 = useToken(compoundBotSummary.token1Address) || undefined
  const farmbotToken = useToken(compoundBotSummary.address) || undefined

  const [approvalSubmitted, setApprovalSubmitted] = useState(false)

  const { onCurrencySelection, onUserInput } = useSwapActionHandlers()
  const {
    v2Trade: trade,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
    showRamp,
  } = useDerivedSwapInfo()
  const { priceImpactWithoutFee } = computeTradePriceBreakdown(trade)
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)
  const [allowedSlippage] = useUserSlippageTolerance()
  const [isExpertMode] = useExpertModeManager()
  const { callback: swapCallback, error: swapCallbackError } = useTradeCallback(trade, allowedSlippage, null)
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const [approval, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !swapInputError &&
    (approval === ApprovalState.NOT_APPROVED ||
      approval === ApprovalState.PENDING ||
      (approvalSubmitted && approval === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  // const { data, loading, error } = useQuery(pairDataGql, {
  //   variables: { id: compoundBotSummary.stakingTokenAddress.toLowerCase() },
  // })

  const [expanded, setExpanded] = useState(false)
  const [zapInAmount, setZapInAmount] = useState('')
  const [zapInCurrency, setZapInCurrency] = useState<Token | undefined>()

  const isStaking = compoundBotSummary.amountUserLP > 0

  const { userValueCUSD, userAmountTokenA, userAmountTokenB } = useLPValue(compoundBotSummary.amountUserLP ?? 0, {
    token0Address: compoundBotSummary.token0Address,
    token1Address: compoundBotSummary.token1Address,
    lpAddress: compoundBotSummary.stakingTokenAddress,
  })

  // const swapRewardsUSDPerYear = 0
  // if (!loading && !error && data) {
  //   const lastDayVolumeUsd = data.pair.pairHourData.reduce(
  //     (acc: number, curr: { hourlyVolumeUSD: string }) => acc + Number(curr.hourlyVolumeUSD),
  //     0
  //   )
  //   swapRewardsUSDPerYear = Math.floor(lastDayVolumeUsd * 365 * 0.0025)
  // }
  // const rewardApr = new Percent(farmSummary.rewardsUSDPerYear, farmSummary.tvlUSD)
  // const swapApr = new Percent(toWei(swapRewardsUSDPerYear.toString()), farmSummary.tvlUSD)
  // const apr = new Percent(
  //   toBN(toWei(swapRewardsUSDPerYear.toString())).add(toBN(farmSummary.rewardsUSDPerYear)).toString(),
  //   farmSummary.tvlUSD
  // )

  const compoundedAPY: React.ReactNode | undefined = <>🤯</>
  let apr: any
  // try {
  //   compoundedAPY = annualizedPercentageYield(apr, COMPOUNDS_PER_YEAR)
  // } catch (e) {
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   console.error('apy calc overflow', `${compoundBotSummary.token0Address} - ${compoundBotSummary.token1Address}`, e)
  // }

  const handleToggleExpanded = () => {
    setExpanded((prev) => !prev)
  }

  const handleZapIn = useCallback(() => {
    if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
      return
    }
    if (!swapCallback) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then((hash) => {
        setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })
      })
      .catch((error) => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined,
        })
      })
  }, [priceImpactWithoutFee, swapCallback, tradeToConfirm, showConfirm, trade])

  const handleCurrencySelect = (inputToken: Token) => {
    setZapInCurrency(inputToken)
    onCurrencySelection(Field.INPUT, inputToken)
    onCurrencySelection(Field.OUTPUT, farmbotToken!)
  }

  const handleUserInput = (amount: string) => {
    setZapInAmount(amount)
    onUserInput(Field.INPUT, amount)
  }

  const displayedPercentageReturn =
    apr && apr.denominator.toString() !== '0'
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
        {/* <PoolStatRow
          statName={t('totalDeposited')}
          statValue={Number(fromWei(farmSummary.tvlUSD)).toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          })}
        /> */}
        {apr && apr.greaterThan('0') && (
          <div aria-label="Toggle APR/APY" onClick={() => dispatch(updateUserAprMode({ userAprMode: !userAprMode }))}>
            {/* <PoolStatRow
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
            /> */}
          </div>
        )}
      </StatContainer>

      {isStaking && userValueCUSD && (
        <RowBetween>
          <TYPE.black fontWeight={500}>
            <span>Your stake</span>
          </TYPE.black>

          <RowFixed>
            <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
              ${userValueCUSD.toSignificant(6, { groupSeparator: ',' })}
            </TYPE.black>
            <QuestionHelper
              text={`${userAmountTokenA?.toSignificant(6, { groupSeparator: ',' })} ${
                userAmountTokenA?.token.symbol
              }, ${userAmountTokenB?.toSignificant(6, { groupSeparator: ',' })} ${userAmountTokenB?.token.symbol}`}
            />
          </RowFixed>
        </RowBetween>
      )}

      <PoolDetailsContainer $expanded={expanded}>
        <CurrencyInputPanel
          value={zapInAmount}
          onUserInput={handleUserInput}
          label={t('zapInAmount')}
          showMaxButton={false}
          currency={zapInCurrency}
          onCurrencySelect={handleCurrencySelect}
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

        <RowBetween gap="12px">
          {showApproveFlow && (
            <ButtonConfirmed
              padding="8px"
              onClick={approveCallback}
              disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
              altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
              confirmed={approval === ApprovalState.APPROVED}
            >
              {approval === ApprovalState.PENDING ? (
                <AutoRow gap="6px" justify="center">
                  Approving <Loader stroke="white" />
                </AutoRow>
              ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                'Approved'
              ) : (
                'Approve ' + currencies[Field.INPUT]?.symbol
              )}
            </ButtonConfirmed>
          )}
          <ButtonLight onClick={handleZapIn} padding="8px">
            {t('approve')}
          </ButtonLight>
        </RowBetween>
      </PoolDetailsContainer>
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
