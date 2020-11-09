/* External Imports */
import { ethers } from '@nomiclabs/buidler'

export const getEthTime = async (): Promise<number> => {
  return (await ethers.provider.getBlock('latest')).timestamp
}

export const setEthTime = async (time: number): Promise<void> => {
  await ethers.provider.send('evm_setNextBlockTimestamp', [time])
}

export const increaseEthTime = async (amount: number): Promise<void> => {
  await setEthTime((await getEthTime()) + amount)
  await ethers.provider.send('evm_mine', [])
}
