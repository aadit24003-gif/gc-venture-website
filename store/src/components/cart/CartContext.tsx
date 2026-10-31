'use client';

/**
 * The cart lives on the server (see lib/cart.ts). This context holds the latest copy for the
 * header count and the drawer, and calls server actions to change it.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CartView } from '@/lib/cart';
import { addToCartAction, removeCartAction, updateCartAction, refreshCartAction } from '@/app/cart/actions';

type Sel = { ramGb: number; ssdGb: number; warrantyMonths: number };
type Ctx = {
  cart: CartView;
  count: number;
  open: boolean;
  busy: boolean;
  setOpen: (v: boolean) => void;
  add: (unitId: string, sel: Sel, opts?: { open?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  update: (itemId: number, sel: Sel) => Promise<{ ok: boolean; error?: string }>;
  remove: (itemId: number) => Promise<void>;
  refresh: () => Promise<void>;
  has: (unitId: string) => boolean;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ initial, children }: { initial: CartView; children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView>(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const add = useCallback<Ctx['add']>(async (unitId, sel, opts) => {
    setBusy(true);
    try {
      const r = await addToCartAction(unitId, sel);
      if (!r.ok) return { ok: false, error: r.error };
      setCart(r.cart);
      if (opts?.open !== false) setOpen(true);
      router.refresh();
      return { ok: true };
    } finally { setBusy(false); }
  }, [router]);

  const update = useCallback<Ctx['update']>(async (itemId, sel) => {
    setBusy(true);
    try {
      const r = await updateCartAction(itemId, sel);
      if (!r.ok) return { ok: false, error: r.error };
      setCart(r.cart);
      router.refresh();
      return { ok: true };
    } finally { setBusy(false); }
  }, [router]);

  const remove = useCallback(async (itemId: number) => {
    setBusy(true);
    try {
      const r = await removeCartAction(itemId);
      if (r.ok) setCart(r.cart);
      router.refresh();
    } finally { setBusy(false); }
  }, [router]);

  const refresh = useCallback(async () => setCart(await refreshCartAction()), []);

  const value = useMemo<Ctx>(() => ({
    cart, count: cart.count, open, busy, setOpen, add, update, remove, refresh,
    has: (unitId) => cart.lines.some((l) => l.unitId === unitId),
  }), [cart, open, busy, add, update, remove, refresh]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
}
