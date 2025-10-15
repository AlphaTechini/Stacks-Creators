;; SPDX-License-Identifier: MIT

(define-trait nft-trait
  ((get-last-token-id () (response uint uint))
   (get-token-uri (uint) (response (optional (string-ascii 256)) uint))
   (get-owner (uint) (response (optional principal) uint))
   (transfer (uint principal principal) (response bool uint))))

;; From https://github.com/stacksgov/sips/blob/main/sips/sip-009/sip-009-nft-standard.md