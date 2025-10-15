;; SPDX-License-Identifier: MIT

;; creator-nft.clar
;;
;; This contract implements the SIP-009 standard for a non-fungible token (NFT).
;; It allows creators to mint new NFTs, which represent their digital creations.
;; Each token is associated with a metadata URI, typically pointing to a JSON file
;; hosted on a service like Cloudinary or IPFS.

;; ---
;; Traits
;; ---
(impl-trait .sip009-nft-trait.nft-trait)

;; ---
;; Constants
;; ---
(define-constant ERR-NOT-AUTHORIZED (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-OWNER-ONLY (err u103))
(define-constant ERR-MINT-FAILED (err u104))

;; ---
;; Data-vars and Maps
;; ---
(define-data-var contract-owner principal tx-sender)
(define-data-var last-token-id uint u0)
(define-map token-uris uint (string-ascii 256))
(define-map approved-contracts principal bool)
(define-data-var contract-uri (string-ascii 256) "https://example.com/collection.json")

;; Define the NFT asset
(define-non-fungible-token creator-nft uint)

;; ---
;; Public Functions
;; ---

;; @desc Mints a new NFT and assigns it to the caller.
;; @param recipient: The principal who will own the new NFT.
;; @param uri: The URI for the token's metadata.
;; @returns (response uint) The ID of the newly minted token.
(define-public (mint (recipient principal) (uri (string-ascii 256)))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-OWNER-ONLY)
    (let ((token-id (+ (var-get last-token-id) u1)))
      (try! (nft-mint? creator-nft token-id recipient) ERR-MINT-FAILED)
      (map-set token-uris token-id uri)
      (var-set last-token-id token-id)
      (print { type: "nft_mint", token_id: token-id, recipient: recipient })
      (ok token-id)
    )
  )
)

;; @desc Transfers an NFT from the sender to a new owner.
;; @param token-id: The ID of the token to transfer.
;; @param sender: The current owner of the token.
;; @param recipient: The new owner of the token.
;; @returns (response bool) True if the transfer is successful.
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    ;; The sender must be the owner of the token, or an approved contract.
    (asserts! (or (is-eq tx-sender sender) 
                  (is-eq (map-get? approved-contracts tx-sender) (some true)))
              ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (some sender) (nft-get-owner? creator-nft token-id)) ERR-NOT-AUTHORIZED)
    
    (try! (nft-transfer? creator-nft token-id sender recipient))
    (ok true)
  )
)

;; ---
;; Read-Only Functions
;; ---

;; @desc Gets the owner of a specific token.
;; @param token-id: The ID of the token.
;; @returns (response principal) The owner of the token.
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? creator-nft token-id))
)

;; @desc Gets the URI for a specific token's metadata.
;; @param token-id: The ID of the token.
;; @returns (response (optional (string-ascii 256))) The URI of the token.
(define-read-only (get-token-uri (token-id uint))
  (ok (map-get? token-uris token-id))
)

;; @desc Gets the contract's metadata URI.
;; @returns (response (string-ascii 256)) The contract's URI.
(define-read-only (get-contract-uri)
  (ok (var-get contract-uri))
)

;; @desc Gets the ID of the last token that was minted.
;; @returns (response uint) The last token ID.
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; ---
;; Admin Functions
;; ---

;; @desc Sets the contract owner.
;; @param new-owner: The principal of the new owner.
;; @returns (response bool) True if successful.
(define-public (set-contract-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-OWNER-ONLY)
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; @desc Approves or revokes a contract's ability to transfer NFTs on behalf of users.
;; @param contract: The contract principal to approve/revoke.
;; @param approved: A boolean indicating approval status.
;; @returns (response bool) True if successful.
(define-public (set-approved-all (contract principal) (approved bool))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-OWNER-ONLY)
    (map-set approved-contracts contract approved)
    (ok true)
  )
)