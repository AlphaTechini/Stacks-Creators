import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import {
  makeContractCall,
  createStacksPrivateKey,
  standardPrincipalCV,
  AnchorMode,
  stringUtf8CV,
  TransactionSigner,
} from '@stacks/transactions';
import { network, broadcastTransaction } from '../utils/stacksClient.js';
import { NFTItem } from '../models/NFTItem.js';

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
 * @returns {Promise<string>} The secure URL of the uploaded file.
 */
function uploadToCloudinary(buffer, folder, public_id) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder, public_id },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve(result.secure_url);
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
 * @param {string} mediaUrl - The URL of the AI-generated image already uploaded to Cloudinary.
 * @returns {Promise<{txId: string, tokenId: string, mediaUrl: string}>}
 */
export async function mintNFT(creatorAddress, title, description, mediaUrl) {
  const tokenId = uuidv4(); // Generate a unique ID for the asset

  // 1. Create and upload metadata JSON to Cloudinary
  const metadata = { title, description, image: mediaUrl };
  const metadataBuffer = Buffer.from(JSON.stringify(metadata));
  const metadataUrl = await uploadToCloudinary(metadataBuffer, 'nfts/metadata', tokenId);
  if (!metadataUrl) {
    throw new Error('Failed to upload metadata file to Cloudinary.');
  }

  // 2. Build and sign the Stacks transaction
  const senderKey = process.env.STACKS_PRIVATE_KEY;
  const privateKey = createStacksPrivateKey(process.env.STACKS_PRIVATE_KEY);

  // Fetch the current nonce for the sender account to prevent transaction failures.
  const { nonce } = await fetch(
    `${network.coreApiUrl}/v2/accounts/${process.env.STACKS_SENDER_ADDRESS}`
  ).then(res => res.json());

  const txOptions = {
    contractAddress: process.env.STACKS_CONTRACT_ADDRESS,
    contractName: process.env.STACKS_CONTRACT_NAME,
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

  // 3. Broadcast the transaction
  const broadcastResult = await broadcastTransaction(transaction);
  const txId = broadcastResult.txid;

  // 4. Save the result to MongoDB
  const newNft = new NFTItem({
    tokenId,
    creatorAddress,
    imageUrl: mediaUrl,
    aiImageUrl: mediaUrl, // Placeholder for now
    price: 0, // Assuming not for sale initially
    listed: false,
    txId,
  });
  await newNft.save();

  return { txId, tokenId, mediaUrl };
}
