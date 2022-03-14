import { Fraction, Token } from '@ubeswap/sdk'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import Loader from 'components/Loader'
import QuestionHelper from 'components/QuestionHelper'
import { useToken } from 'hooks/Tokens'
import { ApprovalState } from 'hooks/useApproveCallback'
import { FarmBotSummary } from 'pages/Compound/useCompoundRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import { MaxButton } from 'pages/Pool/styleds'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ArrowDown } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import { Field } from 'state/swap/actions'
import { useDerivedSwapInfo, useSwapActionHandlers } from 'state/swap/hooks'
import { useUserSlippageTolerance } from 'state/user/hooks'
import styled, { ThemeContext } from 'styled-components'
import { useCalcAPY } from 'utils/calcAPY'
import { computeTradePriceBreakdown } from 'utils/prices'
import { toBN } from 'web3-utils'

import { BLOCKED_PRICE_IMPACT_NON_EXPERT, ONE_BIPS } from '../../constants/'
import { TYPE } from '../../theme'
import useDebouncedChangeHandler from '../../utils/useDebouncedChangeHandler'
import { ButtonConfirmed, ButtonError, ButtonLight, ButtonPrimary } from '../Button'
import { LightCard } from '../Card'
import { AutoColumn, ColumnCenter } from '../Column'
import CurrencyLogo from '../CurrencyLogo'
import Row, { AutoRow, RowBetween, RowFixed } from '../Row'
import Slider from '../Slider'
import { PoolCard } from './PoolCard'
import { useZapFunctions } from './useZapFunctions'
import { ZapDetails } from './ZapDetails'

const RowColumn = styled(RowBetween)`
  flex-direction: row;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 0;
  `};
`

const ZapOutContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const PoolDetailsContainer = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: ${({ $expanded }) => ($expanded ? '610px' : '0')};
  margin-top: ${({ $expanded }) => ($expanded ? '12px' : '0')};
  transition: all 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
  overflow: hidden;
  #zap-out-token-selector {
    width: unset;
    padding-top: 0;
    > div {
      border: none;
    }
  }
  ${({ theme }) => theme.mediaWidth.upToMedium`
    #zap-out-token-selector {
      padding-top: 12px;
    }
  `};
`

const ManageMenu = styled.div<{ $expanded: boolean }>`
  display: flex;
  gap: 1rem;
  margin-top: ${({ $expanded }) => ($expanded ? '12px' : '0')};
  max-height: ${({ $expanded }) => ($expanded ? '40px' : '0')};
  transition: all 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
  overflow: hidden;
`

const ZapDetailsContainer = styled.div<{ $expanded: boolean }>`
  max-height: ${({ $expanded }) => ($expanded ? '400px' : '0')};
  transition: all 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
  overflow: hidden;
`

interface Props {
  farmBotSummary: FarmBotSummary
}

type ZapType = 'zapIn' | 'zapOut' | 'zapBetween'

const zapOutPercentages = [25, 50, 75, 100]

export const ZapCard: React.FC<Props> = ({ farmBotSummary }: Props) => {
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)

  const { v2Trade: trade, inputError: swapInputError } = useDerivedSwapInfo()
  const { priceImpactWithoutFee } = trade ? computeTradePriceBreakdown(trade) : {}
  const isPriceImpactTooHigh = !!priceImpactWithoutFee?.greaterThan(BLOCKED_PRICE_IMPACT_NON_EXPERT)

  const token0 = useToken(farmBotSummary.token0Address) || undefined
  const token1 = useToken(farmBotSummary.token1Address) || undefined
  const farmbotToken = useToken(farmBotSummary.address) || undefined

  const [allowedSlippage] = useUserSlippageTolerance()

  const compoundedAPY = useCalcAPY(farmBotSummary)

  const { onCurrencySelection, onUserInput } = useSwapActionHandlers()

  // const { data, loading, error } = useQuery(pairDataGql, {
  //   variables: { id: farmBotSummary.stakingTokenAddress.toLowerCase() },
  // })

  const [zapType, setZapType] = useState<ZapType | null>(null)
  // TODO: show zap completed state rather than just collapsing the whole box
  const [zapComplete, setZapComplete] = useState(false)
  const [showManageMenu, setShowManageMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // TODO: these 2 are not needed anymore, can get them from redux
  const [zapAmount, setZapInAmount] = useState('')
  const [zapCurrency, setZapInCurrency] = useState<Token | undefined>()

  const onZapComplete = () => {
    setZapComplete(true)
  }

  useEffect(() => {
    setZapComplete(false)
  }, [zapType, showManageMenu, expanded, zapAmount, zapCurrency])

  const { approval, approveCallback, onZap, showApproveFlow, currencies, approvalSubmitted } =
    useZapFunctions(onZapComplete)

  const isStaking = farmBotSummary.amountUserLP > 0

  const { userValueCUSD, userAmountTokenA, userAmountTokenB } = useLPValue(farmBotSummary.amountUserLP ?? 0, {
    token0Address: farmBotSummary.token0Address,
    token1Address: farmBotSummary.token1Address,
    lpAddress: farmBotSummary.stakingTokenAddress,
  })

  const { userValueCUSD: tvlCUSD } = useLPValue(farmBotSummary.totalLP ?? 0, {
    token0Address: farmBotSummary.token0Address,
    token1Address: farmBotSummary.token1Address,
    lpAddress: farmBotSummary.stakingTokenAddress,
  })

  const handleToggleExpanded = () => {
    if (isStaking) {
      setShowManageMenu((prev) => !prev)
      setZapType(null)
    } else {
      setZapType((prev) => (prev ? null : 'zapIn'))
    }
  }

  const handleCurrencySelect = (inputToken: Token) => {
    setZapInCurrency(inputToken)
    if (zapType === 'zapIn') {
      onCurrencySelection(Field.INPUT, inputToken)
      onCurrencySelection(Field.OUTPUT, farmbotToken!)
      // show price details
    } else if (zapType === 'zapOut') {
      onCurrencySelection(Field.OUTPUT, inputToken)
      onCurrencySelection(Field.INPUT, farmbotToken!)
    }
  }

  const handleSetZapType = (type: ZapType) => {
    setExpanded(!!type)
    // allow animation to finish
    setTimeout(() => {
      setZapType(type)
      if (type == 'zapOut') {
        setZapOutPercentage(50)
      }
      onCurrencySelection(Field.INPUT, null)
      onCurrencySelection(Field.OUTPUT, null)
      onUserInput(Field.INPUT, '')
      setZapInAmount('')
      setZapInCurrency(undefined)
    }, 200)
  }

  const handleUserInput = (amount: string) => {
    setZapInAmount(amount)
    onUserInput(Field.INPUT, amount)
  }

  const zapOutPercentChangeCallback = useCallback(
    (value: number) => {
      const rawAmountZapOut = toBN(farmBotSummary.amountUserFP).mul(toBN(value)).div(toBN(100)).toString()
      const adjustedAmountZapOut = new Fraction(toBN(rawAmountZapOut), toBN(10).pow(toBN(18))).toSignificant(100)
      setZapInAmount(rawAmountZapOut)
      onUserInput(Field.INPUT, adjustedAmountZapOut)
    },
    [handleUserInput, farmBotSummary.amountUserFP, onUserInput]
  )

  const [zapOutPercentage, setZapOutPercentage] = useDebouncedChangeHandler<number>(50, zapOutPercentChangeCallback)

  const PoolDetails = isStaking ? (
    <RowBetween padding="8px 0">
      <TYPE.black fontWeight={500}>
        <span>Your stake</span>
      </TYPE.black>

      <RowFixed>
        {userValueCUSD ? (
          <>
            <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
              ${userValueCUSD.toFixed(2, { groupSeparator: ',' })}
            </TYPE.black>
            <QuestionHelper
              text={`${userAmountTokenA?.toSignificant(6, { groupSeparator: ',' })} ${
                userAmountTokenA?.token.symbol
              }, ${userAmountTokenB?.toSignificant(6, { groupSeparator: ',' })} ${userAmountTokenB?.token.symbol}`}
            />
          </>
        ) : (
          <Loader centered size="24px" />
        )}
      </RowFixed>
    </RowBetween>
  ) : null

  return (
    <PoolCard
      token0={token0}
      token1={token1}
      poolTitle={`${token0?.symbol}-${token1?.symbol}`}
      APY={compoundedAPY}
      APYInfo={t('APYInfo')}
      buttonLabel={isStaking ? t('manage') : t('zapIn')}
      buttonOnPress={handleToggleExpanded}
      buttonActive={showManageMenu || zapType === 'zapIn'}
      tvlCUSD={tvlCUSD}
      tvlCUSDInfo={t('farmBotTVLInfo')}
      PoolDetails={PoolDetails}
    >
      <ManageMenu $expanded={showManageMenu}>
        <ButtonPrimary onClick={() => handleSetZapType('zapIn')} padding="8px" inverse={zapType !== 'zapIn'}>
          {t('zapIn')}
        </ButtonPrimary>
        <ButtonPrimary onClick={() => handleSetZapType('zapOut')} padding="8px" inverse={zapType !== 'zapOut'}>
          {t('zapOut')}
        </ButtonPrimary>
      </ManageMenu>

      <PoolDetailsContainer $expanded={!!zapType}>
        {zapType == 'zapIn' && (
          <CurrencyInputPanel
            value={zapAmount}
            onUserInput={handleUserInput}
            label={t('zapInAmount')}
            showMaxButton={false}
            currency={zapCurrency}
            onCurrencySelect={handleCurrencySelect}
            otherCurrency={null}
            id="zap-currency-input"
          />
        )}

        {zapType == 'zapOut' && (
          <ZapOutContainer>
            <div>
              <RowColumn padding="0 0 12px 0">
                <TYPE.black fontWeight={500}>
                  <span>{t('zapOutSelect')}</span>
                </TYPE.black>

                <CurrencyInputPanel
                  value={zapAmount}
                  onUserInput={handleUserInput}
                  label={t('zapOutAmount')}
                  showMaxButton={false}
                  currency={zapCurrency}
                  onCurrencySelect={handleCurrencySelect}
                  otherCurrency={null}
                  hideInput={true}
                  id="zap-out-token-selector"
                />
              </RowColumn>
            </div>
            {zapCurrency && (
              <AutoColumn>
                <LightCard>
                  <>
                    <Row style={{ alignItems: 'flex-end' }}>
                      <Text fontSize={48} fontWeight={500}>
                        {zapOutPercentage}%
                      </Text>
                    </Row>
                    <Slider value={zapOutPercentage} onChange={setZapOutPercentage} />
                    <RowBetween>
                      {zapOutPercentages.map((percentage) => (
                        <MaxButton key={percentage} onClick={() => setZapOutPercentage(percentage)} width="25%">
                          {`${percentage}%`}
                        </MaxButton>
                      ))}
                    </RowBetween>
                  </>
                </LightCard>
                {!!trade && (
                  <>
                    <ColumnCenter>
                      <ArrowDown size="16" color={theme.text2} />
                    </ColumnCenter>
                    <LightCard>
                      <RowBetween>
                        <RowFixed>
                          <Text fontSize={24} fontWeight={500}>
                            {trade.minimumAmountOut(ONE_BIPS.multiply(toBN(allowedSlippage))).toFixed(2) || '-'}
                          </Text>
                          <QuestionHelper text={t('zapOutPriceImpactHelper')} />
                        </RowFixed>
                        <RowFixed>
                          <CurrencyLogo currency={zapCurrency} style={{ marginRight: '12px' }} />
                          <Text fontSize={24} fontWeight={500}>
                            {zapCurrency?.symbol}
                          </Text>
                        </RowFixed>
                      </RowBetween>
                    </LightCard>
                  </>
                )}
              </AutoColumn>
            )}
          </ZapOutContainer>
        )}

        <RowBetween gap="16px">
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
          {isPriceImpactTooHigh ? (
            <ButtonError padding="8px" disabled={true} error={true}>
              {t('priceImpact')}
            </ButtonError>
          ) : (
            <ButtonLight onClick={onZap} padding="8px" disabled={!!swapInputError}>
              {zapType === 'zapIn' ? t('zapIn') : t('zapOut')}
            </ButtonLight>
          )}
        </RowBetween>

        {!swapInputError && (
          <ZapDetailsContainer $expanded={!!zapType && !swapInputError}>
            <ZapDetails trade={trade} allowedSlippage={allowedSlippage} />
          </ZapDetailsContainer>
        )}
      </PoolDetailsContainer>
    </PoolCard>
  )
}

export default ZapCard
