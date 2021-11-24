import { useContractKit } from '@celo-tools/use-contractkit'
import ERC20_INTERFACE from '../../constants/abis/erc20'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useMultipleContractSingleData } from '../../state/multicall/hooks'
import { AbiItem, fromWei, toBN, toWei } from 'web3-utils'
import farmBotAbi from '../../constants/abis/FarmBot.json'
import { ERC20_ABI } from '../../constants/abis/erc20'
import IUniswapV2Pair from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { useLPValue } from '../Earn/useLPValue'

export type CompoundBotSummary = {
  address: string
  token0Name: string
  token1Name: string
  token0Address: string
  token1Address: string
  amountUserFP: number
  amountUserLP: number
  rewardsAddress: string
  stakingTokenAddress: string
  userLPValue: number
}

const compoundAddresses = [
  "0x5b186b0c5493bdF5F357f170e30020f5498110c4"
]

export const useCompoundRegistry = () => {
  const { address, kit } = useContractKit()
  const [botSummaries, setBotSummaries] = useState<CompoundBotSummary[]>([])

  const call = useCallback(async () => {
    const botSummaries = []
    for (const compounderAddress of compoundAddresses) {
      const farmBot = new kit.web3.eth.Contract(
	farmBotAbi.abi as AbiItem[],
	compounderAddress
      )

      const amountUserFP = await farmBot.methods.balanceOf(address).call()
      const amountUserLP = await farmBot.methods.getLpAmount(amountUserFP).call()

      const stakingTokenAddress = await farmBot.methods.stakingToken().call()
      const stakingTokenContract = new kit.web3.eth.Contract(
	IUniswapV2Pair,
	stakingTokenAddress
      )
      const token0Address = await stakingTokenContract.methods.token0().call()
      const token0Contract = new kit.web3.eth.Contract(
	ERC20_ABI,
	token0Address
      )
      const token0Name = await token0Contract.methods.symbol().call()

      const token1Address = await stakingTokenContract.methods.token1().call()
      const token1Contract = new kit.web3.eth.Contract(
	ERC20_ABI,
	token1Address
      )
      const token1Name = await token1Contract.methods.symbol().call()
      const rewardsAddress = await farmBot.methods.rewardsToken().call()

      botSummaries.push({
	address: compounderAddress,
	token0Name,
	token1Name,
	token0Address,
	token1Address,
	amountUserFP,
	amountUserLP,
	rewardsAddress,
	stakingTokenAddress
      })
    }
    setBotSummaries(botSummaries)
  }, [kit.web3.eth, address])

  useEffect(() => {
    call()
  }, [call])
  return botSummaries
}
