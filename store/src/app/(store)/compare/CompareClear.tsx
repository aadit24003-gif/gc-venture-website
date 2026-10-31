'use client';

import { useRouter } from 'next/navigation';
import { compare } from '@/components/compare/compare-store';

export default function CompareClear() {
  const router = useRouter();
  return <button type="button" className="btn btn-ghost btn-sm" onClick={() => { compare.clear(); router.push('/laptops'); }}>Clear and start again</button>;
}
