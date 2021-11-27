import { Fraction, Percent, Token, TokenAmount } from '@ubeswap/sdk'
import React from 'react'
import { Text } from 'rebass'

import { ButtonPrimary } from '../../components/Button'
import CurrencyLogo from '../../components/CurrencyLogo'
import { RowBetween, RowFixed } from '../../components/Row'
import { Field } from '../../state/mint/actions'
import { TYPE } from '../../theme'

export function ConfirmAddCompoundModalBottom({
  currency,
  tokenAmount,
  onAdd,
}: {
  currency: Token
  tokenAmount: TokenAmount
  onAdd: () => void
}) {
  return (
    <>
      <RowBetween>
        <TYPE.body>{currency.symbol} Deposited</TYPE.body>
        <RowFixed>
          <CurrencyLogo currency={currency} style={{ marginRight: '8px' }} />
          <TYPE.body>{tokenAmount?.toSignificant(6)}</TYPE.body>
        </RowFixed>
      </RowBetween>
      <ButtonPrimary style={{ margin: '20px 0 0 0' }} onClick={onAdd}>
        <Text fontWeight={500} fontSize={20}>
          {'Confirm Deposit'}
        </Text>
      </ButtonPrimary>
    </>
  )
}
