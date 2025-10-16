# Stacks Creators Application Architecture

This document provides a detailed explanation of the Stacks Creators application, its architecture, and the roles of its major components.

## Core Technologies

- **Frontend**: Svelte 5
- **Backend**: Fastify (Node.js)
- **Blockchain**: Stacks
- **Database**: Firebase Firestore
- **Decentralized Storage**: IPFS (via Helia)
- **Image Storage**: Cloudinary
- **AI Service**: Hugging Face

---

## Application Flow

### 1. User Authentication

- **`Frontend/src/lib/stacksClient.js`**: The `handleLogin` function orchestrates the authentication flow.
- The user clicks "Connect Wallet" (`+page.svelte`), triggering `handleLogin`.
- The app connects to the user's Stacks wallet (Leather or Xverse).
- It fetches a unique `nonce` from the backend (`/api/users/nonce`).
- The user is prompted to sign this nonce with their wallet.
- The resulting signature, public key, and address are sent to the backend (`/api/users/login`).
- **`server/routes/user.route.js`**: The backend verifies the signature against the public key and nonce. If valid, it generates a JWT (JSON Web Token) using `server/utils/jwt.js` and sends it back to the user.
- The frontend stores this JWT in `localStorage` and uses it in the `Authorization` header for all subsequent authenticated API calls.

### 2. Creator Profile Management

- **`Frontend/src/routes/setup-profile/+page.svelte`**: Users can set a username and add social links.
- This data is sent to the `/api/creator/sync` endpoint.
- **`server/routes/creator.js`**: This route implements a hybrid storage model.
  - The `username` is stored directly in a `users` collection in **Firestore** for fast, queryable access.
  - All other profile data (socials, bio, etc.) is bundled into a JSON object and uploaded to **IPFS** via a local Helia node.
  - The resulting IPFS Content ID (CID) is stored alongside the username in Firestore.

### 3. NFT Minting (The Core Pipeline)

This is a "gasless" process for the user, orchestrated by a single API call.

1.  **`Frontend/src/lib/components/MintForm.svelte`**: The user selects an image, provides a title and a prompt/description.
2.  **`Frontend/src/lib/api.js`**: The `generateAndMintNFT` function sends the image and metadata as `multipart/form-data` to `/api/nft/generate-and-mint`.
3.  **`server/routes/mint.route.js`**: This backend route receives the request and initiates the pipeline.
4.  **`server/services/ai.service.js`**: The original image buffer is sent to the **Hugging Face** Inference API (`transformImage` function) along with the user's prompt to generate a new AI-transformed image.
5.  **`server/services/nft.service.js`**: This is the heart of the minting logic.
    - It implements a lock to prevent race conditions.
    - It calls the smart contract's `get-last-token-id` function to determine the correct, unique `tokenId` for the new NFT.
    - It uploads the **AI-generated image** to **Cloudinary**.
    - It creates a JSON metadata file (containing the title, description, and the Cloudinary image URL) and uploads *that* to **Cloudinary**.
    - It builds a Stacks `mint` transaction using the server's wallet (`STACKS_PRIVATE_KEY`) to pay the gas fee. The transaction specifies the user's address as the recipient and includes the URI of the metadata file on Cloudinary.
    - The signed transaction is broadcast to the Stacks network via `server/utils/stacksClient.js`.
6.  The backend returns the `txId` to the frontend, which displays a success message.

### 4. On-Chain Event Listening & Database Sync

- **`server/services/chain-event-listener.js`**: This is a crucial background service.
- It opens a persistent WebSocket connection to the Stacks blockchain API.
- It listens for custom `print` events from your smart contracts.
- **On `nft_mint` event**:
  - It receives the official `tokenId` and `recipient` from the confirmed on-chain transaction.
  - It calls the contract's `get-token-uri` function to retrieve the metadata URL (pointing to Cloudinary).
  - It fetches the metadata JSON from Cloudinary.
  - It saves a new document in the `nfts` collection in **Firestore**, using the `tokenId` as the document ID. This document contains the owner, creator, image URL, and other relevant data.
- **On `nft_purchase` event**: It updates the `ownerAddress` and `listed` status of the corresponding NFT document in Firestore.

### 5. Marketplace

- **`server/routes/marketplace.route.js`**: Provides API endpoints for marketplace interactions.
  - `GET /api/nfts`: Fetches all NFT documents from Firestore for the gallery page.
  - `POST /api/marketplace/list`: The user signs a `list-token` transaction on the frontend. The signed transaction is sent to this endpoint, which broadcasts it and updates the NFT's `listed` status in Firestore to `true`.
  - `POST /api/marketplace/buy`: The user signs a `buy-token` transaction. The backend broadcasts it. The `chain-event-listener` handles updating the database once the purchase is confirmed on-chain.

---

## Environment Variables (`server/.env`)

```ini
# Stacks Configuration
STACKS_NETWORK=testnet # or 'devnet'. Cannot be 'mainnet'.
STACKS_API_URL=https://api.testnet.hiro.so # WebSocket API URL
STACKS_CONTRACT_ADDRESS=ST... # Address of the deployed contracts
STACKS_CONTRACT_NAME_CREATOR=creator-nft # Name of the NFT contract
STACKS_CONTRACT_NAME_MARKET=marketplace # Name of the marketplace contract

# Server Wallet (pays for minting gas fees)
STACKS_SENDER_ADDRESS=ST... # The server's public Stacks address
STACKS_PRIVATE_KEY=... # The server's private key

# Service API Keys
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
HF_TOKEN=... # Hugging Face API Token

# Firebase Configuration
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# JWT Secret
JWT_SECRET=a-very-strong-and-secret-key-for-jwt
```