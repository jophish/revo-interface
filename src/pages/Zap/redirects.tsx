import React from 'react'
import { Redirect, RouteComponentProps } from 'react-router-dom'

// Redirects to zap but only replace the pathname
export function RedirectPathToZapOnly({ location }: RouteComponentProps) {
  return <Redirect to={{ ...location, pathname: '/zap' }} />
}
