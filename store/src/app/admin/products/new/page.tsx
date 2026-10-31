import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { brands, categories } from '@/lib/db/schema';
import { PageHead } from '../../ui';
import ProductEditor from '../ProductEditor';
import { BLANK } from '../blank';

export const metadata = { title: 'Add a model' };

export default async function NewLaptop() {
  await requireStaff('catalogue.manage');
  const d = await db();
  const [cats, brandRows] = await Promise.all([
    d.select({ slug: categories.slug, name: categories.name }).from(categories).orderBy(categories.sort),
    d.select({ name: brands.name }).from(brands).where(eq(brands.active, true)).orderBy(brands.sort, brands.name),
  ]);
  return (
    <div>
      <PageHead back={{ href: '/admin/products', label: 'Laptop models' }} title="Add a model" intro="Add the model and its grade prices here, then receive units against it in Inventory. Photos can be uploaded on the next screen." />
      <ProductEditor initial={{ ...BLANK, brand: brandRows.some((b) => b.name === BLANK.brand) ? BLANK.brand : brandRows[0]?.name ?? BLANK.brand }} categories={cats} brands={brandRows.map((b) => b.name)} />
    </div>
  );
}
