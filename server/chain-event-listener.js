import { connectWebSocketClient } from '@stacks/blockchain-api-client';
import { NFTItem } from './models/NFTItem.js';

const API_URL = process.env.STACKS_API_URL || 'https://api.testnet.hiro.so';

/**
 * Handles the nft_mint event.
 * This function is called when a mint event is detected from the creator-nft contract.
 * It verifies that the NFT recorded in our database is consistent with the on-chain event.
 * @param {object} event - The NFT event object from the Stacks API.
 */
async function handleMintEvent(event) {
  const { recipient, token_id } = event;
  console.log(`[Chain-Listener] Detected Mint: Token ID ${token_id} to ${recipient}`);

  // Find the NFT in our database, which should have been created by the /api/nft/mint endpoint.
  const nft = await NFTItem.findOne({ tokenId: token_id });

  if (!nft) {
    console.warn(`[Chain-Listener] Minted NFT with ID ${token_id} found on-chain but not in our DB. This might indicate a mint outside our app's flow.`);
    // In a production app, you might want to fetch metadata and create a DB record here.
    return;
  }

  // Verify consistency
  if (nft.ownerAddress !== recipient) {
    console.error(`[Chain-Listener] DB/Chain Mismatch: NFT ${token_id} owner in DB is ${nft.ownerAddress}, but on-chain recipient is ${recipient}. Correcting DB.`);
    nft.ownerAddress = recipient;
    await nft.save();
  } else {
    console.log(`[Chain-Listener] Mint for NFT ${token_id} is consistent with DB.`);
  }
}

/**
 * Handles the nft_purchase event.
 * This function is called when a buy-token event is detected from the marketplace contract.
 * It updates the ownership and listed status of the NFT in the database.
 * @param {object} event - The NFT event object from the Stacks API.
 */
async function handlePurchaseEvent(event) {
  const { token_id, buyer, seller, price } = event;
  console.log(`[Chain-Listener] Detected Purchase: Token ID ${token_id} bought by ${buyer} from ${seller} for ${price}`);

  const nft = await NFTItem.findOne({ tokenId: token_id });

  if (!nft) {
    console.error(`[Chain-Listener] Purchased NFT ${token_id} not found in DB.`);
    return;
  }

  // Update the owner and listed status based on the confirmed on-chain event
  nft.ownerAddress = buyer;
  nft.listed = false;
  // You might also want to record the sale price and date in a separate 'sales' collection.
  await nft.save();

  console.log(`[Chain-Listener] DB updated for NFT ${token_id}. New owner: ${buyer}`);
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

      await client.subscribeNftEvents(async (event) => {
        if (event.asset_event_type === 'mint') {
          // This is a generic mint event. We'll rely on our custom `print` events.
        } else if (event.asset_event_type === 'transfer') {
          // This is a generic transfer event.
        }
      });

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