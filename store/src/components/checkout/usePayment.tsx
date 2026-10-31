'use client';

/**
 * Opens Razorpay Checkout for an order (or the demo sheet when Razorpay isn't set up)
 * and reports the outcome to the server. Returns 'paid', 'failed' or 'dismissed'.
 */
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CreditCard, Smartphone } from 'lucide-react';
import { beginPayment, completeDemoPayment, confirmRazorpayPayment, reportPaymentFailure } from '@/app/checkout/actions';
import { rupees } from '@/lib/format';

type Outcome = 'paid' | 'failed' | 'dismissed';

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance }
}

function loadScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function usePayment() {
  const [demo, setDemo] = useState<{ number: string; amount: number; resolve: (o: Outcome) => void } | null>(null);

  const pay = useCallback(async (number: string): Promise<{ outcome: Outcome; error?: string }> => {
    const start = await beginPayment(number);
    if (!start.ok) return { outcome: 'failed', error: start.error };

    if (start.mode === 'demo') {
      const outcome = await new Promise<Outcome>((resolve) => setDemo({ number, amount: start.amount, resolve }));
      setDemo(null);
      if (outcome === 'dismissed') return { outcome };
      const r = await completeDemoPayment(number, outcome === 'paid' ? 'success' : 'failure');
      if (!r.ok) return { outcome: 'failed', error: r.error };
      return { outcome, error: outcome === 'failed' ? 'The payment didn’t go through (simulated). Try again.' : undefined };
    }

    if (!(await loadScript()) || !window.Razorpay) return { outcome: 'failed', error: 'The payment window could not load. Check your connection and try again.' };
    return new Promise((resolve) => {
      let settled = false;
      const rzp = new window.Razorpay!({
        key: start.keyId,
        order_id: start.rzpOrderId,
        amount: start.amount,
        currency: 'INR',
        name: start.name,
        description: start.description,
        prefill: start.prefill,
        theme: { color: '#0F3D33' },
        handler: async (resp: RazorpayResponse) => {
          settled = true;
          const r = await confirmRazorpayPayment(number, resp);
          resolve(r.ok ? { outcome: 'paid' } : { outcome: 'failed', error: r.error });
        },
        modal: { ondismiss: () => { if (!settled) resolve({ outcome: 'dismissed' }); }, confirm_close: true },
      });
      rzp.on('payment.failed', (resp) => {
        void reportPaymentFailure(number, resp.error?.description ?? 'Payment failed');
      });
      rzp.open();
    });
  }, []);

  const sheet = (
    <AnimatePresence>
      {demo && (
        <motion.div className="fixed inset-0 z-[95] flex items-end justify-center bg-spruce/50 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="demo-pay-title"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="w-full max-w-[420px] rounded-t-[28px] bg-white p-6 sm:rounded-[28px]"
          >
            <p className="inline-block rounded-md bg-tag px-2 py-1 text-[12px] font-semibold text-spruce">Demo payment</p>
            <h2 id="demo-pay-title" className="mt-3 text-[26px]">Pay {rupees(demo.amount)}</h2>
            <p className="mt-2 text-[14.5px] text-mute">Razorpay keys aren’t set up yet, so this window stands in for the real one. No money moves. Choose what should happen:</p>
            <div className="mt-5 space-y-2">
              {[{ icon: Smartphone, label: 'UPI' }, { icon: CreditCard, label: 'Card' }].map(({ icon: I, label }) => (
                <button key={label} type="button" className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-line px-4 py-3.5 text-left hover:border-spruce" onClick={() => demo.resolve('paid')}>
                  <I size={20} className="text-spruce" /> <span className="flex-1 font-semibold text-spruce">Pay with {label}</span> <span className="text-[13px] text-pass">succeeds</span>
                </button>
              ))}
              <button type="button" className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-line px-4 py-3.5 text-left hover:border-alert" onClick={() => demo.resolve('failed')}>
                <span className="flex-1 font-semibold text-ink">Simulate a failed payment</span>
              </button>
            </div>
            <button type="button" className="btn btn-ghost mt-4 w-full" onClick={() => demo.resolve('dismissed')}>Close without paying</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { pay, sheet };
}
