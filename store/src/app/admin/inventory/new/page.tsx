import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { PageHead, Panel } from '../../ui';
import UnitForm from '../UnitForm';

export const metadata = { title: 'Receive a unit' };

export default async function NewUnit({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const v = await requireStaff('inventory.manage');
  const sp = await searchParams;
  const d = await db();
  const models = await d.select({ id: products.id, title: products.title, ramGb: products.ramGb, ssdGb: products.ssdGb }).from(products).orderBy(products.title);
  const m = models.find((x) => x.id === sp.product);
  return (
    <div className="max-w-[860px]">
      <PageHead back={{ href: '/admin/inventory', label: 'Inventory' }} title="Receive a unit" intro="Log a laptop as it arrives. It starts in Intake; record an inspection, then list it." />
      <Panel>
        <UnitForm models={models} canCost={v.can('inventory.cost')} initial={{ productId: m?.id ?? '', grade: 'excellent', serialNumber: '', ramGb: m?.ramGb ?? 8, ssdGb: m?.ssdGb ?? 256, batteryHealth: null, batteryCycles: null, ssdHealth: null, colour: null, keyboard: null, cosmeticNotes: null, internalNotes: null, price: null, purchaseCost: null, purchaseSource: null, purchaseRef: null, purchasedAt: null, location: null }} />
      </Panel>
    </div>
  );
}
