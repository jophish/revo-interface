import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { Percent } from '@ubeswap/sdk'
import BN from 'bn.js'
import { useDoTransaction } from 'components/swap/routing'
import { useToken } from 'hooks/Tokens'
import { FarmBotSummary } from 'pages/Compound/useCompoundRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import { Dots } from 'pages/Pool/styleds'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import styled, { useTheme } from 'styled-components'
import { useCUSDPrices } from 'utils/useCUSDPrice'
import { fromWei, toWei } from 'web3-utils'

import { ButtonError } from '../../components/Button'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import { usePair } from '../../data/Reserves'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { TYPE } from '../../theme'
import { getContract } from '../../utils'
import { AutoColumn, ColumnCenter } from '../Column'
import CurrencyInputPanel from '../CurrencyInputPanel'
import PoolStatRow from '../earn/PoolStats/PoolStatRow'
import { Break, CardNoise, DataCard } from '../earn/styled'
import Row, { AutoRow, RowBetween, RowFixed, RowFlat } from '../Row'
import { ConfirmAddCompoundModalBottom } from './ConfirmAddCompoundModalBottom'
import { ConfirmWithdrawCompoundModalBottom } from './ConfirmWithdrawCompoundModalBottom'

interface Props {
  farmBotSummary: FarmBotSummary
}

// formula is 1 + ((nom/compoundsPerYear)^compoundsPerYear) - 1
function annualizedPercentageYield(nominal: Percent, compounds: number) {
  const ONE = 1

  const divideNominalByNAddOne = Number(nominal.divide(BigInt(compounds)).add(BigInt(ONE)).toFixed(10))

  // multiply 100 to turn decimal into percent, to fixed since we only display integer
  return ((divideNominalByNAddOne ** compounds - ONE) * 100).toFixed(0)
}

const BottomSection = styled.div<{ showBackground: boolean }>`
  padding: 12px 16px;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '0.4')};
  border-radius: 0 0 12px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  z-index: 1;
`

const StatContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1rem;
  margin-right: 1rem;
  margin-left: 1rem;
};
`

const DepositApprove = styled.div`
  .depositLiquidity {
    width: 100%;
  }
  #depositLiquidity {
    width: 100%;
  }
`

const PoolInfo = styled.div`
  .apr {
    margin-top: 4px;
    display: none;
    ${({ theme }) => theme.mediaWidth.upToSmall`
display: block;
`}
  }
`

const TopSection = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  z-index: 1;
};
`

const VoteCard = styled(DataCard)`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #27ae60 0%, #222 100%);
  overflow: hidden;
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  border-radius: 12px;
  width: 100%;
  overflow: hidden;
  position: relative;
  background: ${({ bgColor }) => `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%, #212429 100%) `};
  color: ${({ theme, showBackground }) => (showBackground ? theme.white : theme.text1)} !important;
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
      0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

export const CompoundCard: React.FC<Props> = ({ farmBotSummary }: Props) => {
  const { t } = useTranslation()
  const { address: account } = useContractKit()
  const [showDeposit, setShowDeposit] = useState<boolean>(false)
  const [showWithdraw, setShowWithdraw] = useState<boolean>(false)

  const library = useProvider()

  const [depositValue, setDepositValue] = useState<string>(undefined)
  const [withdrawValue, setWithdrawValue] = useState<string>(undefined)

  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<boolean>(false)

  const theme = useTheme()
  const farmSummary = {
    token0Address: farmBotSummary.token0Address,
    token1Address: farmBotSummary.token1Address,
    lpAddress: farmBotSummary.stakingTokenAddress,
  }

  const { userValueCUSD } = useLPValue(farmBotSummary.amountUserLP, farmSummary)

  const isStaking = farmBotSummary.amountUserLP > 0

  const farmBotToken = useToken(farmBotSummary.address) || undefined
  const stakingToken = useToken(farmBotSummary.stakingTokenAddress) || undefined
  const userBalance = useCurrencyBalance(account ?? undefined, stakingToken ?? undefined)
  const userLPOwned = userBalance?.numerator / userBalance?.denominator

  const rewardsToken = useToken(farmBotSummary.rewardsAddress) || undefined
  const token0 = useToken(farmBotSummary.token0Address) || undefined
  const token1 = useToken(farmBotSummary.token1Address) || undefined

  const [, stakingTokenPair] = usePair(token0, token1)

  const amountStakedToken0 =
    stakingTokenPair?.tokenAmounts[0]?.numerator / stakingTokenPair?.tokenAmounts[0]?.denominator
  const amountStakedToken1 =
    stakingTokenPair?.tokenAmounts[1]?.numerator / stakingTokenPair?.tokenAmounts[1]?.denominator

  const cusdPrices = useCUSDPrices([token0, token1, rewardsToken])
  const token0Price = cusdPrices[0]?.numerator / cusdPrices[0]?.denominator
  const token1Price = cusdPrices[1]?.numerator / cusdPrices[1]?.denominator
  const rewardsTokenPrice = cusdPrices[2]?.numerator / cusdPrices[2]?.denominator

  console.log(token0Price, amountStakedToken0, token1Price, amountStakedToken1)
  const totalStakedCUSD = token0Price * amountStakedToken0 + token1Price * amountStakedToken1

  const CUSDPerStakedLP = totalStakedCUSD / fromWei(farmBotSummary.totalLPSupply)

  const stakedCUSDInFarm = fromWei(farmBotSummary.totalLPInFarm) * CUSDPerStakedLP

  const farmbotStakedCUSDValue = fromWei(farmBotSummary.totalLP) * CUSDPerStakedLP
  const userStakedCUSDValue = fromWei(farmBotSummary.amountUserLP) * CUSDPerStakedLP

  const yearlyRewards = fromWei(farmBotSummary.rewardsRate) * 60 * 60 * 24 * 365
  const yearlyRewardsValue = yearlyRewards * rewardsTokenPrice

  let rewardApr, compoundedAPY
  try {
    rewardApr = new Percent(Math.round(yearlyRewardsValue), Math.round(stakedCUSDInFarm))
    console.log(yearlyRewardsValue, stakedCUSDInFarm)
    const compoundsPerYear = 365 * 24
    compoundedAPY = annualizedPercentageYield(rewardApr, compoundsPerYear)
  } catch (e) {
    console.log('error calculating rewards apy')
  }

  const displayedAPY = compoundedAPY ? `${Number(compoundedAPY).toFixed(2)}%` : `-`

  const [approvalDeposit, approveDepositCallback] = useApproveCallback(userBalance, farmBotSummary.address)

  const doTransaction = useDoTransaction()
  const farmBot = getContract(farmBotSummary.address, farmBotAbi.abi, library, account)

  console.log(approvalDeposit, ApprovalState.APPROVED)
  console.log(approvalDeposit === ApprovalState.APPROVED)

  const FPMinted = farmBotSummary.exchangeRate ? depositValue / farmBotSummary.exchangeRate : depositValue
  const LPReceived = withdrawValue ? Number(fromWei(withdrawValue)) * farmBotSummary.exchangeRate : 0

  const pendingText = `Supplying ${depositValue} LP in exchange for ${FPMinted} FP`
  const pendingWithdrawText = `Depositing ${withdrawValue} FP in exchange for ${LPReceived} LP`
  const exchangeRateString = farmBotSummary.exchangeRate
    ? ' LP (' + Number(farmBotSummary.exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' FP/LP)'
    : ''

  async function onAdd() {
    try {
      const response = await doTransaction(farmBot, 'deposit', {
        args: [toWei(Number(depositValue).toString())],
      })
    } catch (e) {
      console.log('failed depositing into farmbot')
    }
  }

  async function onWithdraw() {
    try {
      if (new BN(withdrawValue).gt(new BN(farmBotSummary.amountUserFP).mul(new BN(99)).div(new BN(100)))) {
        const response = await doTransaction(farmBot, 'withdrawAll', {
          args: [],
        })
      } else {
        const response = await doTransaction(farmBot, 'withdraw', {
          args: [withdrawValue.toString()],
        })
      }
    } catch (e) {
      console.log(withdrawValue)
      console.log(e)
    }
  }

  const modalHeader = () => {
    return (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {FPMinted}
          </Text>
        </RowFlat>
        <Row>
          <Text fontSize="24px">{token0?.symbol + '/' + token1?.symbol + ' FP Tokens'}</Text>
        </Row>
      </AutoColumn>
    )
  }

  const modalWithdrawHeader = () => {
    return (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {LPReceived}
          </Text>
        </RowFlat>
        <Row>
          <Text fontSize="24px">{token0?.symbol + '/' + token1?.symbol + ' LP Tokens'}</Text>
        </Row>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    if (depositValue) {
      const tokenAmount = new TokenAmount(stakingToken, toWei(Number(depositValue).toString()).toString())
      return <ConfirmAddCompoundModalBottom currency={stakingToken} tokenAmount={tokenAmount} onAdd={onAdd} />
    }
    return
  }

  const modalWithdrawBottom = () => {
    if (withdrawValue) {
      const tokenAmount = new TokenAmount(farmBotToken, Number(withdrawValue))
      return <ConfirmWithdrawCompoundModalBottom currency={farmBotToken} tokenAmount={tokenAmount} onAdd={onWithdraw} />
    }
    return
  }

  return (
    <Wrapper showBackground={isStaking} bgColor={theme.primary1}>
      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={() => setShowConfirm(false)}
        attemptingTxn={attemptingTxn}
        content={() => (
          <ConfirmationModalContent
            title={'You will receive'}
            onDismiss={() => setShowConfirm(false)}
            topContent={modalHeader}
            bottomContent={modalBottom}
          />
        )}
        pendingText={pendingText}
      />

      <TransactionConfirmationModal
        isOpen={showWithdrawConfirm}
        onDismiss={() => setShowWithdrawConfirm(false)}
        attemptingTxn={attemptingTxn}
        content={() => (
          <ConfirmationModalContent
            title={'You will receive'}
            onDismiss={() => setShowConfirm(false)}
            topContent={modalWithdrawHeader}
            bottomContent={modalWithdrawBottom}
          />
        )}
        pendingText={pendingWithdrawText}
      />
      <CardNoise />

      <TopSection>
        {/* commenting out currency logo since we don't have one*/}
        {/* <DoubleCurrencyLogo currency0={token0} currency1={token1} size={24} /> */}
        <PoolInfo style={{ marginLeft: '8px' }}>
          <TYPE.white fontWeight={800} fontSize={[22, 24]}>
            {farmBotSummary.token0Name}-{farmBotSummary.token1Name}
          </TYPE.white>
        </PoolInfo>
      </TopSection>

      <StatContainer>
        {/* <PoolStatRow
          statName={'Total supply (FP)'}
          statValue={
            Number(fromWei(farmBotSummary.totalFP)).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            }) + ' FP'
          }
        />
        <PoolStatRow
          statName={'Total supply (LP)'}
          statValue={
            Number(fromWei(farmBotSummary.totalLP)).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            }) + exchangeRateString
          }
        /> */}

        <PoolStatRow
          statName={'TVL'}
          helperText={'Total value locked in underlying yield farm'}
          statValue={
            Number(fromWei(farmBotSummary.totalLPInFarm)).toLocaleString(undefined, {
              maximumFractionDigits: 3,
            }) +
            ' LP ($' +
            Number(stakedCUSDInFarm).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            }) +
            ')'
          }
        />
        {/*
        <PoolStatRow
          statName={'TVL (in autocompounder)'}
          statValue={
            Number(fromWei(farmBotSummary.totalLP)).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            }) +
            ' LP ($' +
            Number(farmbotStakedCUSDValue).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            }) +
            ')'
          }
        /> */}

        <PoolStatRow statName={'APY'} statValue={displayedAPY} helperText={'APY is autocompounded'} />
        {isStaking && (
          <>
            <Break />
            <BottomSection showBackground={true}>
              {userValueCUSD && (
                <RowBetween>
                  <TYPE.black color={'white'} fontWeight={500}>
                    <span>Total Deposited</span>
                  </TYPE.black>

                  <RowFixed>
                    <TYPE.black style={{ textAlign: 'right' }} color={'white'} fontWeight={500}>
                      (${userValueCUSD.toFixed(2, { groupSeparator: ',' })})
                    </TYPE.black>
                  </RowFixed>
                </RowBetween>
              )}
            </BottomSection>
            <Break />
            <AutoRow padding="10px" justify="space-around">
              <ButtonError
                width="45%"
                onClick={() => {
                  showDeposit ? setShowDeposit(false) : setShowDeposit(true)
                  setShowWithdraw(false)
                }}
              >
                <Text fontSize={20} fontWeight={500}>
                  Deposit
                </Text>
              </ButtonError>
              <ButtonError
                width="45%"
                onClick={() => {
                  showWithdraw ? setShowWithdraw(false) : setShowWithdraw(true)
                  setShowDeposit(false)
                }}
              >
                <Text fontSize={20} fontWeight={500}>
                  Withdraw
                </Text>
              </ButtonError>
            </AutoRow>
          </>
        )}
        {!isStaking && (
          <>
            <ButtonError
              onClick={() => {
                showDeposit ? setShowDeposit(false) : setShowDeposit(true)
              }}
            >
              <Text fontSize={20} fontWeight={500}>
                Deposit
              </Text>
            </ButtonError>
          </>
        )}
        {showDeposit && (
          <>
            <ColumnCenter>
              <Row padding="10px">
                <CurrencyInputPanel
                  style={{ width: '100%' }}
                  className="depositLiquidity"
                  value={depositValue}
                  onMax={() => {
                    setDepositValue(userLPOwned)
                  }}
                  onUserInput={setDepositValue}
                  showMaxButton={true}
                  currency={stakingToken}
                  id="depositLiquidity"
                  showCommonBases={true}
                  disableCurrencySelect={true}
                />
              </Row>
              <AutoRow justify="space-between" padding="20px">
                <ButtonError
                  onClick={approveDepositCallback}
                  disabled={approvalDeposit === ApprovalState.PENDING || approvalDeposit === ApprovalState.APPROVED}
                  width="45%"
                >
                  {approvalDeposit === ApprovalState.PENDING ? (
                    <Dots>Approving {stakingToken?.symbol}</Dots>
                  ) : approvalDeposit === ApprovalState.APPROVED ? (
                    'ULP Approved!'
                  ) : (
                    'Approve ' + stakingToken?.symbol
                  )}
                </ButtonError>
                <ButtonError
                  width="45%"
                  onClick={() => {
                    setShowConfirm(true)
                  }}
                  disabled={approvalDeposit !== ApprovalState.APPROVED || !depositValue}
                  error={false}
                >
                  <Text>Deposit</Text>
                </ButtonError>
              </AutoRow>
            </ColumnCenter>
          </>
        )}
        {showWithdraw && (
          <>
            <ColumnCenter>
              <Row padding="10px">
                <CurrencyInputPanel
                  style={{ width: '100%' }}
                  className="depositLiquidity"
                  value={withdrawValue ? fromWei(withdrawValue) : undefined}
                  onMax={() => {
                    setWithdrawValue(new BN(farmBotSummary.amountUserFP))
                  }}
                  onUserInput={(val) => {
                    setWithdrawValue(toWei(val))
                  }}
                  showMaxButton={true}
                  currency={farmBotToken}
                  id="depositLiquidity"
                  showCommonBases={true}
                  disableCurrencySelect={true}
                />
              </Row>
              <Row padding="10px">
                <ButtonError
                  width="100%"
                  onClick={() => {
                    setShowWithdrawConfirm(true)
                  }}
                  error={false}
                  disabled={!withdrawValue}
                >
                  <Text fontSize={20} fontWeight={500}>
                    Withdraw
                  </Text>
                </ButtonError>
              </Row>
            </ColumnCenter>
          </>
        )}
      </StatContainer>
    </Wrapper>
  )
}
