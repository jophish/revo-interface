import { ChainId, useContractKit } from '@celo-tools/use-contractkit'
import { CELO, ChainId as UbeswapChainId } from '@ubeswap/sdk'
import { NETWORK_CHAIN_ID } from 'connectors'
import { darken } from 'polished'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Text } from 'rebass'
import { useTokenBalance } from 'state/wallet/hooks'
import styled from 'styled-components'
import { borderRadius } from 'theme'

import Icon from '../../assets/images/revo-logo.png'
import Menu from '../Menu'
import { RowFixed } from '../Row'
import Web3Status from '../Web3Status'

const HeaderFrame = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px;
  align-items: center;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  width: 100%;
  top: 0;
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 1rem;
  z-index: 2;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    padding: 0 1rem;
    width: calc(100%);
    position: relative;
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    padding: 0.5rem 1rem;
  `}
`

const HeaderControls = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-self: flex-end;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex-direction: row;
    justify-content: space-between;
    justify-self: center;
    width: 100%;
    max-width: 960px;
    padding: 1rem;
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: 100%;
    z-index: 99;
    height: 72px;
    border-radius: 4px 4px 0 0;
    background-color: ${({ theme }) => theme.bg1};
    box-shadow: 0px 0px 20px 0px rgba(0,0,0,0.2)
`};
`

const HeaderElement = styled.div`
  display: flex;
  align-items: center;

  /* addresses safari's lack of support for "gap" */
  & > *:not(:first-child) {
    margin-left: 8px;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
flex-direction: row-reverse;
align-items: center;
`};
`

const HeaderRow = styled(RowFixed)`
  ${({ theme }) => theme.mediaWidth.upToMedium`
width: 100%;
`};
`

const AccountElement = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme, active }) => (!active ? theme.bg1 : theme.bg3)};
  border-radius: 12px;
  white-space: nowrap;
  width: 100%;
  cursor: pointer;

  :focus {
    border: 1px solid blue;
  }
`

const HideSmall = styled.span`
  ${({ theme }) => theme.mediaWidth.upToSmall`
display: none;
`};
`

const NetworkCard = styled.div`
  border-radius: ${borderRadius}px;
  padding: 8px 12px;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  border: 1px solid ${({ theme }) => theme.yellow2};
  color: ${({ theme }) => theme.yellow2};
  font-weight: 500;
  opacity: 0.6;
`

const BalanceText = styled(Text)`
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
display: none;
`};
`

const Title = styled(NavLink)`
  display: flex;
  align-items: center;
  pointer-events: auto;
  justify-self: flex-start;
  margin-right: 12px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
justify-self: center;
`};
  :hover {
    cursor: pointer;
  }
`

export const StyledMenuButton = styled.button`
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 35px;
  background-color: ${({ theme }) => theme.bg3};
  margin-left: 8px;
  padding: 0.15rem 0.5rem;
  border-radius: 0.5rem;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }

  svg {
    margin-top: 2px;
  }
  > * {
    stroke: ${({ theme }) => theme.text1};
  }
`

const HeaderElementWrap = styled.div`
  display: flex;
  align-items: center;
`

const Logo = styled.img`
  height: 54px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    height: 42px;
  `};
`

const activeClassName = 'ACTIVE'

const StyledNavLink = styled(NavLink).attrs({
  activeClassName,
})`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.text2};
  font-size: 1rem;
  width: fit-content;
  margin: 0 12px;
  font-weight: 500;

  &.${activeClassName} {
    border-radius: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.text1};
  }

  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text1)};
  }

  @media (max-width: 320px) {
    margin: 0 8px;
  }
`

const NETWORK_LABELS: { [chainId in ChainId]?: string } = {
  [ChainId.CeloMainnet]: 'Celo',
  [ChainId.Alfajores]: 'Alfajores',
  [ChainId.Baklava]: 'Baklava',
}

const chainId = NETWORK_CHAIN_ID

export default function Header() {
  const { address: account } = useContractKit()
  const { t } = useTranslation()

  const userCELOBalance = useTokenBalance(account ?? undefined, CELO[chainId as unknown as UbeswapChainId])

  return (
    <HeaderFrame>
      <HeaderRow>
        <Title to="/">
          <Logo src={Icon} alt="Revo.Finance" />
        </Title>
        <StyledNavLink id="swap-nav-link" to="/zap">
          {t('headerZap')}
        </StyledNavLink>
        <StyledNavLink id="compound-nav-link" to="/farm">
          {t('headerFarms')}
        </StyledNavLink>
      </HeaderRow>
      <HeaderControls>
        <HeaderElement>
          <HideSmall>
            {NETWORK_LABELS[chainId] && (
              <NetworkCard title={NETWORK_LABELS[chainId]}>{NETWORK_LABELS[chainId]}</NetworkCard>
            )}
          </HideSmall>

          <AccountElement active={!!account} style={{ pointerEvents: 'auto' }}>
            {account && userCELOBalance ? (
              <BalanceText style={{ flexShrink: 0 }} pl="0.75rem" pr="0.5rem" fontWeight={500}>
                {userCELOBalance?.toFixed(2, { groupSeparator: ',' }) ?? '0.00'} CELO
              </BalanceText>
            ) : null}
            <Web3Status />
          </AccountElement>
        </HeaderElement>
        <HeaderElementWrap>
          <Menu />
        </HeaderElementWrap>
      </HeaderControls>
    </HeaderFrame>
  )
}
