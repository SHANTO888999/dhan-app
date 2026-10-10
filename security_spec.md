# Security Specification for Paddy Trading POS

## 1. Data Invariants
1. **User Scoping & Identity Isolation**: Each record (`paddy_varieties`, `farmers`, `purchases`, `parties`, `sales`, `payments`, `settings`) must strictly belong to the authenticated owner (`userId == request.auth.uid`). Users can never read, create, update, or delete records belonging to another merchant.
2. **Immutability of Key Associations**: Once a purchase or sale is created, `userId`, `invoiceNumber`, and `createdAt` cannot be maliciously changed to another user's identifier or forged back in time.
3. **Valid Identifiers & Input Boundaries**: Document IDs, phone numbers, and varieties must satisfy strict regex and length limits to prevent resource exhaustion attacks.
4. **Calculated Field Integrity**: Numerical amounts (`totalMon`, `ratePerMon`, `totalAmount`, `paidAmount`) must be non-negative numbers.

---

## 2. The "Dirty Dozen" Payloads (Must be Rejected)
1. **Payload 1: Unauthenticated Create** (Purchase write without authentication)
2. **Payload 2: Identity Spoofing** (`userId` set to someone else's UID on Farmer creation)
3. **Payload 3: Cross-User Read Attempt** (Reading another merchant's ledger or party details)
4. **Payload 4: Negative Rate Poisoning** (`ratePerMon: -1500` in Purchase document)
5. **Payload 5: Oversized String Injection** (`notes: 'A'.repeat(50000)` to trigger storage denial)
6. **Payload 6: Path Traversal/Junk Doc ID** (Using arbitrary doc ID with illegal chars > 128 bytes)
7. **Payload 7: Shadow Field Injection** (`isAdmin: true` or `verifiedRole: 'superadmin'` into settings or user document)
8. **Payload 8: Immutable Field Overwrite** (Updating `purchase.userId` to transfer an invoice)
9. **Payload 9: Unverified User Bypass** (Writing when `request.auth.token.email_verified == false`)
10. **Payload 10: Missing Required Key** (Purchase payload omitted `totalAmount` or `ratePerMon`)
11. **Payload 11: Non-numeric Weight** (`totalMon: "five mon"` instead of a number)
12. **Payload 12: Unauthorized Delete** (Deleting another user's sales shipment)
