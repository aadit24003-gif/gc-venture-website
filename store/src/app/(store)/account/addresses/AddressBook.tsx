'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { deleteAddress, makeDefaultAddress, saveAddress, type AddressForm } from '../actions';
import { STATES, matchState } from '@/lib/india';
import { formatPhone } from '@/lib/format';
import { toast } from '@/components/Toaster';

type A = { id: number; label: string | null; name: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string; isDefault: boolean };

function Form({ initial, onDone, id }: { initial: AddressForm; onDone: () => void; id: number | null }) {
  const [f, setF] = useState<AddressForm>(initial);
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const [pending, start] = useTransition();
  const e = (k: string) => (err?.field === k ? err.text : null);
  const set = (k: keyof AddressForm, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const lookup = async (pin: string) => {
    try {
      const j = (await (await fetch(`https://api.postalpincode.in/pincode/${pin}`)).json()) as { PostOffice?: { District: string; State: string }[] }[];
      const po = j?.[0]?.PostOffice?.[0];
      if (po) setF((x) => ({ ...x, city: x.city || po.District, state: x.state || matchState(po.State) || x.state }));
    } catch { /* type it */ }
  };
  const p = `a${id ?? 'new'}`;
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(ev) => { ev.preventDefault(); start(async () => { const r = await saveAddress(id, f); if (!r.ok) setErr({ text: r.error, field: r.field }); else { toast(r.message ?? 'Saved'); onDone(); } }); }}>
      <div><label htmlFor={`${p}-label`} className="label">Label (optional)</label><input id={`${p}-label`} className="field" placeholder="Home, Office, Hostel" value={f.label ?? ''} onChange={(x) => set('label', x.target.value)} /></div>
      <div><label htmlFor={`${p}-name`} className="label">Full name</label><input id={`${p}-name`} className="field" value={f.name} onChange={(x) => set('name', x.target.value)} />{e('name') && <p className="error-text">{e('name')}</p>}</div>
      <div><label htmlFor={`${p}-phone`} className="label">Mobile</label><input id={`${p}-phone`} className="field" inputMode="tel" value={f.phone} onChange={(x) => set('phone', x.target.value)} />{e('phone') && <p className="error-text">{e('phone')}</p>}</div>
      <div><label htmlFor={`${p}-pin`} className="label">PIN code</label><input id={`${p}-pin`} className="field" inputMode="numeric" maxLength={6} value={f.pincode} onChange={(x) => { const v = x.target.value.replace(/\D/g, ''); set('pincode', v); if (v.length === 6) void lookup(v); }} />{e('pincode') && <p className="error-text">{e('pincode')}</p>}</div>
      <div className="sm:col-span-2"><label htmlFor={`${p}-l1`} className="label">Flat, house number, street</label><input id={`${p}-l1`} className="field" value={f.line1} onChange={(x) => set('line1', x.target.value)} />{e('line1') && <p className="error-text">{e('line1')}</p>}</div>
      <div><label htmlFor={`${p}-l2`} className="label">Area (optional)</label><input id={`${p}-l2`} className="field" value={f.line2 ?? ''} onChange={(x) => set('line2', x.target.value)} /></div>
      <div><label htmlFor={`${p}-lm`} className="label">Landmark (optional)</label><input id={`${p}-lm`} className="field" value={f.landmark ?? ''} onChange={(x) => set('landmark', x.target.value)} /></div>
      <div><label htmlFor={`${p}-city`} className="label">City</label><input id={`${p}-city`} className="field" value={f.city} onChange={(x) => set('city', x.target.value)} />{e('city') && <p className="error-text">{e('city')}</p>}</div>
      <div><label htmlFor={`${p}-state`} className="label">State</label><select id={`${p}-state`} className="field" value={f.state} onChange={(x) => set('state', x.target.value)}><option value="">Choose</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>{e('state') && <p className="error-text">{e('state')}</p>}</div>
      <label className="flex items-center gap-2 text-[14px] sm:col-span-2"><input type="checkbox" className="check" checked={!!f.isDefault} onChange={(x) => set('isDefault', x.target.checked)} /> Make this my default address</label>
      {err && !err.field && <p className="error-text sm:col-span-2">{err.text}</p>}
      <div className="flex gap-2 sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save address'}</button><button type="button" className="btn btn-quiet" onClick={onDone}>Cancel</button></div>
    </form>
  );
}

export default function AddressBook({ list, defaults }: { list: A[]; defaults: { name: string; phone: string } }) {
  const [editing, setEditing] = useState<number | 'new' | null>(list.length ? null : 'new');
  const [pending, start] = useTransition();
  const blank: AddressForm = { label: '', name: defaults.name, phone: defaults.phone, line1: '', line2: '', landmark: '', city: '', state: '', pincode: '', isDefault: list.length === 0 };
  return (
    <div className="mt-6 space-y-4">
      {list.map((a) => (
        <div key={a.id} className="card p-5">
          {editing === a.id ? (
            <Form id={a.id} initial={{ ...a, isDefault: a.isDefault }} onDone={() => setEditing(null)} />
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="text-[14.5px]">{a.label && <span className="pill pill-done mr-2">{a.label}</span>}{a.isDefault && <span className="pill pill-ink mr-2">Default</span>}<br className={a.label || a.isDefault ? '' : 'hidden'} /><b>{a.name}</b>, {formatPhone(a.phone)}<br /><span className="text-mute">{a.line1}{a.line2 ? `, ${a.line2}` : ''}{a.landmark ? `, near ${a.landmark}` : ''}, {a.city}, {a.state} {a.pincode}</span></p>
              <div className="flex flex-wrap gap-2">
                {!a.isDefault && <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await makeDefaultAddress(a.id); toast(r.ok ? r.message ?? 'Done' : r.error, r.ok ? 'ok' : 'error'); })}>Make default</button>}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(a.id)}>Edit</button>
                <button type="button" className="btn btn-quiet btn-sm text-bad" disabled={pending} onClick={() => { if (confirm('Remove this address?')) start(async () => { const r = await deleteAddress(a.id); toast(r.ok ? r.message ?? 'Removed' : r.error, r.ok ? 'ok' : 'error'); }); }}>Remove</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {editing === 'new' ? (
        <div className="card p-5"><p className="mb-4 font-semibold">New address</p><Form id={null} initial={blank} onDone={() => setEditing(null)} /></div>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setEditing('new')}><Plus size={16} /> Add an address</button>
      )}
    </div>
  );
}
