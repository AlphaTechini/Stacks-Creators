;; SPDX-License-Identifier: MIT

;; marketplace.clar
;;
;; This contract provides a simple marketplace for trading creator-nft tokens.
;; It allows owners to list their NFTs for a specific price in STX.
;; Other users can then purchase these NFTs. A small fee is collected by the contract owner.

;; ---
;; Constants
;; ---
(define-constant ERR-NOT-AUTHORIZED (err u101))
(define-constant ERR-NOT-LISTED (err u102))
(define-constant ERR-WRONG-PRICE (err u103))
(define-constant ERR-ALREADY-LISTED (err u104))
(define-constant FEE-PERCENTAGE u25) ;; 2.5%

(define-data-var contract-owner principal tx-sender)

;; Define the NFT contract this marketplace will trade
(define-constant NFT-CONTRACT .creator-nft)

;; ---
;; Data Structures
;; ---
(define-tuple listing { price uint, seller principal })
(define-map listings uint (tuple (price uint) (seller principal)))

;; ---
;; Public Functions
;; ---

;; @desc Lists an NFT for sale on the marketplace.
;; @param token-id: The ID of the NFT to list.
;; @param price: The selling price in micro-STX.
;; @returns (response bool) True if the listing is successful.
(define-public (list-token (token-id uint) (price uint))
  (let ((seller tx-sender))
    (asserts! (is-none (map-get? listings token-id)) ERR-ALREADY-LISTED)
    ;; Check that the tx-sender is the owner of the NFT
    (asserts! (is-eq (some seller) (unwrap-panic (contract-call? NFT-CONTRACT get-owner token-id))) ERR-NOT-AUTHORIZED)
    
    (map-set listings token-id { price: price, seller: seller })
    (ok true)
  )
)

;; @desc Buys a listed NFT.
;; @param token-id: The ID of the NFT to buy.
;; @param price: The price the buyer is paying (must match the listing).
;; @returns (response bool) True if the purchase is successful.
(define-public (buy-token (token-id uint) (price uint))
  (let 
    ((buyer tx-sender)
     (listing (unwrap! (map-get? listings token-id) ERR-NOT-LISTED))
     (listing-price (get price listing))
     (seller (get seller listing))
     (fee (/ (* listing-price FEE-PERCENTAGE) u100)))

    (asserts! (is-eq price listing-price) ERR-WRONG-PRICE)

    ;; Transfer STX from buyer to seller and contract owner
    (try! (stx-transfer? (- listing-price fee) tx-sender seller))
    (try! (stx-transfer? fee tx-sender (var-get contract-owner)))

    ;; Transfer the NFT from seller to buyer
    (try! (as-contract (begin
      (contract-call? NFT-CONTRACT transfer token-id seller buyer)
    )))

    ;; Remove the listing
    (map-delete listings token-id)

    (print { type: "nft_purchase", token_id: token-id, buyer: buyer, seller: seller, price: price })
    (ok true)
  )
)

;; @desc Unlists an NFT from the marketplace.
;; @param token-id: The ID of the NFT to unlist.
;; @returns (response bool) True if unlisting is successful.
(define-public (unlist-token (token-id uint))
  (let 
    ((listing (unwrap! (map-get? listings token-id) ERR-NOT-LISTED))
     (seller (get seller listing)))
    (asserts! (is-eq tx-sender seller) ERR-NOT-AUTHORIZED)
    (map-delete listings token-id)
    (ok true)
  )
)

;; ---
;; Read-Only Functions
;; ---

;; @desc Gets the details of a specific listing.
;; @param token-id: The ID of the token.
;; @returns (response (optional (tuple (price uint) (seller principal)))) The listing details.
(define-read-only (get-listing (token-id uint))
  (map-get? listings token-id)
)