import { StacksApiWebSocketClient } from '@stacks/blockchain-api-client';
import * as stacksClient from '../utils/stacksClient.cjs';
const { getNetwork } = stacksClient;
import { updateNFTOnMint } from './nft.service.js';
import { getDB } from '../config/firebase.js';
import { NodeWebSocketWrapper } from '../utils/websocket-wrapper.js';

function parseClarityValue(repr) {
  const data = {};
  // Simplified parser for tuples like `(tuple (key val) (key2 val))`
  const matches = repr.matchAll(/\((\w+)\s(.*?)\)/g);
  for (const match of matches) {
    let key = match[1];
    let value = match[2];
    // Clean up common Clarity value representations
    if (value.startsWith('u')) value = value.substring(1);
    if (value.startsWith('"')) value = value.substring(1, value.length - 1);
    if (key.endsWith('-id')) key = key.replace('-id', '_id'); // e.g. token-id -> token_id
    data[key] = value;
  }
  return data;
}

/**
 * Handles the nft_purchase event.
 * This function is called when a buy-token event is detected from the marketplace contract.
 * It updates the ownership and listed status of the NFT in the database.
 * The event data is parsed from a print event.
 * @param {object} event - The NFT event object from the Stacks API.
 * @param {string} txId - The ID of the purchase transaction.
 */
async function handlePurchaseEvent(eventData, txId) {
  const db = getDB();
  const { token_id, buyer } = eventData;
  console.log(`[Chain-Listener] Detected Purchase: Token ID ${token_id} bought by ${buyer}. Tx: ${txId}`);

  if (!token_id || !buyer) {
    console.error('[Chain-Listener] Invalid event data for purchase:', eventData);
    return;
  }

  // Update the owner and listed status based on the confirmed on-chain event
  const nftRef = db.collection('nfts').doc(String(token_id));
  await nftRef.update({ owner: buyer, listed: false });

  console.log(`[Chain-Listener] DB updated for NFT #${token_id}. New owner: ${buyer}`);
}

/**
 * Starts the WebSocket listener and handles incoming events.
 * Includes retry logic with exponential backoff for connection stability.
 */
export async function startEventListener() {
  let retryCount = 0;
  const maxRetries = 10;
  let client;

  const connect = async () => {
    try {
      console.log(`[Chain-Listener] Connecting to WebSocket... (Attempt ${retryCount + 1})`);
      const network = getNetwork();
      // v7 network objects store the URL in `client.baseUrl`
      const wsUrl = new URL(network.client.baseUrl);
      wsUrl.protocol = wsUrl.protocol.replace('http', 'ws');
      wsUrl.pathname = '/extended/v1/ws';

      client = new StacksApiWebSocketClient(wsUrl.toString(), NodeWebSocketWrapper);

      client.on('close', () => {
        console.warn('[Chain-Listener] WebSocket connection closed. Retrying in 5s...');
        client = null; // Clear the client instance
        setTimeout(connect, 5000);
      });

      client.on('error', (error) => {
        console.error('[Chain-Listener] WebSocket Error:', error);
        // The 'close' event will handle the reconnection logic.
      });

      await client.connect((update) => {
        if (update.tx_status !== 'success' || !update.events) {
          return;
        }

        for (const event of update.events) {
          if (event.event_type === 'contract_log') {
            const { contract_id, value } = event.contract_log;
            const payload = value.repr;

            // Check for mint events from the creator contract
            if (contract_id === `${process.env.STACKS_CONTRACT_ADDRESS}.${process.env.STACKS_CONTRACT_NAME_CREATOR}` && payload.includes('nft_mint')) {
              const eventData = parseClarityValue(payload);
              updateNFTOnMint(eventData, update.tx_id);
            }

            // Check for purchase events from the marketplace contract
            if (contract_id === `${process.env.STACKS_CONTRACT_ADDRESS}.${process.env.STACKS_CONTRACT_NAME_MARKET}` && payload.includes('nft_purchase')) {
              const eventData = parseClarityValue(payload);
              handlePurchaseEvent(eventData, update.tx_id);
            }
          }
        }
      });

      retryCount = 0; // Reset on successful connection
      console.log('[Chain-Listener] Successfully connected to WebSocket.');

      // Subscribe to transactions for both of your contracts
      await client.subscribeAddress(process.env.STACKS_CONTRACT_ADDRESS);
      console.log(`[Chain-Listener] Subscribed to contract deployer address: ${process.env.STACKS_CONTRACT_ADDRESS}`);
    } catch (error) {
      console.error(`[Chain-Listener] Connection failed:`, error.message);
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`[Chain-Listener] Retrying in 5s...`);
        setTimeout(connect, 5000);
      } else {
        console.error('[Chain-Listener] Max retries reached. Could not connect to WebSocket.');
      }
    }
  };

  await connect();
}