import { ChainId, useContractKit, useProvider } from '@celo-tools/use-contractkit'
import BN from 'bn.js';
import React, { useCallback, useContext, useState } from 'react'
import { CompoundBotSummary } from 'pages/Compound/useCompoundRegistry'
import { useLPValue } from 'pages/Earn/useLPValue'
import { useDoTransaction } from 'components/swap/routing'
import { AutoColumn, ColumnCenter } from '../Column'
import { Text } from 'rebass'
import { ButtonError, ButtonLight, ButtonPrimary } from '../../components/Button'
import styled, { useTheme } from 'styled-components'
import { Break, CardNoise } from '../earn/styled'
import DoubleCurrencyLogo from '../DoubleLogo'
import { useToken } from 'hooks/Tokens'
import { StyledInternalLink, TYPE } from '../../theme'
import PoolStatRow from '../earn/PoolStats/PoolStatRow'
import { fromWei, toBN, toWei } from 'web3-utils'
import { useStakingPoolValue } from 'pages/Earn/useStakingPoolValue'
import { usePair } from '../../data/Reserves'
import { usePairStakingInfo } from 'state/stake/useStakingInfo'
import { gql, useQuery } from '@apollo/client'
import { useAnnualRewardDollars } from 'state/stake/useAnnualRewardDollars'
import useStakingInfo from 'state/stake/useStakingInfo'
import { CELO, cUSD, Fraction, TokenAmount, TradeType } from '@ubeswap/sdk'
import { useCUSDPrices } from 'utils/useCUSDPrice'
import Row, { RowBetween, RowFixed, RowFlat } from '../Row'
import { Percent } from '@ubeswap/sdk'
import CurrencyInputPanel from '../CurrencyInputPanel'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { Dots } from 'pages/Pool/styleds'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import { ConfirmAddCompoundModalBottom } from './ConfirmAddCompoundModalBottom'
import { ConfirmWithdrawCompoundModalBottom } from './ConfirmWithdrawCompoundModalBottom'
import { getContract } from '../../utils'
import farmBotAbi from '../../constants/abis/FarmBot.json'

interface Props {
  compoundBotSummary: CompoundBotSummary
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
  ${({ theme }) => theme.mediaWidth.upToSmall`
display: none;
`};
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
  display: grid;
  grid-template-columns: 48px 1fr 120px;
  grid-gap: 0px;
  align-items: center;
  padding: 1rem;
  z-index: 1;
  ${({ theme }) => theme.mediaWidth.upToSmall`
grid-template-columns: 48px 1fr 96px;
`};
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

export const CompoundCard: React.FC<Props> = ({ compoundBotSummary }: Props) => {
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
    token0Address: compoundBotSummary.token0Address,
    token1Address: compoundBotSummary.token1Address,
    lpAddress: compoundBotSummary.stakingTokenAddress
  }

  const { userValueCUSD } = useLPValue(
    compoundBotSummary.amountUserLP,
    farmSummary
  )

  const isStaking = compoundBotSummary.amountUserLP > 0

  const farmBotToken = useToken(compoundBotSummary.address) || undefined
  const stakingToken = useToken(compoundBotSummary.stakingTokenAddress) || undefined
  const userBalance = useCurrencyBalance(account ?? undefined, stakingToken ?? undefined)
  const userLPOwned = userBalance?.numerator / userBalance?.denominator
  console.log(userBalance)
  const rewardsToken = useToken(compoundBotSummary.rewardsAddress) || undefined
  const token0 = useToken(compoundBotSummary.token0Address) || undefined
  const token1 = useToken(compoundBotSummary.token1Address) || undefined

  const [, stakingTokenPair] = usePair(token0, token1)

  console.log(stakingTokenPair)
  const amountStakedToken0 = stakingTokenPair?.tokenAmounts[0]?.numerator / stakingTokenPair?.tokenAmounts[0]?.denominator
  const amountStakedToken1 = stakingTokenPair?.tokenAmounts[1]?.numerator / stakingTokenPair?.tokenAmounts[1]?.denominator

  const cusdPrices = useCUSDPrices([token0, token1, rewardsToken])
  const token0Price = cusdPrices[0]?.numerator / cusdPrices[0]?.denominator
  const token1Price = cusdPrices[1]?.numerator / cusdPrices[1]?.denominator
  const rewardsTokenPrice = cusdPrices[2]?.numerator / cusdPrices[2]?.denominator

  console.log(token0Price, amountStakedToken0, token1Price, amountStakedToken1)
  const totalStakedCUSD = token0Price * amountStakedToken0 + token1Price * amountStakedToken1

  const CUSDPerStakedLP = totalStakedCUSD / fromWei(compoundBotSummary.totalLPSupply)

  const stakedCUSDInFarm = fromWei(compoundBotSummary.totalLPInFarm) * CUSDPerStakedLP

  const farmbotStakedCUSDValue = fromWei(compoundBotSummary.totalLP) * CUSDPerStakedLP
  const userStakedCUSDValue = fromWei(compoundBotSummary.amountUserLP) * CUSDPerStakedLP

  const yearlyRewards = fromWei(compoundBotSummary.rewardsRate)*60*60*24*365
  const yearlyRewardsValue = yearlyRewards * rewardsTokenPrice

  let rewardApr, compoundedAPY
  try {
    rewardApr = new Percent(Math.round(yearlyRewardsValue), Math.round(stakedCUSDInFarm))
    console.log(yearlyRewardsValue, stakedCUSDInFarm)
    const compoundsPerYear = 365*24
    compoundedAPY = annualizedPercentageYield(rewardApr, compoundsPerYear)
  } catch (e) {
  }

  const displayedAPY = compoundedAPY ? `${Number(compoundedAPY).toFixed(2)}%` : `-`


  const [approvalDeposit, approveDepositCallback] = useApproveCallback(
    userBalance,
    compoundBotSummary.address
  )

  const doTransaction = useDoTransaction()
  const farmBot = getContract(compoundBotSummary.address, farmBotAbi.abi, library, account)


  console.log(compoundBotSummary.amountUserFP, 'FPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP')
  console.log(compoundedAPY, rewardApr)
  console.log(yearlyRewardsValue)
  console.log(totalStakedCUSD)
  console.log(CUSDPerStakedLP)
  console.log(farmbotStakedCUSDValue)
  console.log(userStakedCUSDValue)
  console.log(stakingTokenPair)
  // const rewardToken = useToken(compoundBotSummary.rewardsAddress) || undefined
  // //const annualFarmRewards = useAnnualRewardDollars([rewardToken], compoundBotSummary.rewardsRate)
  // console.log(useStakingInfo)
  // const stakingInfo = useStakingInfo(null, compoundBotSummary.stakingRewardsAddress)
  // console.log(stakingInfo)
  // const stakingPoolValue = useStakingPoolValue(stakingInfo, stakingTokenPair)

  // //const singleStakingInfo = usePairStakingInfo(stakingTokenPair)
  // console.log(stakingTokenPair)
  // //console.log(annualFarmRewards)
  // console.log(stakingPoolValue)

  const FPMinted = depositValue * compoundBotSummary.exchangeRate
  const LPReceived = withdrawValue ? Number(fromWei(withdrawValue)) / compoundBotSummary.totalFP * compoundBotSummary.totalLP : 0

  const pendingText = `Supplying ${depositValue} LP in exchange for ${FPMinted} FP`
  const pendingWithdrawText = `Depositing ${withdrawValue} FP in exchange for ${LPReceived} LP`

  async function onAdd() {
    try {
      const response = await doTransaction(farmBot, 'deposit', {
        args: [
          toWei(Number(depositValue).toString())
        ]
      })

    } catch (e) {

    }
  }

  async function onWithdraw() {
    try {

      if (new BN(withdrawValue).gt(new BN(compoundBotSummary.amountUserFP).mul(new BN(99)).div(new BN(100)))) {
        const response = await doTransaction(farmBot, 'withdrawAll', {
          args: []
        })
      } else {
        const response = await doTransaction(farmBot, 'withdraw', {
          args: [
            withdrawValue.toString(),
          ]
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
          <Text fontSize="24px">
            {token0?.symbol + '/' + token1?.symbol + ' FP Tokens'}
          </Text>
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
          <Text fontSize="24px">
            {token0?.symbol + '/' + token1?.symbol + ' LP Tokens'}
          </Text>
        </Row>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    if (depositValue) {
      const tokenAmount = new TokenAmount(stakingToken, toWei(Number(depositValue).toString()).toString())
      return (
        <ConfirmAddCompoundModalBottom
          currency={stakingToken}
          tokenAmount={tokenAmount}
          onAdd={onAdd}
        />
      )
    }
    return
  }

  const modalWithdrawBottom = () => {
    if (withdrawValue) {
      const tokenAmount = new TokenAmount(farmBotToken, Number(withdrawValue))
      return (
        <ConfirmWithdrawCompoundModalBottom
          currency={farmBotToken}
          tokenAmount={tokenAmount}
          onAdd={onWithdraw}
        />
      )
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
        <DoubleCurrencyLogo currency0={token0} currency1={token1} size={24} />
        <PoolInfo style={{ marginLeft: '8px' }}>
          <TYPE.white fontWeight={600} fontSize={[18, 24]}>
            {compoundBotSummary.token0Name}-{compoundBotSummary.token1Name} [Ubeswap]
          </TYPE.white>
        </PoolInfo>
      </TopSection>

      <StatContainer>
        <PoolStatRow
          statName={'Total supply (FP)'}
          statValue={Number(fromWei(compoundBotSummary.totalFP)).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })
                     + ' FP'}
        />
        <PoolStatRow
          statName={'Total supply (LP)'}
          statValue={Number(fromWei(compoundBotSummary.totalLP)).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })
                     + ' LP (' + Number(compoundBotSummary.exchangeRate).toLocaleString(undefined, {
                       maximumFractionDigits: 2,
                     }) + ' FP/LP)'}
        />

        <PoolStatRow
          statName={'TVL (underlying yield farm)'}
          statValue={Number(fromWei(compoundBotSummary.totalLPInFarm)).toLocaleString(undefined, {
            maximumFractionDigits: 3,
          })
                     + ' LP ($' + Number(stakedCUSDInFarm).toLocaleString(undefined, {
                       maximumFractionDigits: 2,
                     })+ ')'}
        />

        <PoolStatRow
          statName={'TVL (in autocompounder)'}
          statValue={Number(fromWei(compoundBotSummary.totalLP)).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })
                     + ' LP ($' + Number(farmbotStakedCUSDValue).toLocaleString(undefined, {
                       maximumFractionDigits: 2,
                     })+ ')'}
        />

        <PoolStatRow
          statName={'Autocompounded APY'}
          statValue={displayedAPY}
        />
        {isStaking && (
          <>
            <Break />
            <BottomSection showBackground={true}>
              {userValueCUSD && (
                <RowBetween>
                  <TYPE.black color={'white'} fontWeight={500}>
                    <span>Your stake</span>
                  </TYPE.black>

                  <RowFixed>
                    <TYPE.black style={{ textAlign: 'right' }} color={'white'} fontWeight={500}>
                      {Number(fromWei(compoundBotSummary.amountUserLP)).toFixed(2)} LP / {Number(fromWei(compoundBotSummary.amountUserFP)).toFixed(2)} FP (${userValueCUSD.toFixed(2, { groupSeparator: ',' })})
                    </TYPE.black>
                  </RowFixed>
                </RowBetween>
              )}
            </BottomSection>
            <Break />
            <ButtonError
              onClick={() => {
                showDeposit ? setShowDeposit(false) : setShowDeposit(true)
              }}
            >
              <Text fontSize={20} fontWeight={500}>
                Deposit
              </Text>
            </ButtonError>
            <ButtonError
              onClick={() => {
                showWithdraw ? setShowWithdraw(false) : setShowWithdraw(true)
              }}
            >
              <Text fontSize={20} fontWeight={500}>
                Withdraw
              </Text>
            </ButtonError>
          </>
        )}
        {!isStaking && (
          <>
            <Break />
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
              <Row>
                <CurrencyInputPanel
                  style={{width: '100%'}}
                  className='depositLiquidity'
                  value={depositValue}
                  onMax={() => {setDepositValue(userLPOwned)}}
                  onUserInput={setDepositValue}
                  showMaxButton={true}
                  currency={stakingToken}
                  id="depositLiquidity"
                  showCommonBases={true}
                  disableCurrencySelect={true}
                />
              </Row>
              <Row>
                <AutoColumn gap="20px">
                  <ButtonPrimary
                    onClick={approveDepositCallback}
                    disabled={approvalDeposit === ApprovalState.PENDING}
                    width={'100%'}
                  >
                    {approvalDeposit === ApprovalState.PENDING ? (
                      <Dots>Approving {stakingToken?.symbol}</Dots>
                    ) : (
                      'Approve ' + stakingToken?.symbol
                    )}
                  </ButtonPrimary>
                  <ButtonError
                    onClick={() => {
                      setShowConfirm(true)
                    }}
                    disabled={approvalDeposit !== ApprovalState.APPROVED}
                    error={false}
                  >
                    <Text fontSize={20} fontWeight={500}>
                      Deposit
                    </Text>
                  </ButtonError>
                </AutoColumn>
              </Row>
            </ColumnCenter>
          </>
        )}
        {showWithdraw &&
         <>
           <ColumnCenter>
             <Row>
               <CurrencyInputPanel
                 style={{width: '100%'}}
                 className='depositLiquidity'
                 value={withdrawValue ? fromWei(withdrawValue) : undefined}
                 onMax={() => {setWithdrawValue(new BN(compoundBotSummary.amountUserFP))}}
                 onUserInput={(val) => {setWithdrawValue(toWei(val))}}
                 showMaxButton={true}
                 currency={farmBotToken}
                 id="depositLiquidity"
                 showCommonBases={true}
                 disableCurrencySelect={true}
               />
             </Row>
             <Row>
               <AutoColumn gap="20px">
                 <ButtonError
                   onClick={() => {
                     setShowWithdrawConfirm(true)
                   }}
                   error={false}
                 >
                   <Text fontSize={20} fontWeight={500}>
                     Withdraw
                   </Text>
                 </ButtonError>
               </AutoColumn>
             </Row>
           </ColumnCenter>
         </>
        }
      </StatContainer>
    </Wrapper>
  )
}
