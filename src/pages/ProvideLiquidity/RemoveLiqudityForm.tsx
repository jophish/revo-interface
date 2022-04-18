import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { Contract } from '@ethersproject/contracts'
import { Percent, Token, TokenAmount } from '@ubeswap/sdk'
import { ButtonConfirmed, ButtonError, ButtonLight } from 'components/Button'
import { LightCard } from 'components/Card'
import { AutoColumn, ColumnCenter } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import Row, { RowBetween, RowFixed } from 'components/Row'
import Slider from 'components/Slider'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import { usePairContract } from 'hooks/useContract'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { Dots, MaxButton } from 'pages/Pool/styleds'
import { brokerBotAddress } from 'pages/ProvideLiquidity'
import React, { useCallback, useContext, useState } from 'react'
import { ArrowDown } from 'react-feather'
import { Text } from 'rebass'
import { Field } from 'state/burn/actions'
import { useBurnActionHandlers, useBurnState, useDerivedBurnInfo } from 'state/burn/hooks'
import { ThemeContext } from 'styled-components'
import useDebouncedChangeHandler from 'utils/useDebouncedChangeHandler'

interface Props {
  token0: Token
  token1: Token
  rfpToken: Token
  onConfirmRemoveLiquidity: () => void
  userTotalRFPBalance: number
}

export default function RemoveLiquidityForm({
  token0,
  token1,
  onConfirmRemoveLiquidity,
  userTotalRFPBalance,
  rfpToken,
}: Props) {
  const theme = useContext(ThemeContext)
  const { address: account, network, connect } = useContractKit()
  const library = useProvider()
  const deadline = useTransactionDeadline()

  const { independentField, typedValue } = useBurnState()
  const { pair, parsedAmounts, error } = useDerivedBurnInfo(token0, token1, userTotalRFPBalance)
  const { onUserInput: _onUserInput } = useBurnActionHandlers()
  const isValid = !error

  const formattedAmounts = {
    [Field.LIQUIDITY_PERCENT]: parsedAmounts[Field.LIQUIDITY_PERCENT].equalTo('0')
      ? '0'
      : parsedAmounts[Field.LIQUIDITY_PERCENT].lessThan(new Percent('1', '100'))
      ? '<1'
      : parsedAmounts[Field.LIQUIDITY_PERCENT].toFixed(0),
    [Field.LIQUIDITY]:
      independentField === Field.LIQUIDITY ? typedValue : parsedAmounts[Field.LIQUIDITY]?.toSignificant(6) ?? '',
    [Field.CURRENCY_A]:
      independentField === Field.CURRENCY_A ? typedValue : parsedAmounts[Field.CURRENCY_A]?.toSignificant(6) ?? '',
    [Field.CURRENCY_B]:
      independentField === Field.CURRENCY_B ? typedValue : parsedAmounts[Field.CURRENCY_B]?.toSignificant(6) ?? '',
  }
  // pair contract
  const pairContract: Contract | null = usePairContract(pair?.liquidityToken?.address)

  // allowance handling
  const rfpTokenAmount =
    rfpToken && parsedAmounts[Field.LIQUIDITY]
      ? new TokenAmount(rfpToken, parsedAmounts[Field.LIQUIDITY]!.raw)
      : undefined
  const [signatureData, setSignatureData] = useState<{ v: number; r: string; s: string; deadline: number } | null>(null)
  const [approval, approveCallback] = useApproveCallback(rfpTokenAmount, brokerBotAddress)

  async function onAttemptToApprove() {
    if (!pairContract || !pair || !library || !deadline) throw new Error('missing dependencies')
    const liquidityAmount = parsedAmounts[Field.LIQUIDITY]
    if (!liquidityAmount) throw new Error('missing liquidity amount')
    approveCallback()
  }

  const onUserInput = useCallback(
    (field: Field, typedValue: string) => {
      setSignatureData(null)
      return _onUserInput(field, typedValue)
    },
    [_onUserInput]
  )

  const liquidityPercentChangeCallback = useCallback(
    (value: number) => {
      onUserInput(Field.LIQUIDITY_PERCENT, value.toString())
    },
    [onUserInput]
  )

  const [innerLiquidityPercentage, setInnerLiquidityPercentage] = useDebouncedChangeHandler(
    Number.parseInt(parsedAmounts[Field.LIQUIDITY_PERCENT].toFixed(0)),
    liquidityPercentChangeCallback
  )

  return (
    <>
      <div style={{ paddingTop: '12px' }}>
        <AutoColumn gap="md">
          <LightCard>
            <AutoColumn gap="20px">
              <RowBetween>
                <Text fontWeight={500}>Amount</Text>
              </RowBetween>
              <Row style={{ alignItems: 'flex-end' }}>
                <Text fontSize={36} fontWeight={500}>
                  {formattedAmounts[Field.LIQUIDITY_PERCENT]}%
                </Text>
              </Row>
              <Slider value={innerLiquidityPercentage} onChange={setInnerLiquidityPercentage} />
              <RowBetween>
                <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '25')} width="20%">
                  25%
                </MaxButton>
                <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '50')} width="20%">
                  50%
                </MaxButton>
                <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '75')} width="20%">
                  75%
                </MaxButton>
                <MaxButton onClick={() => onUserInput(Field.LIQUIDITY_PERCENT, '100')} width="20%">
                  Max
                </MaxButton>
              </RowBetween>
            </AutoColumn>
          </LightCard>
          <ColumnCenter>
            <ArrowDown size="16" color={theme.text2} />
          </ColumnCenter>
          <LightCard>
            <AutoColumn gap="10px">
              <RowBetween>
                <Text fontSize={24} fontWeight={500}>
                  {formattedAmounts[Field.CURRENCY_A] || '-'}
                </Text>
                <RowFixed>
                  <CurrencyLogo currency={pair?.token0} style={{ marginRight: '12px' }} />
                  <Text fontSize={24} fontWeight={500} id="remove-liquidity-tokena-symbol">
                    {pair?.token0?.symbol}
                  </Text>
                </RowFixed>
              </RowBetween>
              <RowBetween>
                <Text fontSize={24} fontWeight={500}>
                  {formattedAmounts[Field.CURRENCY_B] || '-'}
                </Text>
                <RowFixed>
                  <CurrencyLogo currency={pair?.token1} style={{ marginRight: '12px' }} />
                  <Text fontSize={24} fontWeight={500} id="remove-liquidity-tokenb-symbol">
                    {pair?.token1?.symbol}
                  </Text>
                </RowFixed>
              </RowBetween>
            </AutoColumn>
          </LightCard>

          {pair && (
            <div style={{ padding: '10px 0px' }}>
              <RowBetween>
                Price:
                <div>
                  1 {pair?.token0?.symbol} = {token0 ? pair.priceOf(token0).toSignificant(6) : '-'}{' '}
                  {pair?.token1?.symbol}
                </div>
              </RowBetween>
              <RowBetween>
                <div />
                <div>
                  1 {pair?.token1?.symbol} = {token1 ? pair.priceOf(token1).toSignificant(6) : '-'}{' '}
                  {pair?.token0?.symbol}
                </div>
              </RowBetween>
            </div>
          )}
          <div style={{ position: 'relative' }}>
            {!account ? (
              <ButtonLight onClick={() => connect().catch(console.warn)}>Connect Wallet</ButtonLight>
            ) : (
              <RowBetween>
                <ButtonConfirmed
                  onClick={onAttemptToApprove}
                  confirmed={approval === ApprovalState.APPROVED || signatureData !== null}
                  disabled={approval !== ApprovalState.NOT_APPROVED || signatureData !== null}
                  mr="0.5rem"
                  fontWeight={500}
                  fontSize={16}
                >
                  {approval === ApprovalState.PENDING ? (
                    <Dots>Approving</Dots>
                  ) : approval === ApprovalState.APPROVED || signatureData !== null ? (
                    'Approved'
                  ) : (
                    'Approve'
                  )}
                </ButtonConfirmed>
                <ButtonError
                  onClick={onConfirmRemoveLiquidity}
                  disabled={!isValid || (signatureData === null && approval !== ApprovalState.APPROVED)}
                  error={!isValid && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
                >
                  <Text fontSize={16} fontWeight={500}>
                    {error || 'Remove'}
                  </Text>
                </ButtonError>
              </RowBetween>
            )}
          </div>
        </AutoColumn>
      </div>
    </>
  )
}
