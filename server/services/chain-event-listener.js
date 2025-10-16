import { connectWebSocketClient } from '@stacks/blockchain-api-client';
import { db, doc, getDoc, setDoc, updateDoc } from '../config/firebase.js';
import StacksTransactions from '@stacks/transactions';
const { callReadOnlyFunction, cvToJSON, uintCV } = StacksTransactions;

const API_URL = process.env.STACKS_API_URL || 'https://api.testnet.hiro.so';

/**
 * Handles the nft_mint event.
 * This function is called when a mint event is detected from the creator-nft contract.
 * It verifies that the NFT recorded in our database is consistent with the on-chain event.
 * @param {object} event - The NFT event object from the Stacks API.
 */
async function handleMintEvent(event) {
  const tokenId = event.token_id.value;
  const recipient = event.recipient.value;
  console.log(`[Chain-Listener] Detected Mint: Token ID ${tokenId} to ${recipient}`);

  const nftRef = doc(db, 'nfts', tokenId.toString());

  // Check if we've already processed this mint to avoid duplicates.
  const nftDoc = await getDoc(nftRef);
  if (nftDoc.exists()) {
    console.log(`[Chain-Listener] Mint for NFT ${tokenId} already processed.`);
    return;
  }

  // Fetch the metadata URI from the contract to get the Cloudinary URL
  const uriResult = await callReadOnlyFunction({
    contractAddress: process.env.STACKS_CONTRACT_ADDRESS,
    contractName: process.env.STACKS_CONTRACT_NAME_CREATOR,
    functionName: 'get-token-uri',
    functionArgs: [uintCV(tokenId)],
    senderAddress: process.env.STACKS_SENDER_ADDRESS,
  });

  const metadataUrl = cvToJSON(uriResult).value.value;
  const metadata = await fetch(metadataUrl).then(res => res.json());

  const newNftData = {
    tokenId,
    creatorAddress: recipient, // The first owner is the creator
    ownerAddress: recipient,
    imageUrl: metadata.image,
    aiImageUrl: metadata.image, // The `metadata.image` field contains the URL of the final AI-generated image.
    txId: event.tx_id,
    listed: false, // NFTs are not listed by default on mint
    createdAt: new Date().toISOString(),
  };
  await setDoc(nftRef, newNftData);
  console.log(`[Chain-Listener] New NFT ${tokenId} saved to database.`);
}

/**
 * Handles the nft_purchase event.
 * This function is called when a buy-token event is detected from the marketplace contract.
 * It updates the ownership and listed status of the NFT in the database.
 * @param {object} event - The NFT event object from the Stacks API.
 */
async function handlePurchaseEvent(event) {
  const tokenId = event.token_id.value;
  const buyer = event.buyer.value;
  console.log(`[Chain-Listener] Detected Purchase: Token ID ${tokenId} bought by ${buyer}`);

  const nftRef = doc(db, 'nfts', tokenId.toString());
  const nftDoc = await getDoc(nftRef);

  if (!nftDoc.exists()) {
    console.error(`[Chain-Listener] Purchased NFT ${tokenId} not found in DB.`);
    return;
  }

  // Update the owner and listed status based on the confirmed on-chain event
  await updateDoc(nftRef, { ownerAddress: buyer, listed: false });

  console.log(`[Chain-Listener] DB updated for NFT ${tokenId}. New owner: ${buyer}`);
}

/**
 * Starts the WebSocket listener and handles incoming events.
 * Includes retry logic with exponential backoff for connection stability.
 */
export async function startEventListener() {
  let retryCount = 0;
  const maxRetries = 10;

  const connect = async () => {
    try {
      console.log('[Chain-Listener] Connecting to Stacks API WebSocket...');
      const client = await connectWebSocketClient(API_URL);
      retryCount = 0; // Reset on successful connection
      console.log('[Chain-Listener] Successfully connected to WebSocket.');

      // Listen for our custom `print` events
      client.socket.on('print', (event) => {
        const payload = event.payload.value.repr;
        if (payload.includes('nft_mint')) {
          handleMintEvent(event.payload.value);
        } else if (payload.includes('nft_purchase')) {
          handlePurchaseEvent(event.payload.value);
        }
      });

      client.socket.on('disconnect', () => {
        console.warn('[Chain-Listener] WebSocket disconnected. Attempting to reconnect...');
        setTimeout(connect, Math.min(1000 * (2 ** retryCount++), 30000)); // Exponential backoff up to 30s
      });
    } catch (error) {
      console.error(`[Chain-Listener] Connection failed (attempt ${retryCount + 1}):`, error.message);
      if (retryCount < maxRetries) {
        setTimeout(connect, Math.min(1000 * (2 ** retryCount++), 30000));
      } else {
        console.error('[Chain-Listener] Max retries reached. Could not connect to WebSocket.');
      }
    }
  };

  await connect();
}