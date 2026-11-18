/**
 * Phase 0 TDD Security Spec Verification Suite for SAMTOB P&C Firestore Rules
 * Verifies the "Dirty Dozen" adversarial payloads and expected RBAC/ownership invariants.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  description: string;
  payload: Record<string, unknown>;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity Spoof on Order',
    collection: '/orders/ord-spoof-1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'User A attempts to create an order with userId set to User B',
    payload: { id: 'ord-spoof-1', userId: 'user-B', orderStatus: 'pending', paymentStatus: 'pending' }
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role',
    collection: '/users/user-A',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'User A attempts to create their profile with role: "admin"',
    payload: { uid: 'user-A', name: 'Attacker', email: 'a@example.com', role: 'admin' }
  },
  {
    id: 3,
    name: 'Email Spoof (Unverified)',
    collection: '/products/prod-spoof-1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'Unverified token matching admin email attempts product creation',
    payload: { id: 'prod-spoof-1', slug: 'spoof', name: 'Spoof Laptop', price: 1 }
  },
  {
    id: 4,
    name: 'Shadow Field Injection',
    collection: '/orders/ord-shadow-1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'User A injects ghost field isVerified: true on order creation',
    payload: { id: 'ord-shadow-1', userId: 'user-A', isVerified: true }
  },
  {
    id: 5,
    name: 'Payment Status Bypass',
    collection: '/orders/ord-1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'Customer tries to mark own order paymentStatus: "verified" and orderStatus: "confirmed"',
    payload: { paymentStatus: 'verified', orderStatus: 'confirmed' }
  },
  {
    id: 6,
    name: 'Installment Self-Verification',
    collection: '/save_to_buy_plans/plan-1/installments/inst-1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'Customer submits installment with status already set to "verified"',
    payload: { id: 'inst-1', planId: 'plan-1', userId: 'user-A', amount: 50000, status: 'verified' }
  },
  {
    id: 7,
    name: 'PII Cross-Read',
    collection: '/orders/ord-of-user-B',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'User A tries to read User B order containing customer PII',
    payload: {}
  },
  {
    id: 8,
    name: 'Blanket Query Scraping',
    collection: '/orders',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'User A attempts unbounded list query on /orders without userId filter',
    payload: {}
  },
  {
    id: 9,
    name: 'Resource Poisoning (Oversized/Invalid ID)',
    collection: '/orders/' + 'x'.repeat(200),
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'Attacker attempts document creation with >128 char document ID',
    payload: { id: 'x'.repeat(200), userId: 'user-A' }
  },
  {
    id: 10,
    name: 'Payload Size Exhaustion',
    collection: '/users/user-A',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'Attacker attempts 50KB address string beyond 500 char limit',
    payload: { address: 'A'.repeat(50000) }
  },
  {
    id: 11,
    name: 'Terminal State Mutation',
    collection: '/save_to_buy_plans/plan-completed',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'Customer attempts to cancel or alter a completed Save-to-Buy plan',
    payload: { status: 'cancelled' }
  },
  {
    id: 12,
    name: 'Client Timestamp Forgery',
    collection: '/orders/ord-time-1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    description: 'Attacker passes arbitrary client timestamp instead of serverTimestamp()',
    payload: { id: 'ord-time-1', userId: 'user-A', createdAt: '2020-01-01T00:00:00Z' }
  }
];
