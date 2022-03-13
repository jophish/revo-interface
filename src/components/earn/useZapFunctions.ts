import { Trade } from '@ubeswap/sdk'
import confirmPriceImpactWithoutFee from 'components/swap/confirmPriceImpactWithoutFee'
import { useTradeCallback } from 'components/swap/routing/useTradeCallback'
import { ApprovalState, useApproveCallbackFromTrade } from 'hooks/useApproveCallback'
import { useCallback, useEffect, useState } from 'react'
import { useDerivedSwapInfo } from 'state/swap/hooks'
import { useExpertModeManager, useUserSlippageTolerance } from 'state/user/hooks'
import { computeTradePriceBreakdown, warningSeverity } from 'utils/prices'

// most of this logic taken from the Swap page
// TODO: make use of expert mode/ displaying swap message/having a confirmation
// modal for swap
export const useZapFunctions = (onZapComplete?: () => void) => {
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
  const [approvalSubmitted, setApprovalSubmitted] = useState(false)

  const { v2Trade: trade, currencies, inputError: swapInputError } = useDerivedSwapInfo()
  const { priceImpactWithoutFee } = computeTradePriceBreakdown(trade)
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)
  const [allowedSlippage] = useUserSlippageTolerance()
  const [isExpertMode] = useExpertModeManager()
  const { callback: swapCallback, error: swapCallbackError } = useTradeCallback(trade, allowedSlippage, null)
  const [approval, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage)

  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !swapInputError &&
    (approval === ApprovalState.NOT_APPROVED ||
      approval === ApprovalState.PENDING ||
      (approvalSubmitted && approval === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const onZap = useCallback(() => {
    if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
      return
    }
    if (!swapCallback) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then((hash) => {
        if (onZapComplete) {
          onZapComplete()
        }
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

  return {
    showApproveFlow,
    approval,
    onZap,
    approveCallback,
    approvalSubmitted,
    currencies,
  }
}
