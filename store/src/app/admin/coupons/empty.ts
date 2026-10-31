import type { CouponForm } from './actions';

export const EMPTY_COUPON: CouponForm = { code: '', kind: 'percent', value: 5, minSubtotal: 0, maxDiscount: null, usageLimit: null, perUserLimit: 1, firstOrderOnly: false, productIds: [], brands: [], startsAt: null, endsAt: null, note: null, active: true };
