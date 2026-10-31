import Link from 'next/link';
import CmsPage, { cmsMetadata } from '@/components/CmsPage';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => cmsMetadata('returns');

export default function Page() {
  return <CmsPage slug="returns" aside={<div className="rounded-card bg-ink p-6 text-white/75"><p className="text-[18px] font-semibold text-white">Start a return</p><p className="mt-2 text-[14.5px]">Open the order in your account and choose Return or Replacement. Guest? Find your order first.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/account/orders" className="btn btn-accent btn-sm">Your orders</Link><Link href="/track" className="btn btn-sm bg-white/10 text-white">Find an order</Link></div></div>} />;
}
