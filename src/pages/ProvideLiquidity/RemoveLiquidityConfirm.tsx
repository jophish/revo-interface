import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { Token } from '@ubeswap/sdk'
import { ButtonPrimary } from 'components/Button'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import { RowBetween, RowFixed } from 'components/Row'
import { useDoTransaction } from 'components/swap/routing'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { FarmBrokerBot } from 'generated'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { brokerBotAddress, metaFarmbotAddressMap } from 'pages/ProvideLiquidity'
import React, { useCallback, useContext, useState } from 'react'
import { Plus } from 'react-feather'
import { Text } from 'rebass'
import { Field } from 'state/burn/actions'
import { useBurnActionHandlers, useDerivedBurnInfo } from 'state/burn/hooks'
import { useUserSlippageTolerance } from 'state/user/hooks'
import { ThemeContext } from 'styled-components'
import { TYPE } from 'theme'
import { calculateSlippageAmount, getContract } from 'utils'
import { AbiItem } from 'web3-utils'

import farmBotAbi from '../../constants/abis/FarmBot.json'
import brokerBotAbi from '../../constants/abis/FarmBrokerBot.json'

interface Props {
  token0: Token
  token1: Token
  isOpen: boolean
  onDismiss: () => void
}

export default function RemoveLiquidityConfirm({ token0, token1, isOpen, onDismiss }: Props) {
  const theme = useContext(ThemeContext)
  const { address: account, network, kit } = useContractKit()
  const library = useProvider()
  const doTransaction = useDoTransaction()

  // burn state
  const { pair, parsedAmounts, error } = useDerivedBurnInfo(token0, token1)
  const { onUserInput } = useBurnActionHandlers()

  // modal and loading
  const [attemptingTxn, setAttemptingTxn] = useState(false) // clicked confirm

  // txn values
  const [txHash, setTxHash] = useState<string>('')
  const deadline = useTransactionDeadline()
  const [allowedSlippage] = useUserSlippageTolerance()

  const chainId = network.chainId

  const handleDismissConfirmation = useCallback(() => {
    onDismiss()
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.LIQUIDITY_PERCENT, '0')
    }
    setTxHash('')
  }, [onUserInput, txHash])

  async function onRemove() {
    if (!chainId || !library || !account || !deadline) throw new Error('missing dependencies')

    const { [Field.CURRENCY_A]: currencyAmountA, [Field.CURRENCY_B]: currencyAmountB } = parsedAmounts
    console.log(parsedAmounts)
    if (!currencyAmountA || !currencyAmountB) {
      throw new Error('missing currency amounts')
    }
    const brokerBot = getContract(brokerBotAddress, brokerBotAbi, library, account) as FarmBrokerBot

    const amountsMin = {
      [Field.CURRENCY_A]: calculateSlippageAmount(currencyAmountA, allowedSlippage)[0],
      [Field.CURRENCY_B]: calculateSlippageAmount(currencyAmountB, allowedSlippage)[0],
    }

    if (!token0 || !token1) throw new Error('missing tokens')
    const liquidityAmount = parsedAmounts[Field.LIQUIDITY]
    if (!liquidityAmount) throw new Error('missing liquidity amount')

    // removeLiquidity
    setAttemptingTxn(true)
    try {
      const metaFarmbotAddress =
        metaFarmbotAddressMap[`${token0.address}-${token1.address}` as keyof typeof metaFarmbotAddressMap]
      if (!metaFarmbotAddress) {
        throw new Error('could not find meta farmbot address from token0 and token1')
      }

      const farmBot = new kit.web3.eth.Contract(farmBotAbi.abi as AbiItem[], metaFarmbotAddress)
      const fpAmount = await farmBot.methods.getFpAmount(liquidityAmount.raw.toString()).call()

      const fpBalance = await farmBot.methods.balanceOf(account).call()
      const fractionFpBalance = parsedAmounts[Field.LIQUIDITY_PERCENT].multiply(fpBalance).toFixed(0)

      const response = await doTransaction(brokerBot, 'withdrawFPForStakingTokens', {
        args: [
          metaFarmbotAddress,
          fractionFpBalance,
          amountsMin[Field.CURRENCY_A].toString(),
          amountsMin[Field.CURRENCY_B].toString(),
          deadline.toHexString(),
        ],
        summary:
          'Remove ' +
          parsedAmounts[Field.CURRENCY_A]?.toSignificant(3) +
          ' ' +
          pair?.token0?.symbol +
          ' and ' +
          parsedAmounts[Field.CURRENCY_B]?.toSignificant(3) +
          ' ' +
          pair?.token1?.symbol,
      })
      setAttemptingTxn(false)
      setTxHash(response.hash)
    } catch (error) {
      setAttemptingTxn(false)
      // we only care if the error is something _other_ than the user rejected the tx
      console.error(error)
    }
  }

  const ModalHeader = () => {
    return (
      <AutoColumn gap={'md'} style={{ marginTop: '20px' }}>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={500}>
            {parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)}
          </Text>
          <RowFixed gap="4px">
            <CurrencyLogo currency={pair?.token0} size={'24px'} />
            <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
              {pair?.token0?.symbol}
            </Text>
          </RowFixed>
        </RowBetween>
        <RowFixed>
          <Plus size="16" color={theme.text2} />
        </RowFixed>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={500}>
            {parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)}
          </Text>
          <RowFixed gap="4px">
            <CurrencyLogo currency={pair?.token1} size={'24px'} />
            <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
              {pair?.token1?.symbol}
            </Text>
          </RowFixed>
        </RowBetween>

        <TYPE.italic fontSize={12} color={theme.text2} textAlign="left" padding={'12px 0 0 0'}>
          {`Output is estimated. If the price changes by more than ${
            allowedSlippage / 100
          }% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  const ModalFooter = () => {
    return (
      <>
        <RowBetween>
          <RowFixed>
            <DoubleCurrencyLogo currency0={pair?.token0} currency1={pair?.token1} margin={true} />
            <Text fontWeight={500} fontSize={16}>
              {parsedAmounts[Field.LIQUIDITY]?.toSignificant(6)}
            </Text>
          </RowFixed>
        </RowBetween>
        {pair && (
          <>
            <RowBetween>
              <Text color={theme.text2} fontWeight={500} fontSize={16}>
                Price
              </Text>
              <Text fontWeight={500} fontSize={16} color={theme.text1}>
                1 {pair?.token0?.symbol} = {token0 ? pair.priceOf(token0).toSignificant(6) : '-'} {pair?.token1?.symbol}
              </Text>
            </RowBetween>
            <RowBetween>
              <div />
              <Text fontWeight={500} fontSize={16} color={theme.text1}>
                1 {pair?.token1?.symbol} = {token1 ? pair.priceOf(token1).toSignificant(6) : '-'} {pair?.token0?.symbol}
              </Text>
            </RowBetween>
          </>
        )}
        <ButtonPrimary onClick={onRemove}>
          <Text fontWeight={500} fontSize={20}>
            Confirm
          </Text>
        </ButtonPrimary>
      </>
    )
  }

  const pendingText = `Supplying ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)} ${
    pair?.token0?.symbol
  } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)} ${pair?.token1?.symbol}`

  return (
    <TransactionConfirmationModal
      isOpen={isOpen}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={attemptingTxn}
      hash={txHash ? txHash : ''}
      content={() => (
        <ConfirmationModalContent
          title={'You will receive'}
          onDismiss={handleDismissConfirmation}
          topContent={ModalHeader}
          bottomContent={ModalFooter}
        />
      )}
      pendingText={pendingText}
    />
  )
}
