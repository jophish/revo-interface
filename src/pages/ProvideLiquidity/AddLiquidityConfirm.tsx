import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { Token } from '@ubeswap/sdk'
import { LightCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import Row, { RowFlat } from 'components/Row'
import { useDoTransaction } from 'components/swap/routing'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { FarmBrokerBot } from 'generated'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { ConfirmAddModalBottom } from 'pages/AddLiquidity/ConfirmAddModalBottom'
import React, { useCallback, useState } from 'react'
import { Text } from 'rebass'
import { Field } from 'state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers } from 'state/mint/hooks'
import { useUserSlippageTolerance } from 'state/user/hooks'
import { TYPE } from 'theme'
import { calculateSlippageAmount, getContract } from 'utils'

import brokerBotAbi from '../../constants/abis/FarmBrokerBot.json'

const brokerBotAddress = '0x02763Ce86559Ba8DF9939a1281a988a9d0073C87'
// key is token0Address-token1Address
const metaFarmbotAddressMap = {
  '0x918146359264C492BD6934071c6Bd31C854EDBc3-0xCB34fbfC3b9a73bc04D2eb43B62532c7918d9E81':
    '0xAcA7148642d2C634b318ff36d14764f8Bde4dc95',
}

interface Props {
  token0: Token
  token1: Token
  isOpen: boolean
  onDismiss: () => void
}

export default function AddLiquidityConfirm({ token0, token1, isOpen, onDismiss }: Props) {
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  const deadline = useTransactionDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users
  const [txHash, setTxHash] = useState('')

  const {
    address: account,
    network: { chainId },
  } = useContractKit()
  const library = useProvider()

  const { currencies, price, noLiquidity, poolTokenPercentage, parsedAmounts, currencyBalances, liquidityMinted } =
    useDerivedMintInfo(token0, token1)

  const { onFieldAInput } = useMintActionHandlers(noLiquidity)
  const doTransaction = useDoTransaction()

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
    const brokerBot = getContract(brokerBotAddress, brokerBotAbi, library, account) as FarmBrokerBot

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
      const metaFarmbotAddress =
        metaFarmbotAddressMap[`${token0.address}-${token1.address}` as keyof typeof metaFarmbotAddressMap]
      if (!metaFarmbotAddress) {
        throw new Error('could not find meta farmbot address from token0 and token1')
      }

      const response = await doTransaction(brokerBot, 'getUniswapLPAndDeposit', {
        args: [
          metaFarmbotAddress,
          {
            amount0Desired: parsedAmountA.raw.toString(),
            amount1Desired: parsedAmountB.raw.toString(),
            amount0Min: amountsMin[Field.CURRENCY_A].toString(),
            amount1Min: amountsMin[Field.CURRENCY_B].toString(),
          },
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
