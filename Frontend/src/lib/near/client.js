import { getContractName } from './config';
import { showWalletModal, setupWalletSelector } from './walletSelector';

let selectorRef;
let walletRef;
let accountIdRef = '';
let contractInstance;

const GAS = '200000000000000'; // 200 TGas

async function ensureSelector() {
  if (!selectorRef) {
    selectorRef = await setupWalletSelector();
  }
  return selectorRef;
}

async function getWallet() {
  const selector = await ensureSelector();
  if (!walletRef) {
    const state = selector.store.getState();
    if (state.accounts.length && state.selectedWalletId) {
      walletRef = await selector.wallet();
      accountIdRef = state.accounts.find(a => a.active)?.accountId || '';
    }
  }
  return walletRef;
}

async function ensureContract() {
  const wallet = await getWallet();
  if (!wallet) {
    return null;
  }
  if (contractInstance) return contractInstance;
  const account = await wallet.account();
  const contractId = getContractName();
  if (!contractId) throw new Error('Contract name missing');

  // dynamic import for near-api-js just for Contract class
  const { Contract } = await import('near-api-js');
  contractInstance = new Contract(account, contractId, {
    viewMethods: [
      'get_profile',
      'get_token',
      'get_latest_tokens',
      'get_tokens_by_owner',
      'get_followers'
    ],
    changeMethods: [
      'create_profile',
      'follow_influencer',
      'mint_token',
      'tip_token'
    ]
  });
  return contractInstance;
}

export async function initNear() {
  const selector = await ensureSelector();
  const state = selector.store.getState();
  accountIdRef = state.accounts.find(a => a.active)?.accountId || '';
  if (state.selectedWalletId) {
    walletRef = await selector.wallet();
  }
  return {
    wallet: walletRef,
    accountId: accountIdRef,
    isSignedIn: Boolean(accountIdRef)
  };
}

export function getAccountId() {
  return accountIdRef;
}

export async function login(walletId) {
  const selector = await ensureSelector();
  if (!walletId) {
    await showWalletModal();
    return;
  }
  const wallet = await selector.wallet(walletId);
  const contractId = getContractName();
  await wallet.signIn({
    contractId,
    methodNames: [ 'create_profile', 'follow_influencer', 'mint_token', 'tip_token' ]
  });
  const state = selector.store.getState();
  accountIdRef = state.accounts.find(a => a.active)?.accountId || '';
  walletRef = wallet;
  contractInstance = null; // force re-init
}

export async function logout() {
  const wallet = await getWallet();
  if (wallet) {
    await wallet.signOut();
  }
  selectorRef = undefined;
  walletRef = undefined;
  accountIdRef = '';
  contractInstance = undefined;
}

export async function createProfile(displayName, bio, avatarMedia) {
  const contract = await ensureContract();
  if (!contract) throw new Error('Connect a wallet first');
  return contract.create_profile({ displayName, bio, avatarMedia }, GAS);
}

export async function fetchProfile(accountId) {
  const contract = await ensureContract();
  if (!contract) return null;
  return contract.get_profile({ accountId });
}

export async function followInfluencer(accountId) {
  const contract = await ensureContract();
  if (!contract) throw new Error('Connect a wallet first');
  return contract.follow_influencer({ accountId }, GAS);
}

export async function getFollowers(accountId) {
  const contract = await ensureContract();
  if (!contract) return [];
  return contract.get_followers({ accountId });
}

async function parseNearAmount(nearAmount) {
  const { utils } = await import('near-api-js');
  return utils.format.parseNearAmount(nearAmount);
}

export async function mintToken(tokenId, metadata, mintDepositNear = '0.001') {
  const contract = await ensureContract();
  if (!contract) throw new Error('Connect a wallet first');
  const deposit = await parseNearAmount(mintDepositNear || '0.001');
  return contract.mint_token({ tokenId, metadata }, GAS, deposit);
}

export async function tipToken(tokenId, nearAmount = '0.1') {
  const contract = await ensureContract();
  if (!contract) throw new Error('Connect a wallet first');
  const deposit = await parseNearAmount(nearAmount || '0.1');
  return contract.tip_token({ tokenId }, GAS, deposit);
}

export async function fetchLatestTokens(limit = 12) {
  const contract = await ensureContract();
  if (!contract) return [];
  return contract.get_latest_tokens({ limit });
}

export async function fetchTokensByOwner(ownerId, limit = 12) {
  const contract = await ensureContract();
  if (!contract) return [];
  return contract.get_tokens_by_owner({ ownerId, limit });
}

export async function formatYoctoToNear(yocto) {
  if (!yocto) return '0';
  const { utils } = await import('near-api-js');
  return utils.format.formatNearAmount(yocto, 4);
}
