# NEAR Creators Platform

SocialFi prototype where influencers stylize selfies with AI, mint the result as an NFT on NEAR, and let fans follow or tip their drops.

## Project structure

```
contract/   AssemblyScript smart contract (near-sdk-as)
backend/    Fastify API for AI-style conversion + config sharing
Frontend/   SvelteKit dApp experience
```

## Prerequisites

- Node.js 20+
- npm 9+
- NEAR CLI `npm install -g near-cli` (for deploying the contract)

## Initial setup

Install each workspace independently so lockfiles stay local:

```powershell
Set-Location contract
npm install

Set-Location ..\backend
npm install

Set-Location ..\Frontend
npm install
```

Copy the environment examples, then adjust values (wallet, contract name, backend URL, etc.):

```powershell
Copy-Item .env.example .env      # in backend/
Copy-Item .env.example .env      # in Frontend/
```

## Contract workflow (AssemblyScript)

```powershell
Set-Location contract
npm run build           # compiles to build/release
npm test                # optional near-sdk-as unit tests

# Deploy to testnet (adjust account IDs)
near deploy --wasmFile build/release/index.wasm --accountId your-account.testnet
```

Key methods (see `assembly/index.ts`):

- `create_profile(displayName, bio, avatarMedia)`
- `follow_influencer(accountId)`
- `mint_token(tokenId, metadata)` (attach ≥0.001 NEAR)
- `tip_token(tokenId)`
- Feed helpers `get_latest_tokens`, `get_tokens_by_owner`, `get_followers`

## Backend workflow (Fastify + Sharp)

```powershell
Set-Location backend
npm run build          # tsc build to dist/
npm run dev            # hot reload server
```

Endpoints:

- `POST /api/convert` – stylizes an uploaded image (multipart `file`) → returns original & converted URLs
- `GET /api/config` – exposes NEAR + backend config to the frontend
- Static media served under `/media/*`

## Frontend workflow (SvelteKit)

```powershell
Set-Location Frontend
npm run dev -- --open
```

Key features:

- Wallet login via `near-api-js`
- Creator profile creation + stats
- Selfie upload → backend conversion preview → NFT minting flow
- Community feed showing latest drops with follow/tip actions

Before running `npm run build`, ensure the backend `.env` points to the deployed contract and hosted media if not local.

## End-to-end flow

1. Start backend (`npm run dev` inside `backend/`).
2. Start frontend (`npm run dev` inside `Frontend/`).
3. Connect NEAR wallet in the UI and create your profile.
4. Upload a selfie → backend returns stylized art.
5. Mint the NFT (attaches 0.001 NEAR).
6. Share the drop link; fans can follow or tip using the same dApp.

## Validation checklist

- `contract/`: `npm test`
- `backend/`: `npm run build`
- `Frontend/`: `npm run check && npm run build`

Run the checks after updating dependencies or contract code to keep the prototype healthy.
