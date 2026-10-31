'use client';

/** Up to three laptops picked for comparison, remembered in this browser. */
import { useSyncExternalStore } from 'react';

export type CompareItem = { slug: string; title: string };
const KEY = 'compare:v1';
export const COMPARE_MAX = 3;

let items: CompareItem[] = [];
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try { items = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { items = []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode */ }
  subs.forEach((s) => s());
}

export const compare = {
  toggle(item: CompareItem): 'added' | 'removed' | 'full' {
    load();
    if (items.some((i) => i.slug === item.slug)) { items = items.filter((i) => i.slug !== item.slug); save(); return 'removed'; }
    if (items.length >= COMPARE_MAX) return 'full';
    items = [...items, item]; save(); return 'added';
  },
  remove(slug: string) { load(); items = items.filter((i) => i.slug !== slug); save(); },
  clear() { items = []; save(); },
};

const EMPTY: CompareItem[] = [];
export function useCompare(): CompareItem[] {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => { load(); return items; },
    () => EMPTY,
  );
}
