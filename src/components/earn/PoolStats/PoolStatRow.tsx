import { LightQuestionHelper } from 'components/QuestionHelper'
import { RowBetween, RowFixed } from 'components/Row'
import React from 'react'
import { TYPE } from 'theme'

export interface PoolRewardProps {
  helperText?: React.ReactNode
  statName: string
  statValue?: string
}

export default function PoolStatRow({ helperText, statName, statValue }: PoolRewardProps) {
  return (
    <RowBetween>
      <RowFixed>
        <TYPE.black>{statName}</TYPE.black>
        {helperText && <LightQuestionHelper text={helperText} />}
      </RowFixed>
      <TYPE.black>{statValue ? statValue : '-'}</TYPE.black>
    </RowBetween>
  )
}
