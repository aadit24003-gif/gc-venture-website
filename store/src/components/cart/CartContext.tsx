'use client';

/**
 * The cart lives in the browser (localStorage) so it survives reloads and works
 * before sign-in. Prices here are a preview; checkout recomputes everything on the server.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ArtSpec } from '@/lib/db/schema';
import type { GradeKey } from '@/lib/config';

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  title: string;
  brand: string;
  art: ArtSpec;
  grade: GradeKey;
  ramGb: number;
  ssdGb: number;
  warrantyMonths: number;
  qty: number;
  unit: number;
  maxQty: number;
};

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (l: Omit<CartLine, 'key' | 'qty'> & { qty?: number }) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
const STORE = 'cart:v1';

export const lineKey = (l: Pick<CartLine, 'productId' | 'grade' | 'ramGb' | 'ssdGb' | 'warrantyMonths'>) =>
  `${l.productId}|${l.grade}|${l.ramGb}|${l.ssdGb}|${l.warrantyMonths}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setLines(JSON.parse(raw));
    } catch { /* private mode or bad data: start empty */ }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORE) {
        try { setLines(e.newValue ? JSON.parse(e.newValue) : []); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE, JSON.stringify(lines)); } catch { /* ignore */ }
  }, [lines, ready]);

  const add = useCallback<Ctx['add']>((l) => {
    const key = lineKey(l);
    setLines((prev) => {
      const found = prev.find((x) => x.key === key);
      if (found) return prev.map((x) => (x.key === key ? { ...x, qty: Math.min(x.maxQty, x.qty + (l.qty ?? 1)), unit: l.unit } : x));
      return [...prev, { ...l, key, qty: Math.min(l.maxQty, l.qty ?? 1) }];
    });
    setOpen(true);
  }, []);
  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => prev.map((x) => (x.key === key ? { ...x, qty: Math.max(1, Math.min(x.maxQty, qty)) } : x)));
  }, []);
  const remove = useCallback((key: string) => setLines((prev) => prev.filter((x) => x.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(() => ({
    lines, ready, open, setOpen, add, setQty, remove, clear,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.qty * l.unit, 0),
  }), [lines, ready, open, add, setQty, remove, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
}
