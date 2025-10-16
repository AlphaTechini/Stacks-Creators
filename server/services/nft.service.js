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
  const tokenId = uuidv4(); // Generate a unique ID for the asset

  // 1. Upload the final AI-generated image to Cloudinary
  const { secure_url: mediaUrl } = await uploadToCloudinary(aiImageBuffer, 'nfts/media', tokenId);

  // 2. Create and upload metadata JSON to Cloudinary
  const metadata = { title, description, image: mediaUrl };
  const metadataBuffer = Buffer.from(JSON.stringify(metadata));
  const { secure_url: metadataUrl } = await uploadToCloudinary(metadataBuffer, 'nfts/metadata', tokenId);
  if (!metadataUrl) {
    throw new Error('Failed to upload metadata file to Cloudinary.');
  }

  // 3. Build and sign the Stacks transaction
  const senderKey = process.env.STACKS_PRIVATE_KEY;
  const privateKey = createStacksPrivateKey(process.env.STACKS_PRIVATE_KEY);

  // Fetch the current nonce for the SERVER'S sender account to prevent transaction failures.
  // This is the account that pays the transaction fees for the mint.
  const { nonce } = await fetch(
    // Note: Using a template literal to ensure the URL is correct.
    `${network.coreApiUrl}/v2/accounts/${process.env.STACKS_SENDER_ADDRESS}`,
  ).then(res => res.json());

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
}
