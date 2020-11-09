import { expect } from '../setup'

/* External Imports */
import { ethers } from 'hardhat'
import { Signer, ContractFactory, Contract } from 'ethers'
import { initCrossDomainMessengers, relayL1ToL2Messages, relayL2ToL1Messages } from '@eth-optimism/ovm-toolchain'
import { assert } from 'console'

/* Internal Imports */
//import { increaseEthTime } from '../helpers'

const l1ToL2MessageDelay = 0 //5 * 60 //5 minutes
const l2ToL1MessageDelay = 0 //60 * 60 * 24 * 7 //1 week

describe('EOA L1 <-> L2 Message Passing', () => {
  let AliceL1Wallet: Signer
  let BobL1Wallet: Signer
  let MalloryL1Wallet: Signer
  before(async () => {
    ;[signer] = await ethers.getSigners()
  })

  let signer: Signer
  before(async () => {
    ;[signer] = await ethers.getSigners()
  })

  let L1_CrossDomainMessenger: Contract
  let L2_CrossDomainMessenger: Contract
  beforeEach(async () => {
    const messengers = await initCrossDomainMessengers(
      l1ToL2MessageDelay,
      l2ToL1MessageDelay,
      ethers,
      signer
    )

    L1_CrossDomainMessenger = messengers.l1CrossDomainMessenger
    L2_CrossDomainMessenger = messengers.l2CrossDomainMessenger
  })


  let ERC20Factory: ContractFactory
  before(async () => {
    ERC20Factory = await ethers.getContractFactory('L2ReadyERC20')
  })

  let L1ERC20: Contract
  let L2ERC20: Contract
  let L1ERC20Deposit: Contract
  
  beforeEach(async () => {
    const messengers = await initCrossDomainMessengers(
      l1ToL2MessageDelay,
      l2ToL1MessageDelay,
      ethers,
      signer
    )

    L1_CrossDomainMessenger = messengers.l1CrossDomainMessenger
    L2_CrossDomainMessenger = messengers.l2CrossDomainMessenger
  })

  let L1_ERC20: Contract
  let L2_ERC20: Contract
  beforeEach(async () => {
    L1_ERC20 = await ERC20Factory.deploy(
      10000,
      'TEST TOKEN',
      0,
      'TEST'
    )

    L2_ERC20 = await ERC20Factory.deploy(
      10000,
      'TEST TOKEN',
      0,
      'TEST',
    )
    L1ERC20Deposit = await L1ERC20DepositFactory.deploy(
      L1ERC20.address,
      L2ERC20.address,
      L1_CrossDomainMessenger.address
    )

    L2ERC20.init(L2_CrossDomainMessenger.address, L1ERC20Deposit.address);

    await L2_ERC20.init(
      L2_CrossDomainMessenger.address,
      L1_ERC20.address
    )
  })


  describe('deposit and withdrawal', () => {

    it('should allow an EOA to deposit and withdraw between one wallet', async () => {

      await L1ERC20.approve(L1ERC20Deposit.address, 5000)
      await L1ERC20Deposit.deposit(AliceL1Wallet.getAddress(), 5000)
      await relayL1ToL2Messages(signer)

      // Wait for the delay to pass, otherwise the message won't exist.
      await increaseEthTime(l1ToL2MessageDelay + 1)
      
      // Use the simplified API, assume that messages are being relayed by a service.
      await waitForCrossDomainMessages(signer)

      await L2ERC20.connect(AliceL1Wallet).withdraw(2000)    
      //await increaseEthTime(l1ToL2MessageDelay + 1)
      await relayL2ToL1Messages(signer)

      expect(finalL1Balance).to.equal(0)
      expect(finalL2Balance).to.equal(originalL1Balance.add(originalL2Balance))
    })

    it('should allow an EOA to deposit and withdraw between two wallets', async () => {
      await L1ERC20.approve(L1ERC20Deposit.address, 5000)
      await L1ERC20Deposit.deposit(AliceL1Wallet.getAddress(), 5000)
      await relayL1ToL2Messages(signer)
      L2ERC20.transfer(BobL1Wallet.getAddress(), 2000)

      // Wait for the delay to pass, otherwise the message won't exist.
      await increaseEthTime(l2ToL1MessageDelay + 1)

      await L2ERC20.connect(BobL1Wallet).withdraw(1000)
      await relayL2ToL1Messages(signer)

      const finalL1Balance = await L1_ERC20.balanceOf(await signer.getAddress())
      const finalL2Balance = await L2_ERC20.balanceOf(await signer.getAddress())

      expect(finalL2Balance).to.equal(0)
      expect(finalL1Balance).to.equal(originalL1Balance.add(originalL2Balance))
    })

    it('should not allow Alice to withdraw transferred $', async () => {
      await L1ERC20.approve(L1ERC20Deposit.address, 5000)
      await L1ERC20Deposit.deposit(AliceL1Wallet.getAddress(), 5000)
      await relayL1ToL2Messages(signer)

      L2ERC20.transfer(BobL1Wallet.getAddress(), 5000)

      // Initiate the transfer.
      await L1_ERC20.xDomainTransfer(originalL1Balance)

    it('should not allow Bob to withdraw twice', async () => {
      await L1ERC20.approve(L1ERC20Deposit.address, 5000)
      await L1ERC20Deposit.deposit(AliceL1Wallet.getAddress(), 5000)
      await relayL1ToL2Messages(signer)  

      L2ERC20.transfer(BobL1Wallet.getAddress(), 3000)

      await L2ERC20.connect(BobL1Wallet).withdraw(3000)
      await relayL2ToL1Messages(signer)
      
      // We burn immediately, so the L1 balance will already be zero even though the L2 balance
      // hasn't been updated yet.
      expect(intermediateL1Balance).to.equal(0)
      expect(intermediateL2Balance).to.equal(originalL2Balance)

      // Now we actually wait for the delay and try again.
      await increaseEthTime(l2ToL1MessageDelay + 1)
      await waitForCrossDomainMessages(signer)

    it('should not allow mallory to call withdraw', async () => {
      await L1ERC20.approve(L1ERC20Deposit.address, 5000)
      await L1ERC20Deposit.deposit(AliceL1Wallet.getAddress(), 5000)
      await relayL1ToL2Messages(signer)  

      expect(finalL1Balance).to.equal(0)
      expect(finalL2Balance).to.equal(originalL1Balance.add(originalL2Balance))
    })
  })
})
