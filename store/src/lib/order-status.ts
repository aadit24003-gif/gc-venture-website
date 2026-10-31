/** Order statuses, shared by server code and browser components. */
export const STATUS: Record<string, { label: string; tone: 'wait' | 'ok' | 'done' | 'bad' }> = {
  awaiting_payment: { label: 'Waiting for payment', tone: 'wait' },
  payment_failed: { label: 'Payment failed', tone: 'bad' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  packed: { label: 'Packed', tone: 'ok' },
  shipped: { label: 'Shipped', tone: 'ok' },
  delivered: { label: 'Delivered', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  returned: { label: 'Returned', tone: 'bad' },
};
export const TIMELINE = ['confirmed', 'packed', 'shipped', 'delivered'] as const;
/** Statuses an admin can move an order to. */
export const ADMIN_STATUSES = ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'] as const;
