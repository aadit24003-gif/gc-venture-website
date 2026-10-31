'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { addPart, moveUnit, recordInspection } from '../actions';
import { toast } from '@/components/Toaster';

const LABEL: Record<string, string> = { intake: 'Intake', inspection: 'In inspection', refurbishing: 'Refurbishing', available: 'List for sale', reserved: 'Reserved', sold: 'Sold', returned: 'Returned', rma: 'Repair / RMA', hold: 'Put on hold', scrapped: 'Scrap' };

export function StatusMover({ code, moves }: { code: string; moves: string[] }) {
  const router = useRouter();
  const [to, setTo] = useState(moves[0] ?? '');
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  if (!moves.length) return <p className="text-[14px] text-mute">This unit is in an order; its status follows the order.</p>;
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Move to">
        {moves.map((m) => <button key={m} type="button" className="chip !min-h-8 !text-[13px]" aria-pressed={to === m} onClick={() => setTo(m)}>{LABEL[m] ?? m}</button>)}
      </div>
      <label htmlFor="mv-n" className="label mt-3">Note (optional)</label>
      <input id="mv-n" className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className={`btn btn-sm mt-3 ${to === 'scrapped' ? 'btn-danger' : 'btn-primary'}`} disabled={pending || !to}
        onClick={() => { if (to === 'scrapped' && !confirm('Scrap this unit? It can’t be undone.')) return; start(async () => { const r = await moveUnit(code, to, note); if (!r.ok) toast(r.error, 'error'); else { toast(r.message ?? 'Done'); setNote(''); router.refresh(); } }); }}>
        {pending ? 'Saving…' : LABEL[to] ?? to}
      </button>
    </div>
  );
}

type Check = { group: string; item: string; result: 'pass' | 'fail' | 'na'; note?: string | null };

export function InspectionForm({ code, checks: base, defaults }: { code: string; checks: { group: string; items: string[] }[]; defaults: { inspector: string; battery: number | null; cycles: number | null; ssd: number | null } }) {
  const router = useRouter();
  const initial = useMemo<Check[]>(() => base.flatMap((g) => g.items.map((item) => ({ group: g.group, item, result: 'pass' as const }))), [base]);
  const [checks, setChecks] = useState<Check[]>(initial);
  const [inspector, setInspector] = useState(defaults.inspector);
  const [battery, setBattery] = useState(defaults.battery?.toString() ?? '');
  const [cycles, setCycles] = useState(defaults.cycles?.toString() ?? '');
  const [ssd, setSsd] = useState(defaults.ssd?.toString() ?? '');
  const [summary, setSummary] = useState('');
  const [pending, start] = useTransition();
  const fails = checks.filter((c) => c.result === 'fail').length;
  const set = (i: number, patch: Partial<Check>) => setChecks((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await recordInspection(code, { inspectorName: inspector, batteryHealth: battery ? Number(battery) : null, batteryCycles: cycles ? Number(cycles) : null, ssdHealth: ssd ? Number(ssd) : null, checks, summary: summary || null });
      if (!r.ok) toast(r.error, 'error'); else { toast(r.message ?? 'Saved'); router.refresh(); }
    }); }}>
      <div className="grid gap-3 sm:grid-cols-4">
        <div><label htmlFor="in-who" className="label">Inspector</label><input id="in-who" className="field" value={inspector} onChange={(e) => setInspector(e.target.value)} /></div>
        <div><label htmlFor="in-b" className="label">Battery %</label><input id="in-b" className="field mono" inputMode="numeric" value={battery} onChange={(e) => setBattery(e.target.value.replace(/\D/g, ''))} /></div>
        <div><label htmlFor="in-c" className="label">Cycles</label><input id="in-c" className="field mono" inputMode="numeric" value={cycles} onChange={(e) => setCycles(e.target.value.replace(/\D/g, ''))} /></div>
        <div><label htmlFor="in-s" className="label">SSD health %</label><input id="in-s" className="field mono" inputMode="numeric" value={ssd} onChange={(e) => setSsd(e.target.value.replace(/\D/g, ''))} /></div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {base.map((g) => (
          <fieldset key={g.group} className="rounded-xl border border-line p-3">
            <legend className="px-1 text-[13.5px] font-semibold">{g.group}</legend>
            <ul className="space-y-1.5">
              {checks.map((c, i) => c.group !== g.group ? null : (
                <li key={c.item} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 flex-1">{c.item}</span>
                  <span className="flex shrink-0 gap-1" role="radiogroup" aria-label={c.item}>
                    {(['pass', 'fail', 'na'] as const).map((r) => (
                      <button key={r} type="button" aria-pressed={c.result === r} onClick={() => set(i, { result: r })}
                        className={`h-7 rounded-md px-2 text-[11.5px] font-semibold ${c.result === r ? (r === 'pass' ? 'bg-ok text-white' : r === 'fail' ? 'bg-bad text-white' : 'bg-ink-3 text-white') : 'bg-canvas text-mute'}`}>{r === 'na' ? 'N/A' : r === 'pass' ? 'Pass' : 'Fail'}</button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
      <label htmlFor="in-sum" className="label mt-4">Summary (shown on the public report)</label>
      <textarea id="in-sum" className="field !min-h-[64px]" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="All checks passed. Replaced the keyboard with a new OEM part." />
      <div className="mt-3 flex items-center gap-3"><button className="btn btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Record inspection'}</button><span className={`text-[13.5px] ${fails ? 'text-bad' : 'text-ok'}`}>{fails ? `${fails} failing` : `All ${checks.length} passing`}</span></div>
    </form>
  );
}

export function PartForm({ code, canCost }: { code: string; canCost: boolean }) {
  const router = useRouter();
  const [part, setPart] = useState('');
  const [detail, setDetail] = useState('');
  const [cost, setCost] = useState('');
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addPart(code, { part, detail, cost: cost ? Number(cost) : null }); if (!r.ok) toast(r.error, 'error'); else { toast(r.message ?? 'Saved'); setPart(''); setDetail(''); setCost(''); router.refresh(); } }); }}>
      <div><label htmlFor="pt-p" className="label">Part</label><input id="pt-p" className="field" list="parts" value={part} onChange={(e) => setPart(e.target.value)} /><datalist id="parts">{['Battery', 'Keyboard', 'SSD', 'Screen', 'Hinge', 'Touchpad', 'Fan', 'Charger', 'Palm rest', 'Bottom cover', 'Wi-Fi card'].map((x) => <option key={x} value={x} />)}</datalist></div>
      <div><label htmlFor="pt-d" className="label">Detail</label><input id="pt-d" className="field" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="New OEM, 57 Wh" /></div>
      {canCost && <div><label htmlFor="pt-c" className="label">Cost ₹</label><input id="pt-c" className="field mono w-[110px]" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ''))} /></div>}
      <button className="btn btn-ghost" disabled={pending}>Log part</button>
    </form>
  );
}
