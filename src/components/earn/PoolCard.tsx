import { gql } from '@apollo/client'
import { useContractKit } from '@celo-tools/use-contractkit'
import { Token } from '@ubeswap/sdk'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import Loader from 'components/Loader'
import QuestionHelper from 'components/QuestionHelper'
import { usePair } from 'data/Reserves'
import { useToken } from 'hooks/Tokens'
import { ApprovalState } from 'hooks/useApproveCallback'
import { CompoundBotSummary } from 'pages/Compound/useCompoundRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Field } from 'state/swap/actions'
import { useDerivedSwapInfo, useSwapActionHandlers } from 'state/swap/hooks'
import { useIsAprMode } from 'state/user/hooks'
import styled, { ThemeContext } from 'styled-components'
import { useCalcAPY } from 'utils/calcAPY'
import { useCUSDPrices } from 'utils/useCUSDPrice'
import { fromWei, toBN } from 'web3-utils'

import { borderRadius, TYPE } from '../../theme'
import { ButtonConfirmed, ButtonLight, ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import DoubleCurrencyLogo from '../DoubleLogo'
import { AutoRow, RowBetween, RowFixed } from '../Row'
import PoolStatRow from './PoolStats/PoolStatRow'
import { useZapFunctions } from './useZapFunctions'

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
  min-height: 110px;
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

const ManageMenu = styled.div<{ $expanded: boolean }>`
  display: flex;
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

type ZapType = 'zapIn' | 'zapOut' | 'zapBetween'

export const PoolCard: React.FC<Props> = ({ compoundBotSummary }: Props) => {
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)
  const userAprMode = useIsAprMode()
  const { address } = useContractKit()
  const dispatch = useDispatch()
  const { inputError: swapInputError } = useDerivedSwapInfo()

  const token0 = useToken(compoundBotSummary.token0Address) || undefined
  const token1 = useToken(compoundBotSummary.token1Address) || undefined
  const farmbotToken = useToken(compoundBotSummary.address) || undefined

  const rewardsToken = useToken(compoundBotSummary.rewardsAddress) || undefined
  const tokens = [token0, token1, rewardsToken].filter((t?: Token): t is Token => !!t)
  const cusdPrices = useCUSDPrices(tokens)
  const stakingTokenPair = usePair(token0, token1)?.[1]

  const compoundedAPY = useCalcAPY(compoundBotSummary)

  const { onCurrencySelection, onUserInput } = useSwapActionHandlers()

  // const { data, loading, error } = useQuery(pairDataGql, {
  //   variables: { id: compoundBotSummary.stakingTokenAddress.toLowerCase() },
  // })

  const [zapType, setZapType] = useState<ZapType | null>(null)
  const [showManageMenu, setShowManageMenu] = useState(false)

  // TODO: these 2 are not needed anymore, can get them from redux
  const [zapAmount, setZapInAmount] = useState('')
  const [zapCurrency, setZapInCurrency] = useState<Token | undefined>()

  const onZapSubmitted = (): void => {
    setZapType(null)
  }
  const { approval, approveCallback, onZap, showApproveFlow, currencies, approvalSubmitted } =
    useZapFunctions(onZapSubmitted)

  const isStaking = compoundBotSummary.amountUserLP > 0

  const { userValueCUSD, userAmountTokenA, userAmountTokenB } = useLPValue(compoundBotSummary.amountUserLP ?? 0, {
    token0Address: compoundBotSummary.token0Address,
    token1Address: compoundBotSummary.token1Address,
    lpAddress: compoundBotSummary.stakingTokenAddress,
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
    } else if (zapType === 'zapOut') {
      onCurrencySelection(Field.OUTPUT, inputToken)
      onCurrencySelection(Field.INPUT, farmbotToken!)
    }
  }

  const handleSetZapType = (type: ZapType) => {
    setZapType(type)
    onCurrencySelection(Field.INPUT, null)
    onCurrencySelection(Field.OUTPUT, null)
    onUserInput(Field.INPUT, '')
    setZapInAmount('')
    setZapInCurrency(undefined)
  }

  const handleUserInput = (amount: string) => {
    setZapInAmount(amount)

    if (zapType === 'zapIn') {
      onUserInput(Field.INPUT, amount)
    } else if (zapType === 'zapOut') {
      onUserInput(Field.OUTPUT, amount)
    }
  }

  if (!token0 || !token1) {
    return (
      <Wrapper showBackground>
        <Loader centered size="24px" />
      </Wrapper>
    )
  }

  return (
    <Wrapper showBackground>
      <TopSection>
        <DoubleCurrencyLogo currency0={token0} currency1={token1} size={24} />
        <PoolInfo style={{ marginLeft: '8px' }}>
          <TYPE.black fontWeight={600} fontSize={[18, 24]}>
            {token0?.symbol}-{token1?.symbol}
          </TYPE.black>
          {compoundedAPY && (
            <TYPE.darkGray style={{ display: 'flex' }}>
              <TYPE.small className="apy" fontWeight={400} fontSize={14} paddingTop={'0.2rem'}>
                APY: {compoundedAPY}
              </TYPE.small>
              <QuestionHelper text={t('APYInfo')} />
            </TYPE.darkGray>
          )}
        </PoolInfo>

        {address && (
          <ButtonPrimary onClick={handleToggleExpanded} padding="8px">
            {isStaking ? t('manage') : t('zap')}
          </ButtonPrimary>
        )}
      </TopSection>

      <StatContainer>
        <PoolStatRow
          statName={t('totalDeposited')}
          // statValue={'0'}
          statValue={Number(fromWei(toBN(compoundBotSummary.totalFP))).toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          })}
        />
        {compoundedAPY && (
          <div>
            <PoolStatRow
              helperText={
                <>
                  <small>{t('APYInfo')}</small>
                  <br />
                </>
              }
              statName={'APY'}
              statValue={compoundedAPY}
            />
          </div>
        )}
      </StatContainer>

      {isStaking && userValueCUSD && (
        <RowBetween padding="8px 0">
          <TYPE.black fontWeight={500}>
            <span>Your stake</span>
          </TYPE.black>

          <RowFixed>
            <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
              ${userValueCUSD.toFixed(2, { groupSeparator: ',' })}
            </TYPE.black>
            <QuestionHelper
              text={`${userAmountTokenA?.toSignificant(6, { groupSeparator: ',' })} ${
                userAmountTokenA?.token.symbol
              }, ${userAmountTokenB?.toSignificant(6, { groupSeparator: ',' })} ${userAmountTokenB?.token.symbol}`}
            />
          </RowFixed>
        </RowBetween>
      )}

      <ManageMenu $expanded={showManageMenu}>
        <ButtonPrimary onClick={() => handleSetZapType('zapIn')} padding="8px" disabled={zapType === 'zapIn'}>
          {t('zap')}
        </ButtonPrimary>
        <ButtonPrimary onClick={() => handleSetZapType('zapOut')} padding="8px" disabled={zapType === 'zapOut'}>
          {t('zapOut')}
        </ButtonPrimary>
      </ManageMenu>

      <PoolDetailsContainer $expanded={!!zapType}>
        <CurrencyInputPanel
          value={zapAmount}
          onUserInput={handleUserInput}
          label={zapType === 'zapIn' ? t('zapInAmount') : t('zapOutAmount')}
          showMaxButton={false}
          currency={zapCurrency}
          onCurrencySelect={handleCurrencySelect}
          otherCurrency={null}
          id="zap-currency-input"
        />

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
          <ButtonLight onClick={onZap} padding="8px" disabled={!!swapInputError}>
            {zapType === 'zapIn' ? t('zap') : t('zapOut')}
          </ButtonLight>
        </RowBetween>
      </PoolDetailsContainer>
    </Wrapper>
  )
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
