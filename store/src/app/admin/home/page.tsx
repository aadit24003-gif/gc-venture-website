import { asc } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { brands, products } from '@/lib/db/schema';
import { getSettings } from '@/lib/settings';
import { PageHead } from '../ui';
import HomeEditor from './HomeEditor';

export const metadata = { title: 'Home page' };

export default async function AdminHome() {
  await requireStaff('content.manage');
  const d = await db();
  const [s, models, brandRows] = await Promise.all([
    getSettings(),
    d.select({ slug: products.slug, title: products.title, brand: products.brand, images: products.images }).from(products).orderBy(asc(products.brand), asc(products.title)),
    d.select({ name: brands.name }).from(brands).orderBy(asc(brands.sort), asc(brands.name)),
  ]);
  return (
    <div>
      <PageHead title="Home page" intro="The headline and the brand tiles at the top of the store. Changes appear as soon as you save." actions={<a href="/" target="_blank" className="btn btn-ghost btn-sm">View the store ↗</a>} />
      <HomeEditor initial={s.home} models={models.map((m) => ({ slug: m.slug, title: m.title, brand: m.brand, photos: m.images.length }))} brands={brandRows.map((b) => b.name)} />
    </div>
  );
}
