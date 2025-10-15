import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import {
  makeContractCall,
  createStacksPrivateKey,
  standardPrincipalCV,
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
 * @param {Buffer} fileBuffer - The buffer of the image file to be minted.
 * @returns {Promise<{txId: string, tokenId: string, mediaUrl: string}>}
 */
export async function mintNFT(creatorAddress, title, description, fileBuffer) {
  const tokenId = uuidv4(); // Generate a unique ID for the asset

  // 1. Upload image file to Cloudinary
  const mediaUrl = await uploadToCloudinary(fileBuffer, 'nfts/images', tokenId);
  if (!mediaUrl) {
    throw new Error('Failed to upload media file to Cloudinary.');
  }

  // 2. Create and upload metadata JSON to Cloudinary
  const metadata = { title, description, image: mediaUrl };
  const metadataBuffer = Buffer.from(JSON.stringify(metadata));
  const metadataUrl = await uploadToCloudinary(metadataBuffer, 'nfts/metadata', tokenId);
  if (!metadataUrl) {
    throw new Error('Failed to upload metadata file to Cloudinary.');
  }

  // 3. Build and sign the Stacks transaction
  const privateKey = createStacksPrivateKey(process.env.STACKS_PRIVATE_KEY);

  const txOptions = {
    contractAddress: process.env.STACKS_CONTRACT_ADDRESS,
    contractName: process.env.STACKS_CONTRACT_NAME,
    functionName: 'mint',
    functionArgs: [standardPrincipalCV(creatorAddress), stringUtf8CV(metadataUrl)],
    senderKey: privateKey,
    network,
    anchorMode: 3, // AnchorMode.Any
  };

  const transaction = await makeContractCall(txOptions);
  const signer = new TransactionSigner(transaction);
  signer.signOrigin(privateKey);

  // 4. Broadcast the transaction
  const broadcastResult = await broadcastTransaction(transaction);
  const txId = broadcastResult.txid;

  // 5. Save the result to MongoDB
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