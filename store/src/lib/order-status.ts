/** Order statuses, shared by server code and browser components. */
export type Tone = 'wait' | 'ok' | 'done' | 'bad' | 'info';

export const STATUS: Record<string, { label: string; tone: Tone; customer: string }> = {
  awaiting_payment: { label: 'Waiting for payment', tone: 'wait', customer: 'Complete the payment to confirm your order. The laptop is held for 30 minutes.' },
  payment_failed: { label: 'Payment failed', tone: 'bad', customer: 'The payment didn’t go through and nothing was charged. Try again.' },
  confirmed: { label: 'Confirmed', tone: 'ok', customer: 'Payment received. Your laptop is next in line for its final check.' },
  quality_check: { label: 'Final inspection', tone: 'ok', customer: 'We’re re-testing your unit and photographing it before packing.' },
  packed: { label: 'Packed', tone: 'ok', customer: 'Packed with its charger and waiting for the courier.' },
  shipped: { label: 'Shipped', tone: 'ok', customer: 'Handed to the courier.' },
  in_transit: { label: 'In transit', tone: 'ok', customer: 'On its way to your city.' },
  out_for_delivery: { label: 'Out for delivery', tone: 'ok', customer: 'Arriving today. Keep your phone handy for the delivery code.' },
  delivered: { label: 'Delivered', tone: 'done', customer: 'Delivered. Your warranty has started.' },
  delivery_failed: { label: 'Delivery failed', tone: 'bad', customer: 'The courier couldn’t deliver. We’ll contact you to arrange another attempt.' },
  cancelled: { label: 'Cancelled', tone: 'bad', customer: 'This order was cancelled.' },
  returned: { label: 'Returned', tone: 'info', customer: 'The laptop came back to us.' },
};

/** The 8 steps a customer sees. */
export const TIMELINE = [
  { key: 'placed', label: 'Order placed' },
  { key: 'confirmed', label: 'Payment confirmed' },
  { key: 'quality_check', label: 'Final inspection' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
] as const;

/** Forward order of fulfilment statuses (index into TIMELINE). */
export const FLOW = ['awaiting_payment', 'confirmed', 'quality_check', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'] as const;

/** How far along the timeline an order is (0..7), or -1 if cancelled before confirmation. */
export function timelineIndex(status: string): number {
  if (status === 'payment_failed' || status === 'awaiting_payment') return 0;
  if (status === 'delivery_failed') return 6;
  if (status === 'returned') return 7;
  const i = (FLOW as readonly string[]).indexOf(status);
  return i;
}

/** Statuses staff can move an order to next, from each status. */
export const NEXT_STATUS: Record<string, string[]> = {
  confirmed: ['quality_check', 'cancelled'],
  quality_check: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['in_transit', 'out_for_delivery', 'delivered', 'delivery_failed'],
  in_transit: ['out_for_delivery', 'delivered', 'delivery_failed'],
  out_for_delivery: ['delivered', 'delivery_failed'],
  delivery_failed: ['out_for_delivery', 'returned'],
  delivered: ['returned'],
  awaiting_payment: ['cancelled'],
  payment_failed: ['cancelled'],
};

/** Statuses an admin can move an order to. */
export const ADMIN_STATUSES = ['quality_check', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'cancelled', 'returned'] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Unpaid', tone: 'wait' },
  paid: { label: 'Paid', tone: 'done' },
  failed: { label: 'Failed', tone: 'bad' },
  cod_due: { label: 'Pay on delivery', tone: 'wait' },
  refunded: { label: 'Refunded', tone: 'info' },
  partially_refunded: { label: 'Partly refunded', tone: 'info' },
};

export const CANCELLABLE_BY_CUSTOMER = ['awaiting_payment', 'payment_failed', 'confirmed', 'quality_check'];
