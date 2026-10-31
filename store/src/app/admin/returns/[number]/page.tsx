import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { requestByNumber, KIND_LABEL, SERVICE_NEXT, SERVICE_STATUS, type ServiceKind } from '@/lib/service';
import { db } from '@/lib/db';
import { warranties } from '@/lib/db/schema';
import { formatDate, formatPhone, rupees } from '@/lib/format';
import { ActionForm } from '@/components/admin/ActionForm';
import { PageHead, Panel } from '../../ui';
import { updateRequestAction } from '../actions';

export default async function RequestAdmin({ params }: { params: Promise<{ number: string }> }) {
  const v = await requireStaff('service.manage');
  const r = await requestByNumber((await params).number);
  if (!r || !r.order) notFound();
  const { request: q, events, order: o, item } = r;
  const d = await db();
  const [w] = item ? await d.select().from(warranties).where(eq(warranties.orderItemId, item.id)).limit(1) : [];
  const next = SERVICE_NEXT[q.status] ?? [];
  return (
    <div>
      <PageHead back={{ href: '/admin/returns', label: 'Returns and warranty' }} title={`${KIND_LABEL[q.kind as ServiceKind]} ${q.number}`}
        intro={<span className="flex flex-wrap items-center gap-2"><span className={`pill pill-${SERVICE_STATUS[q.status]?.tone ?? 'info'}`}>{SERVICE_STATUS[q.status]?.label ?? q.status}</span>Opened {formatDate(q.createdAt, true)} · order <Link href={`/admin/orders/${o.number}`} className="mono underline">{o.number}</Link></span>} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="What the customer said">
            <p className="text-[14px]"><b>{q.reason}</b></p>
            <p className="mt-2 whitespace-pre-line text-[14.5px]">{q.details}</p>
            {q.photos.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{q.photos.map((k) => <a key={k} href={`/api/admin/service-file?key=${encodeURIComponent(k)}`} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl border border-line">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/admin/service-file?key=${encodeURIComponent(k)}`} alt="Customer photo" className="aspect-square w-full object-cover" /></a>)}</div>}
          </Panel>
          <Panel title="History">
            <ol className="space-y-3 text-[13.5px]">{events.map((e) => <li key={e.id} className={`rounded-xl p-3 ${e.internal ? 'bg-warn-soft' : 'bg-canvas'}`}><b>{SERVICE_STATUS[e.status]?.label ?? e.status}</b>{e.internal ? ' · internal' : ''} <span className="text-mute">{formatDate(e.createdAt, true)}</span>{e.note && <p className="mt-1 whitespace-pre-line">{e.note}</p>}</li>)}</ol>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Update">
            <ActionForm action={updateRequestAction.bind(null, q.id)} submit="Save update" reset>
              {next.length > 0 && <label className="label" htmlFor="rs">New status</label>}
              {next.length > 0 && <select id="rs" name="status" className="field" defaultValue=""><option value="">Keep as {SERVICE_STATUS[q.status]?.label.toLowerCase()}</option>{next.map((s) => <option key={s} value={s}>{SERVICE_STATUS[s]?.label ?? s}</option>)}</select>}
              <label className="label mt-3" htmlFor="rn">Note</label>
              <textarea id="rn" name="note" className="field" placeholder="Pickup booked for Tuesday with Delhivery, AWB 1234." />
              <label className="label mt-3" htmlFor="rr">Resolution (shown to the customer)</label>
              <input id="rr" name="resolution" className="field" defaultValue={q.resolution ?? ''} />
              <label className="mt-3 flex items-center gap-2 text-[14px]"><input type="checkbox" name="internal" className="check" /> Internal note only (not emailed)</label>
            </ActionForm>
            {v.can('refunds.manage') && <p className="mt-4 text-[13px] text-mute">To refund, use the refund box on the <Link href={`/admin/orders/${o.number}`} className="underline">order</Link>. For a replacement, place a new order for the customer and note it here.</p>}
          </Panel>
          <Panel title="Laptop and customer">
            <p className="text-[14px]">{item ? <><b>{item.title}</b><br /><span className="mono text-[12.5px]">{item.unitCode ? <Link href={`/admin/inventory/${item.unitCode}`} className="underline">{item.unitCode}</Link> : null} · serial {item.serialNumber}</span><br />Paid {rupees(item.unitPrice - item.studentDiscount)}</> : 'Whole order'}</p>
            {w && <p className="mt-2 text-[13.5px]">Warranty {w.status}, {formatDate(w.startsAt)} – {formatDate(w.endsAt)}</p>}
            <p className="mt-3 text-[14px]">{o.address.name} · {formatPhone(o.address.phone)}{o.email ? ` · ${o.email}` : ''}<br /><span className="text-mute">{o.address.city}, {o.address.state} {o.address.pincode}</span></p>
            <p className="mt-2 text-[13px] text-mute">Delivered {o.deliveredAt ? formatDate(o.deliveredAt) : '—'}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
