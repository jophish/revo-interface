import { useContractKit } from '@celo-tools/use-contractkit'
import { CELO, ChainId as UbeswapChainId, Token, TokenAmount } from '@ubeswap/sdk'
import { ButtonError, ButtonPrimary } from 'components/Button'
import { LightCard } from 'components/Card'
import { ColumnCenter } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import { RowBetween } from 'components/Row'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import { PoolPriceBar } from 'pages/AddLiquidity/PoolPriceBar'
import { Dots } from 'pages/Pool/styleds'
import React, { useContext } from 'react'
import { Plus } from 'react-feather'
import { Field } from 'state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from 'state/mint/hooks'
import styled, { ThemeContext } from 'styled-components'
import { TYPE } from 'theme'
import { maxAmountSpend } from 'utils/maxAmountSpend'

import { ROUTER_ADDRESS } from '../../constants'

const StyledColumnCenter = styled(ColumnCenter)`
  padding-top: 16px;
`

interface Props {
  token0: Token
  token1: Token
  onConfirmAddLiquidity: () => void
}

export default function AddLiquidityForm({ token0, token1, onConfirmAddLiquidity }: Props) {
  const theme = useContext(ThemeContext)

  const { network } = useContractKit()

  const { independentField, typedValue, otherTypedValue } = useMintState()
  const {
    currencies,
    price,
    noLiquidity,
    poolTokenPercentage,
    dependentField,
    parsedAmounts,
    currencyBalances,
    error,
  } = useDerivedMintInfo(token0, token1)

  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_A], ROUTER_ADDRESS)
  const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_B], ROUTER_ADDRESS)

  const chainId = network.chainId

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field]),
      }
    },
    {}
  )

  const atMaxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0'),
      }
    },
    {}
  )

  return (
    <>
      <CurrencyInputPanel
        value={formattedAmounts[Field.CURRENCY_A]}
        onUserInput={onFieldAInput}
        onMax={() => {
          if (currencies[Field.CURRENCY_A]?.address === CELO[chainId as unknown as UbeswapChainId].address) {
            onFieldAInput(Math.max(Number(maxAmounts[Field.CURRENCY_A]?.toExact() ?? 0) - 0.01, 0).toString())
          } else {
            onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? 0)
          }
        }}
        showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
        currency={token0}
        id="add-liquidity-input-token-a"
        disableCurrencySelect
      />
      <StyledColumnCenter>
        <Plus size="16" color={theme.text2} />
      </StyledColumnCenter>
      <CurrencyInputPanel
        value={formattedAmounts[Field.CURRENCY_B]}
        onUserInput={onFieldBInput}
        onMax={() => {
          if (currencies[Field.CURRENCY_B]?.address === CELO[chainId as unknown as UbeswapChainId].address) {
            onFieldBInput(Math.max(Number(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '') - 0.01, 0).toString())
          } else {
            onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
          }
        }}
        showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
        currency={token1}
        id="add-liquidity-input-token-b"
        disableCurrencySelect
      />
      <LightCard padding="16px" margin="16px 0">
        <RowBetween padding="0 0 16px 0">
          <TYPE.subHeader fontWeight={500} fontSize={14}>
            {noLiquidity ? 'Initial prices' : 'Prices'} and pool share
          </TYPE.subHeader>
        </RowBetween>{' '}
        <PoolPriceBar
          currencies={currencies}
          poolTokenPercentage={poolTokenPercentage}
          noLiquidity={noLiquidity}
          price={price}
        />
      </LightCard>

      <RowBetween gap="16px">
        {(approvalA === ApprovalState.NOT_APPROVED ||
          approvalA === ApprovalState.PENDING ||
          approvalB === ApprovalState.NOT_APPROVED ||
          approvalB === ApprovalState.PENDING) &&
          !error && (
            <RowBetween>
              {approvalA !== ApprovalState.APPROVED && (
                <ButtonPrimary
                  onClick={approveACallback}
                  disabled={approvalA === ApprovalState.PENDING}
                  width={approvalB !== ApprovalState.APPROVED ? '48%' : '100%'}
                  padding="8px"
                >
                  {approvalA === ApprovalState.PENDING ? (
                    <Dots>Approving {currencies[Field.CURRENCY_A]?.symbol}</Dots>
                  ) : (
                    'Approve ' + currencies[Field.CURRENCY_A]?.symbol
                  )}
                </ButtonPrimary>
              )}
              {approvalB !== ApprovalState.APPROVED && (
                <ButtonPrimary
                  onClick={approveBCallback}
                  disabled={approvalB === ApprovalState.PENDING}
                  width={approvalA !== ApprovalState.APPROVED ? '48%' : '100%'}
                  padding="8px"
                >
                  {approvalB === ApprovalState.PENDING ? (
                    <Dots>Approving {currencies[Field.CURRENCY_B]?.symbol}</Dots>
                  ) : (
                    'Approve ' + currencies[Field.CURRENCY_B]?.symbol
                  )}
                </ButtonPrimary>
              )}
            </RowBetween>
          )}
        <ButtonError
          padding="8px"
          onClick={onConfirmAddLiquidity}
          disabled={!!error || approvalA !== ApprovalState.APPROVED || approvalB !== ApprovalState.APPROVED}
          error={!!error && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
        >
          {error ?? 'Supply'}
        </ButtonError>
      </RowBetween>
    </>
  )
}
