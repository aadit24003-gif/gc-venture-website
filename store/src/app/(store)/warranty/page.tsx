import Link from 'next/link';
import CmsPage, { cmsMetadata } from '@/components/CmsPage';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => cmsMetadata('warranty');

export default function Page() {
  return <CmsPage slug="warranty" aside={<div className="rounded-card bg-ink p-6 text-white/75"><p className="text-[18px] font-semibold text-white">Make a claim</p><p className="mt-2 text-[14.5px]">Open Warranty in your account, choose the laptop and describe the fault. We arrange a free pickup.</p><Link href="/account/warranty" className="btn btn-accent btn-sm mt-4">Your warranties</Link></div>} />;
}
