import { Text } from 'rebass'
import styled from 'styled-components'
import { borderRadius } from 'theme'

export const Wrapper = styled.div`
  position: relative;
  padding: 1rem;
`

export const ClickableText = styled(Text)`
  :hover {
    cursor: pointer;
  }
  color: ${({ theme }) => theme.primary1};
`
export const MaxButton = styled.button<{ width: string }>`
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.primary3};
  border: 2px solid ${({ theme }) => theme.primary3};
  border-radius: ${borderRadius}px;
  font-size: 1rem;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding: 0.25rem 0.5rem;
  `};
  font-weight: 500;
  cursor: pointer;
  margin: 0.25rem;
  overflow: hidden;
  color: ${({ theme }) => theme.bg2};
  :hover {
    border: 2px solid ${({ theme }) => theme.primary2};
  }
  :focus {
    border: 2px solid ${({ theme }) => theme.primary2};
    outline: none;
  }
`

export const Dots = styled.span`
  &::after {
    display: inline-block;
    animation: ellipsis 1.25s infinite;
    content: '.';
    width: 1em;
    text-align: left;
  }
  @keyframes ellipsis {
    0% {
      content: '.';
    }
    33% {
      content: '..';
    }
    66% {
      content: '...';
    }
  }
`
