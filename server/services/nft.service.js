import { v2 as cloudinary } from 'cloudinary';
import StacksTransactions from '@stacks/transactions';
const {
  uintCV,
  makeContractCall,
  createStacksPrivateKey,
  standardPrincipalCV,
  AnchorMode,
  stringUtf8CV,
  TransactionSigner,
  callReadOnlyFunction,
  cvToJSON,
} = StacksTransactions;
import * as stacksClient from '../utils/stacksClient.cjs';
const { getNetwork, broadcastTransaction } = stacksClient;
import { getDB } from '../config/firebase.js';

// A simple in-memory lock to prevent race conditions during minting.
let isMinting = false;

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to a specified folder in Cloudinary.
 * @param {Buffer} buffer The file buffer.
 * @param {string} folder The folder to upload to.
 * @param {string} public_id A unique ID for the file.
 * @returns {Promise<object>} The full Cloudinary upload result.
 */
function uploadToCloudinary(buffer, folder, public_id) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder, public_id },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Mints an NFT by uploading media and metadata, then broadcasting a Stacks transaction.
 * @param {string} creatorAddress - The Stacks address of the creator receiving the NFT.
 * @param {string} title - The title of the NFT.
 * @param {string} description - The description of the NFT. 
 * @param {Buffer} aiImageBuffer - The buffer of the AI-generated image to be uploaded.
 * @returns {Promise<{txId: string, mediaUrl: string}>}
 */
export async function mintNFT(creatorAddress, title, description, aiImageBuffer) {
  if (isMinting) {
    throw new Error('Another minting process is already in progress. Please try again in a moment.');
  }
  isMinting = true;

  try {
  const network = getNetwork();
  // STEP 1: Get the next available token ID directly from the smart contract.
  // This is the single source of truth for the NFT's ID.
  const nextTokenIdResult = await callReadOnlyFunction({
    contractAddress: process.env.STACKS_CONTRACT_ADDRESS,
    contractName: process.env.STACKS_CONTRACT_NAME_CREATOR,
    functionName: 'get-last-token-id', // Assuming the contract has a `(define-read-only (get-last-token-id) ...)`
    functionArgs: [],
    senderAddress: process.env.STACKS_SENDER_ADDRESS,
    network,
  });
  const lastTokenId = cvToJSON(nextTokenIdResult).value;
  const tokenId = lastTokenId === null ? 0 : Number(lastTokenId) + 1;

  // STEP 2: Upload media and metadata to Cloudinary using the correct tokenId.
  const { secure_url: mediaUrl } = await uploadToCloudinary(aiImageBuffer, 'nfts/media', tokenId.toString());
  // v7 network objects store the URL in `client.baseUrl`
  const { nonce } = await fetch(`${network.client.baseUrl}/v2/accounts/${process.env.STACKS_SENDER_ADDRESS}`).then(res => res.json());

  // 2. Create and upload metadata JSON to Cloudinary
  const metadata = { title, description, image: mediaUrl };
  const metadataBuffer = Buffer.from(JSON.stringify(metadata));
  const { secure_url: metadataUrl } = await uploadToCloudinary(metadataBuffer, 'nfts/metadata', tokenId.toString());
  if (!metadataUrl) {
    throw new Error('Failed to upload metadata file to Cloudinary.');
  }

  // STEP 3: Build, sign, and broadcast the Stacks transaction.
  const senderKey = process.env.STACKS_PRIVATE_KEY;
  const privateKey = createStacksPrivateKey(process.env.STACKS_PRIVATE_KEY);

  const txOptions = {
    contractAddress: process.env.STACKS_CONTRACT_ADDRESS,
    contractName: process.env.STACKS_CONTRACT_NAME_CREATOR,
    functionName: 'mint',
    functionArgs: [standardPrincipalCV(creatorAddress), stringUtf8CV(metadataUrl)],
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    nonce,
  };

  const transaction = await makeContractCall(txOptions);
  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privateKey);

  // 4. Broadcast the transaction
  const broadcastResult = await broadcastTransaction(transaction);
  const txId = broadcastResult.txid;

  // Return only the transaction ID. The listener will handle the DB write.
  return { txId, mediaUrl };
  } finally {
    isMinting = false; // Release the lock
  }
}

/**
 * Updates an NFT's on-chain data after a successful mint transaction.
 * This function is called by the chain event listener.
 *
 * @param {object} eventData - The parsed data from the `nft_mint` print event.
 * @param {string} txId - The ID of the minting transaction.
 */
export async function updateNFTOnMint(eventData, txId) {
  const db = getDB();
  const { token_id, recipient } = eventData;

  if (!token_id || !recipient) {
    console.error('[NFTService] Invalid event data for mint:', eventData);
    return;
  }

  // In Firestore, the document ID should be the token ID.
  const nftRef = db.collection('nfts').doc(String(token_id));
  // Using set with merge:true will create the document if it doesn't exist, or update it if it does.
  await nftRef.set({ owner: recipient, txId: txId, tokenId: Number(token_id) }, { merge: true });

  console.log(`[NFTService] Synced NFT #${token_id} for owner ${recipient}.`);
}
