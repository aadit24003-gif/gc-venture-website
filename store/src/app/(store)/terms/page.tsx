import CmsPage, { cmsMetadata } from '@/components/CmsPage';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => cmsMetadata('terms');

export default function Page() {
  return <CmsPage slug="terms" />;
}
