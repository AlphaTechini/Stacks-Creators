# Stacks Creators - Smart Contracts

This directory contains the Clarity smart contracts for the Stacks Creators dApp.

- `creator-nft.clar`: A SIP-009 compliant NFT contract for minting creator tokens.
- `marketplace.clar`: A marketplace contract for listing and trading the NFTs.

## Prerequisites

You need to have Clarinet installed to test and deploy these contracts locally.

## Deployment with Clarinet

Clarinet simplifies the deployment process. The deployment plan is configured in `Clarinet.toml`.

1.  **Deploy `creator-nft.clar` first:**
    The marketplace contract depends on the NFT contract. Clarinet handles this dependency automatically based on the `Clarinet.toml` configuration.

2.  **Update Marketplace Contract:**
    After the initial deployment, Clarinet will output the deployed address for `creator-nft.clar`. You must update the `NFT-CONTRACT` constant in `marketplace.clar` with this new principal.

    ```clarity
    ;; In marketplace.clar
    (define-constant NFT-CONTRACT 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.creator-nft) ;; Replace with your deployed address
    ```

3.  **Run Deployment:**
    Execute the following command in your terminal at the project root:

    ```bash
    clarinet integrate
    ```

    This command starts a local Stacks devnet instance and deploys your contracts according to the plan in `Clarinet.toml`.

## Testing with Clarinet Console

You can interact with your deployed contracts using the Clarinet console.

1.  **Start the console:**
    ```bash
    clarinet console
    ```

2.  **Interact with the contracts:**
    Once in the console, you can call your contract functions.

    ```clarity
    ;; Mint a new NFT (as the deployer)
    (contract-call? .creator-nft mint tx-sender "https://example.com/metadata/1.json")

    ;; Check the owner of token 1
    (nft-get-owner? .creator-nft u1)

    ;; As the NFT contract owner, approve the marketplace to handle transfers
    (contract-call? .creator-nft set-approved-all .marketplace true)

    ;; List token 1 for sale for 100 STX (100,000,000 micro-STX)
    (contract-call? .marketplace list-token u1 u100000000)

    ;; As another user (e.g., wallet_2), buy the token
    ;; (as-contract (stx-transfer? u100000000 tx-sender .marketplace))
    ```

This setup provides a solid foundation for your dApp's on-chain logic.