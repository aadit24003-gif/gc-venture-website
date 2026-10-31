'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { compare, COMPARE_MAX, useCompare } from './compare-store';

/** Bottom bar listing the laptops picked for comparison. Hidden on the compare page itself and in checkout. */
export default function CompareTray() {
  const list = useCompare();
  const path = usePathname();
  const hidden = path.startsWith('/compare') || path.startsWith('/checkout') || path.startsWith('/admin');
  return (
    <AnimatePresence>
      {list.length > 0 && !hidden && (
        <motion.aside
          aria-label="Compare laptops"
          initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          className="fixed inset-x-3 bottom-3 z-[45] mx-auto flex max-w-[860px] flex-wrap items-center gap-2 rounded-[22px] bg-spruce p-2.5 pl-4 text-white shadow-[0_20px_50px_-20px_rgba(15,61,51,.7)]"
        >
          <span className="mr-1 text-[14px] text-white/75">Compare {list.length}/{COMPARE_MAX}</span>
          <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {list.map((i) => (
              <li key={i.slug} className="flex items-center gap-1 rounded-full bg-white/10 py-1 pl-3 pr-1 text-[13.5px]">
                <span className="max-w-[160px] truncate">{i.title}</span>
                <button type="button" onClick={() => compare.remove(i.slug)} className="rounded-full p-1 hover:bg-white/15" aria-label={`Remove ${i.title} from compare`}><X size={13} /></button>
              </li>
            ))}
          </ul>
          <Link href={`/compare?ids=${list.map((i) => i.slug).join(',')}`} aria-disabled={list.length < 2}
            className={`btn btn-tag btn-sm ${list.length < 2 ? 'pointer-events-none opacity-50' : ''}`}>
            {list.length < 2 ? 'Pick one more' : 'Compare now'}
          </Link>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
