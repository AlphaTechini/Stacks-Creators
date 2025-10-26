import WebSocket from 'ws';
import * as stacksClient from '../utils/stacksClient.cjs';
const { getNetwork } = stacksClient;
import { updateNFTOnMint } from './nft.service.js';
import { getDB } from '../config/firebase.js';
import 'dotenv/config';


/**
 * Simple parser for Clarity tuple data in .repr strings
 */
function parseClarityValue(repr) {
  const data = {};
  const matches = repr.matchAll(/\((\w+)\s(.*?)\)/g);
  for (const match of matches) {
    let key = match[1];
    let value = match[2];
    if (value.startsWith('u')) value = value.substring(1);
    if (value.startsWith('"')) value = value.slice(1, -1);
    if (key.endsWith('-id')) key = key.replace('-id', '_id');
    data[key] = value;
  }
  return data;
}

/**
 * Handles NFT purchase events from the blockchain
 */
async function handlePurchaseEvent(eventData, txId) {
  const db = getDB();
  const { token_id, buyer } = eventData;

  console.log(`[Chain-Listener] Detected Purchase: Token ID ${token_id} bought by ${buyer}. Tx: ${txId}`);

  if (!token_id || !buyer) {
    console.error('[Chain-Listener] Invalid event data for purchase:', eventData);
    return;
  }

  const nftRef = db.collection('nfts').doc(String(token_id));
  await nftRef.update({ owner: buyer, listed: false });
  console.log(`[Chain-Listener] DB updated for NFT #${token_id}. New owner: ${buyer}`);
}

/**
 * Starts and manages a resilient WebSocket listener for Stacks events
 */
export async function startEventListener() {
  let retryCount = 0;
  const maxRetries = 10;

  const connect = async () => {
    const network = getNetwork();
    const baseUrl = network.client?.baseUrl || 'https://stacks-node-api.testnet.stacks.co';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/extended/v1/ws';

    console.log(`[Chain-Listener] Connecting to WebSocket: ${wsUrl} (Attempt ${retryCount + 1})`);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log('[Chain-Listener] ✅ Connected to Stacks WebSocket.');
      retryCount = 0;

      // Subscribe to all tx updates from the deployer’s address
      ws.send(JSON.stringify({
        event: 'subscribe',
        subscriptions: [{ event: 'tx_update' }]
      }));

      console.log(`[Chain-Listener] Subscribed to transaction updates for address: ${process.env.STACKS_CONTRACT_ADDRESS}`);
    });

    ws.on('message', async (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch {
        return;
      }

      if (data.tx_status !== 'success' || !data.events) return;

      for (const event of data.events) {
        if (event.event_type === 'contract_log') {
          const { contract_id, value } = event.contract_log;
          const payload = value.repr;

          // Handle mint events
          if (
            contract_id === `${process.env.STACKS_CONTRACT_ADDRESS}.${process.env.STACKS_CONTRACT_NAME_CREATOR}` &&
            payload.includes('nft_mint')
          ) {
            const eventData = parseClarityValue(payload);
            updateNFTOnMint(eventData, data.tx_id);
          }

          // Handle purchase events
          if (
            contract_id === `${process.env.STACKS_CONTRACT_ADDRESS}.${process.env.STACKS_CONTRACT_NAME_MARKET}` &&
            payload.includes('nft_purchase')
          ) {
            const eventData = parseClarityValue(payload);
            handlePurchaseEvent(eventData, data.tx_id);
          }
        }
      }
    });

    ws.on('close', () => {
      console.warn('[Chain-Listener] ⚠️ WebSocket connection closed. Retrying in 5s...');
      retryCount++;
      if (retryCount <= maxRetries) {
        setTimeout(connect, 5000);
      } else {
        console.error('[Chain-Listener] ❌ Max retries reached. Could not reconnect.');
      }
    });

    ws.on('error', (error) => {
      console.error('[Chain-Listener] WebSocket Error:', error.message);
    });
  };

  await connect();
}
