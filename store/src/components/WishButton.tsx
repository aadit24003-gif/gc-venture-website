'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleWishlistAction } from '@/app/(store)/account/wishlist-actions';
import { toast } from './Toaster';

export default function WishButton({ productId, title, initial, variant = 'icon' }: { productId: string; title: string; initial: boolean; variant?: 'icon' | 'button' }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const r = await toggleWishlistAction(productId);
      if (!r.ok) {
        toast(r.error, 'error');
        if (r.signIn) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      setOn(r.on);
      toast(r.on ? `Saved ${title} to your wishlist` : 'Removed from your wishlist');
    });
  };
  if (variant === 'button') {
    return (
      <button type="button" onClick={click} disabled={pending} aria-pressed={on} className="btn btn-ghost">
        <Heart size={18} className={on ? 'fill-ink' : ''} aria-hidden="true" /> {on ? 'Saved' : 'Save'}
      </button>
    );
  }
  return (
    <button type="button" onClick={click} disabled={pending} aria-pressed={on} aria-label={on ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
      className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-[var(--shadow-card)] backdrop-blur transition hover:scale-105">
      <Heart size={17} className={on ? 'fill-ink' : ''} aria-hidden="true" />
    </button>
  );
}
