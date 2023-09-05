export const FarmInfoEventABI = {
  inputs: [
    {
      indexed: true,
      internalType: 'address',
      name: 'stakingAddress',
      type: 'address',
    },
    {
      indexed: true,
      internalType: 'bytes32',
      name: 'farmName',
      type: 'bytes32',
    },
    {
      indexed: true,
      internalType: 'address',
      name: 'lpAddress',
      type: 'address',
    },
  ],
  name: 'FarmInfo',
  type: 'event',
} as const

export const LPInfoEventABI = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: 'address',
      name: 'lpAddress',
      type: 'address',
    },
    {
      indexed: true,
      internalType: 'address',
      name: 'token0Address',
      type: 'address',
    },
    {
      indexed: true,
      internalType: 'address',
      name: 'token1Address',
      type: 'address',
    },
  ],
  name: 'LPInfo',
  type: 'event',
} as const

export const FarmDataEventABI = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: 'address',
      name: 'stakingAddress',
      type: 'address',
    },
    {
      indexed: true,
      internalType: 'uint256',
      name: 'tvlUSD',
      type: 'uint256',
    },
    {
      indexed: true,
      internalType: 'uint256',
      name: 'rewardsUSDPerYear',
      type: 'uint256',
    },
  ],
  name: 'FarmData',
  type: 'event',
} as const
