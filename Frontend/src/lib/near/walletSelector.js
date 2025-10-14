import { getNearConfig, getContractName } from './config';
import '@near-wallet-selector/modal-ui/styles.css';

let selectorPromise;
let modalInstance;

export async function setupWalletSelector() {
  if (selectorPromise) return selectorPromise;
  selectorPromise = (async () => {
    // Polyfill minimal process object for near-api-js logging (expects process.env.NODE_ENV)
    if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
      window.process = { env: { NODE_ENV: import.meta?.env?.MODE || 'development' } };
    }
    // Polyfill Buffer for browser (safe-buffer / borsh in some wallets expect Buffer.from)
    if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
      const buf = await import('buffer');
      window.Buffer = buf.Buffer;
    }

    const [{ setupWalletSelector: setupSelector }, { setupModal }] = await Promise.all([
      import('@near-wallet-selector/core'),
      import('@near-wallet-selector/modal-ui')
    ]);
    const [{ default: nearWallet }] = await Promise.all([
      import('@near-wallet-selector/near-wallet')
    ]);
    const [{ default: hereWallet }] = await Promise.all([
      import('@near-wallet-selector/here-wallet')
    ]);

    const config = getNearConfig();
    const contractId = getContractName();

    const selector = await setupSelector({
      network: config.networkId,
      contractId,
      debug: true,
      modules: [
        nearWallet(),
        hereWallet()
      ]
    });

    modalInstance = setupModal(selector, {
      contractId,
      theme: 'dark'
    });

    return selector;
  })();
  return selectorPromise;
}

export async function showWalletModal() {
  const selector = await setupWalletSelector();
  if (!modalInstance) {
    throw new Error('Wallet selector modal not initialized');
  }
  modalInstance.show();
  return selector;
}

export async function getSelector() {
  return setupWalletSelector();
}
