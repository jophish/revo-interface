import { useContractKit } from '@celo-tools/use-contractkit'
import { Token, TokenAmount } from '@ubeswap/sdk'
import Loader from 'components/Loader'
import QuestionHelper from 'components/QuestionHelper'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { borderRadius, TYPE } from '../../theme'
import { ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import DoubleCurrencyLogo from '../DoubleLogo'
import Row, { RowBetween, RowFixed } from '../Row'

const Wrapper = styled(AutoColumn)<{ showBackground: boolean }>`
  border-radius: ${borderRadius}px;
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 16px;
  background: ${({ theme }) => theme.bg1};
  min-height: 110px;
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

const TopSection = styled.div`
  display: flex;
  flex-direction: row;
  padding-bottom: 1rem;
  gap: 12px;
  z-index: 1;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
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

interface Props {
  token0?: Token
  token1?: Token
  poolTitle: string
  APY?: string
  APYInfo?: string
  buttonLabel: string
  buttonOnPress: () => void
  buttonActive: boolean
  tvlCUSD?: TokenAmount
  tvlCUSDInfo: string
  children: React.ReactNode
  PoolDetails?: React.ReactNode
}

export const PoolCard: React.FC<Props> = ({
  token0,
  token1,
  poolTitle,
  APY,
  APYInfo,
  buttonLabel,
  buttonOnPress,
  buttonActive,
  tvlCUSD,
  tvlCUSDInfo,
  children,
  PoolDetails,
}: Props) => {
  const { t } = useTranslation()
  const { address } = useContractKit()

  if (!token0 || !token1) {
    return (
      <Wrapper showBackground>
        <Loader centered size="24px" />
      </Wrapper>
    )
  }

  return (
    <Wrapper showBackground>
      <TopSection>
        <Row width="auto">
          <DoubleCurrencyLogo currency0={token0} currency1={token1} size={24} />
          <PoolInfo style={{ marginLeft: '8px' }}>
            <TYPE.black fontWeight={600} fontSize={[18, 24]}>
              {poolTitle}
            </TYPE.black>
            {APY && (
              <TYPE.darkGray style={{ display: 'flex' }}>
                <TYPE.small className="apy" fontWeight={400} fontSize={14} paddingTop={'0.2rem'}>
                  APY: {APY}
                </TYPE.small>
                <QuestionHelper text={APYInfo} />
              </TYPE.darkGray>
            )}
          </PoolInfo>
        </Row>

        {/* TODO show the connect wallet button */}
        {address && (
          <ButtonPrimary
            width="auto"
            onClick={buttonOnPress}
            inverse={!buttonActive}
            padding="8px 20px"
            maxHeight="40px"
          >
            {buttonLabel}
          </ButtonPrimary>
        )}
      </TopSection>

      <RowBetween padding="8px 0">
        <TYPE.black fontWeight={500}>
          <span>{t('totalDeposited')}</span>
        </TYPE.black>

        <RowFixed>
          {tvlCUSD ? (
            <>
              <TYPE.black style={{ textAlign: 'right' }} fontWeight={500}>
                {Number(tvlCUSD.toFixed(2)).toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                })}
              </TYPE.black>
              <QuestionHelper text={tvlCUSDInfo} />
            </>
          ) : (
            <Loader centered size="24px" />
          )}
        </RowFixed>
      </RowBetween>

      {PoolDetails}

      {children}
    </Wrapper>
  )
}
