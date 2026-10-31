'use client';

import { useEffect } from 'react';
import { trackView } from '@/app/laptops/[slug]/actions';

export default function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => { trackView(productId).catch(() => {}); }, [productId]);
  return null;
}
