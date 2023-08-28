import { useCelo, useProvider } from '@celo/react-celo'
import { Token } from '@ubeswap/sdk'
import { LightCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import Row, { RowFlat } from 'components/Row'
import { useDoTransaction } from 'components/swap/routing'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { ConfirmAddModalBottom } from 'pages/AddLiquidity/ConfirmAddModalBottom'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import { Field } from 'state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers } from 'state/mint/hooks'
import { useUserSlippageTolerance } from 'state/user/hooks'
import { TYPE } from 'theme'
import { calculateSlippageAmount, getRouterContract } from 'utils'

interface Props {
  token0: Token
  token1: Token
  isOpen: boolean
  onDismiss: () => void
}

export default function AddLiquidityConfirm({ token0, token1, isOpen, onDismiss }: Props) {
  const { t } = useTranslation()
  // modal and loading
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // txn values
  const deadline = useTransactionDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users
  const [txHash, setTxHash] = useState('')

  const { address: account, network } = useCelo()
  const library = useProvider()

  const { currencies, price, noLiquidity, poolTokenPercentage, parsedAmounts, currencyBalances, liquidityMinted } =
    useDerivedMintInfo(token0, token1)

  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)
  const doTransaction = useDoTransaction()

  const chainId = network.chainId

  const handleDismissConfirmation = useCallback(() => {
    onDismiss()
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
    }
    setTxHash('')
  }, [onFieldAInput, txHash])

  async function onAdd() {
    if (!chainId || !library || !account) return
    const router = getRouterContract(chainId, library, account)

    const { [Field.CURRENCY_A]: parsedAmountA, [Field.CURRENCY_B]: parsedAmountB } = parsedAmounts
    if (!parsedAmountA || !parsedAmountB || !token0 || !token1 || !deadline) {
      return
    }

    const amountsMin = {
      [Field.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? 0 : allowedSlippage)[0],
      [Field.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? 0 : allowedSlippage)[0],
    }

    setAttemptingTxn(true)
    try {
      const response = await doTransaction(router, 'addLiquidity', {
        args: [
          token0.address ?? '',
          token1.address ?? '',
          parsedAmountA.raw.toString(),
          parsedAmountB.raw.toString(),
          amountsMin[Field.CURRENCY_A].toString(),
          amountsMin[Field.CURRENCY_B].toString(),
          account,
          deadline.toHexString(),
        ],
        summary:
          'Add ' +
          parsedAmounts[Field.CURRENCY_A]?.toSignificant(3) +
          ' ' +
          currencies[Field.CURRENCY_A]?.symbol +
          ' and ' +
          parsedAmounts[Field.CURRENCY_B]?.toSignificant(3) +
          ' ' +
          currencies[Field.CURRENCY_B]?.symbol,
      })

      setAttemptingTxn(false)
      setTxHash(response.hash)
    } catch (error: any) {
      setAttemptingTxn(false)
      // we only care if the error is something _other_ than the user rejected the tx
      if (error?.code !== 4001) {
        console.error(error)
      }
    }
  }

  const ModalHeader = () => {
    return noLiquidity ? (
      <AutoColumn gap="20px">
        <LightCard mt="20px" borderRadius="20px">
          <RowFlat>
            <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
              {currencies[Field.CURRENCY_A]?.symbol + '/' + currencies[Field.CURRENCY_B]?.symbol}
            </Text>
            <DoubleCurrencyLogo
              currency0={currencies[Field.CURRENCY_A]}
              currency1={currencies[Field.CURRENCY_B]}
              size={30}
            />
          </RowFlat>
        </LightCard>
      </AutoColumn>
    ) : (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {liquidityMinted?.toSignificant(6)}
          </Text>
          <DoubleCurrencyLogo
            currency0={currencies[Field.CURRENCY_A]}
            currency1={currencies[Field.CURRENCY_B]}
            size={30}
          />
        </RowFlat>
        <Row>
          <Text fontSize="24px">
            {currencies[Field.CURRENCY_A]?.symbol + '/' + currencies[Field.CURRENCY_B]?.symbol + ' Pool Tokens'}
          </Text>
        </Row>
        <TYPE.italic fontSize={12} textAlign="left" padding={'8px 0 0 0 '}>
          {`Output is estimated. If the price changes by more than ${
            allowedSlippage / 100
          }% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  const ModalFooter = () => (
    <ConfirmAddModalBottom
      price={price}
      currencies={currencies}
      parsedAmounts={parsedAmounts}
      noLiquidity={noLiquidity}
      onAdd={onAdd}
      poolTokenPercentage={poolTokenPercentage}
    />
  )

  const pendingText = `Supplying ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(6)} ${
    currencies[Field.CURRENCY_A]?.symbol
  } and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(6)} ${currencies[Field.CURRENCY_B]?.symbol}`

  return (
    <TransactionConfirmationModal
      isOpen={isOpen}
      onDismiss={handleDismissConfirmation}
      attemptingTxn={attemptingTxn}
      hash={txHash}
      content={() => (
        <ConfirmationModalContent
          title={noLiquidity ? 'You are creating a pool' : 'You will receive'}
          onDismiss={handleDismissConfirmation}
          topContent={ModalHeader}
          bottomContent={ModalFooter}
        />
      )}
      pendingText={pendingText}
    />
  )
}
