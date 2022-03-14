import QuestionHelper from 'components/QuestionHelper'
import { RowBetween, RowFixed } from 'components/Row'
import FormattedPriceImpact from 'components/swap/FormattedPriceImpact'
import { UbeswapTrade } from 'components/swap/routing/trade'
import React, { useContext } from 'react'
import { ThemeContext } from 'styled-components'
import { computeTradePriceBreakdown } from 'utils/prices'

import { TYPE } from '../../theme'

interface Props {
  trade: UbeswapTrade | undefined
  allowedSlippage: number
}

export const ZapDetails: React.FC<Props> = ({ trade, allowedSlippage }: Props) => {
  const theme = useContext(ThemeContext)
  const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(trade)

  return (
    <>
      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
            Price Impact
          </TYPE.black>
          <QuestionHelper text="The difference between the market price and estimated price due to trade size." />
        </RowFixed>
        <FormattedPriceImpact priceImpact={priceImpactWithoutFee} />
      </RowBetween>

      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
            Liquidity Provider Fee
          </TYPE.black>
          <QuestionHelper text="Charged by Ubeswap to incentivize liquidity. Revo does not take a cut of this fee." />
        </RowFixed>
        <TYPE.black fontSize={14} color={theme.text1}>
          {realizedLPFee ? `${realizedLPFee.toSignificant(4)} ${trade?.inputAmount.currency.symbol}` : '-'}
        </TYPE.black>
      </RowBetween>
    </>
  )
}
