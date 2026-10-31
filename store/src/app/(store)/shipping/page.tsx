import CmsPage, { cmsMetadata } from '@/components/CmsPage';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => cmsMetadata('shipping');

export default function Page() {
  return <CmsPage slug="shipping" />;
}
