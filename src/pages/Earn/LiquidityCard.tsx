import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { CELO, ChainId as UbeswapChainId, Token, TokenAmount } from '@ubeswap/sdk'
import { ButtonError, ButtonPrimary } from 'components/Button'
import { LightCard } from 'components/Card'
import { AutoColumn, ColumnCenter } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import { PoolCard } from 'components/earn/PoolCard'
import QuestionHelper from 'components/QuestionHelper'
import Row, { RowBetween, RowFixed, RowFlat } from 'components/Row'
import { useDoTransaction } from 'components/swap/routing'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { ConfirmAddModalBottom } from 'pages/AddLiquidity/ConfirmAddModalBottom'
import { PoolPriceBar } from 'pages/AddLiquidity/PoolPriceBar'
import { CompoundBotSummaryBase } from 'pages/Compound/useCompoundRegistry'
import { Dots } from 'pages/Pool/styleds'
import React, { useCallback, useContext, useState } from 'react'
import { Plus } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import { Field } from 'state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from 'state/mint/hooks'
import { useUserSlippageTolerance } from 'state/user/hooks'
import styled, { ThemeContext } from 'styled-components'
import { TYPE } from 'theme'
import { calculateSlippageAmount, getRouterContract } from 'utils'
import { maxAmountSpend } from 'utils/maxAmountSpend'

import { ROUTER_ADDRESS } from '../../constants'
import { useLPValue } from './useLPValue'

const Container = styled.div<{ $expanded: boolean }>`
  margin-top: ${({ $expanded }) => ($expanded ? '12px' : '0')};
  max-height: ${({ $expanded }) => ($expanded ? '610px' : '0')};
  transition: all 0.2s ${({ $expanded }) => ($expanded ? 'ease-in' : 'ease-out')};
`

const StyledColumnCenter = styled(ColumnCenter)`
  padding-top: 16px;
`

interface Props {
  token0: Token
  token1: Token
  compoundBotSummary: CompoundBotSummaryBase
  userBalance: number
}

export default function LiquidityCard({ token0, token1, compoundBotSummary, userBalance }: Props) {
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)
  const [expanded, setExpanded] = useState(false)
  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // txn values
  const deadline = useTransactionDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users
  const [txHash, setTxHash] = useState('')

  const { address: account, network } = useContractKit()
  const library = useProvider()

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
    liquidityMinted,
  } = useDerivedMintInfo(token0, token1)

  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)
  const doTransaction = useDoTransaction()

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_A], ROUTER_ADDRESS)
  const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_B], ROUTER_ADDRESS)

  const { userValueCUSD: tvlCUSD } = useLPValue(compoundBotSummary.totalLP ?? 0, {
    token0Address: compoundBotSummary.token0Address,
    token1Address: compoundBotSummary.token1Address,
    lpAddress: compoundBotSummary.stakingTokenAddress,
  })

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

  const PoolDetails = (
    <RowBetween padding="8px 0">
      <TYPE.black fontWeight={500}>
        <span>Your stake</span>
      </TYPE.black>

      <RowFixed>
        <>
          <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
            ${userBalance}
          </TYPE.black>
          <QuestionHelper text={`Some explanation of this value`} />
        </>
      </RowFixed>
    </RowBetween>
  )

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
    }
    setTxHash('')
  }, [onFieldAInput, txHash])

  const handleAddLiquidity = () => {
    // do something
    setExpanded((prev) => !prev)
  }

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
    <PoolCard
      token0={token0}
      token1={token1}
      poolTitle={`${token0.symbol}/${compoundBotSummary.token0Name}-${compoundBotSummary.token1Name} ${token1.symbol} LP`}
      buttonLabel={t('addLiquidity')}
      buttonOnPress={handleAddLiquidity}
      buttonActive={expanded}
      tvlCUSD={tvlCUSD}
      tvlCUSDInfo={t('farmBotTVLInfo')}
      PoolDetails={PoolDetails}
    >
      <Container $expanded={expanded}>
        <TransactionConfirmationModal
          isOpen={showConfirm}
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
        <CurrencyInputPanel
          value={formattedAmounts[Field.CURRENCY_A]}
          onUserInput={onFieldAInput}
          onMax={() => {
            if (currencies[Field.CURRENCY_A]?.address === CELO[chainId as unknown as UbeswapChainId].address) {
              onFieldAInput(Math.max(Number(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '') - 0.01, 0).toString())
            } else {
              onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')
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
            onClick={() => {
              setShowConfirm(true)
            }}
            disabled={!!error || approvalA !== ApprovalState.APPROVED || approvalB !== ApprovalState.APPROVED}
            error={!!error && !!parsedAmounts[Field.CURRENCY_A] && !!parsedAmounts[Field.CURRENCY_B]}
          >
            {error ?? 'Supply'}
          </ButtonError>
        </RowBetween>
      </Container>
    </PoolCard>
  )
}
