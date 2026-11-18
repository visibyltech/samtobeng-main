# SAMTOB P&C Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Integrity**: Every customer-owned document (`users/{uid}`, `orders`, `save_to_buy_plans`, `payments`) MUST bind `userId` / `uid` to `request.auth.uid` on create and keep it immutable on update.
2. **Email Verification Mandate**: All authenticated mutations require `request.auth.token.email_verified == true`.
3. **RBAC Isolation**: Customers can never self-assign `role: "admin"` or write to `/admins/*`, `/products/*`, `/categories/*`, or `/site_settings/*`.
4. **Master Gate on Subcollections**: `/save_to_buy_plans/{planId}/installments/{installmentId}` MUST validate parent ownership via `get()` on `/save_to_buy_plans/{planId}`.
5. **No False Payment Verification**: Customers can submit `receiptUrl` and set `paymentStatus: "awaiting_verification"`, but ONLY an admin can set `paymentStatus: "verified"`, `orderStatus: "confirmed"`, or `status: "verified"` / `eligibleForDelivery: true`.
6. **Terminal State Locking**: Once an order is `delivered` or `cancelled`, or a Save-to-Buy plan is `completed` or `cancelled`, customers cannot mutate it; only admins can make corrections.
7. **Strict Keys & Size Bounds**: Every document enforces `keys().hasAll(...) && keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and `.size()` limits on all strings and lists.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoof on Order**: Signed-in User A sends `{ userId: "user-B", ... }` to `/orders/ord-1`. Expected: `PERMISSION_DENIED`.
2. **Self-Assigned Admin Role**: Signed-in User A sends `{ uid: "user-A", role: "admin", ... }` to `/users/user-A`. Expected: `PERMISSION_DENIED`.
3. **Email Spoof (Unverified)**: Attacker with `email: "usitakatelvin@gmail.com"` and `email_verified: false` attempts write to `/products/p1`. Expected: `PERMISSION_DENIED`.
4. **Shadow Field Injection (Ghost Field)**: User A adds `isVerified: true` or `adminOverride: true` to an `/orders` create/update. Expected: `PERMISSION_DENIED`.
5. **Payment Status Bypass**: User A updates their own order `/orders/ord-1` with `{ paymentStatus: "verified", orderStatus: "confirmed" }`. Expected: `PERMISSION_DENIED`.
6. **Installment Self-Verification**: User A submits an installment to `/save_to_buy_plans/plan-1/installments/inst-1` with `status: "verified"`. Expected: `PERMISSION_DENIED`.
7. **PII Cross-Read**: User A calls `get` on `/orders/ord-of-user-B` or `/users/user-B`. Expected: `PERMISSION_DENIED`.
8. **Blanket Query Scraping**: User A runs unbounded `list` on `/orders` without `where('userId', '==', uid)`. Expected: `PERMISSION_DENIED`.
9. **Resource Poisoning (Oversized ID)**: User A creates a document with ID length > 128 chars or invalid characters (`../bad`). Expected: `PERMISSION_DENIED`.
10. **Payload Size Exhaustion**: User A submits a 50KB string in `customerName` or `address` or `receiptUrl`. Expected: `PERMISSION_DENIED`.
11. **Terminal State Mutation**: User A attempts to update an order after `orderStatus == "delivered"` or a plan after `status == "completed"`. Expected: `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: User A creates `/orders/ord-1` with a backdated `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
