import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { brands, categories, products } from '@/lib/db/schema';
import { ActionForm, RunButton } from '@/components/admin/ActionForm';
import { PageHead, Panel } from '../ui';
import { deleteCategory, saveBrand, saveCategory } from './actions';

export const metadata = { title: 'Brands and categories' };

function Fields({ name, description, sort, active, id }: { name: string; description: string; sort: number; active: boolean; id: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
      <div><label htmlFor={`${id}-n`} className="label">Name</label><input id={`${id}-n`} name="name" className="field" defaultValue={name} /></div>
      <div><label htmlFor={`${id}-s`} className="label">Order</label><input id={`${id}-s`} name="sort" className="field mono" defaultValue={sort} inputMode="numeric" /></div>
      <div className="sm:col-span-2"><label htmlFor={`${id}-d`} className="label">Description (shown on its page)</label><textarea id={`${id}-d`} name="description" className="field !min-h-[64px]" defaultValue={description} /></div>
      <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="active" className="check" defaultChecked={active} /> Visible</label>
    </div>
  );
}

export default async function Catalogue() {
  await requireStaff('catalogue.manage');
  const d = await db();
  const [bs, cs, ps] = await Promise.all([
    d.select().from(brands).orderBy(brands.sort), d.select().from(categories).orderBy(categories.sort),
    d.select({ brand: products.brand, categories: products.categories, n: sql<number>`1` }).from(products),
  ]);
  return (
    <div>
      <PageHead title="Brands and categories" intro="Each has its own page in the store (/brands/… and /category/…). Assign categories to models in the model editor." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Brands">
          <ul className="space-y-3">{bs.map((b) => (
            <li key={b.slug}><details className="rounded-xl border border-line p-3"><summary className="flex cursor-pointer items-center justify-between"><b>{b.name}</b><span className="text-[13px] text-mute">{ps.filter((p) => p.brand === b.name).length} models · <Link href={`/brands/${b.slug}`} className="underline" target="_blank">page</Link>{b.active ? '' : ' · hidden'}</span></summary>
              <ActionForm action={saveBrand.bind(null, b.slug)} className="mt-3"><Fields id={`b-${b.slug}`} name={b.name} description={b.description} sort={b.sort} active={b.active} /></ActionForm></details></li>
          ))}</ul>
          <details className="mt-4"><summary className="btn btn-ghost btn-sm list-none">Add a brand</summary><ActionForm action={saveBrand.bind(null, null)} className="mt-3" reset><Fields id="b-new" name="" description="" sort={100} active /></ActionForm></details>
        </Panel>
        <Panel title="Categories">
          <ul className="space-y-3">{cs.map((c) => (
            <li key={c.slug}><details className="rounded-xl border border-line p-3"><summary className="flex cursor-pointer items-center justify-between"><b>{c.name}</b><span className="text-[13px] text-mute">{ps.filter((p) => p.categories.includes(c.slug)).length} models · <Link href={`/category/${c.slug}`} className="underline" target="_blank">page</Link>{c.active ? '' : ' · hidden'}</span></summary>
              <ActionForm action={saveCategory.bind(null, c.slug)} className="mt-3"><Fields id={`c-${c.slug}`} name={c.name} description={c.description} sort={c.sort} active={c.active} /></ActionForm>
              <div className="mt-2"><RunButton action={deleteCategory.bind(null, c.slug)} label="Delete category" confirmText={`Delete ${c.name}? It is removed from every model.`} className="btn btn-quiet btn-sm text-bad" /></div></details></li>
          ))}</ul>
          <details className="mt-4"><summary className="btn btn-ghost btn-sm list-none">Add a category</summary><ActionForm action={saveCategory.bind(null, null)} className="mt-3" reset><Fields id="c-new" name="" description="" sort={100} active /></ActionForm></details>
        </Panel>
      </div>
    </div>
  );
}
