'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { decideStudent } from './actions';
import { toast } from '@/components/Toaster';

const REASONS = [
  'The photo is blurred or cut off. Please take a clearer photo.',
  'The ID has expired. Please upload a current one.',
  'The name on the ID doesn’t match the name given.',
  'This isn’t a student ID.',
];

export default function StudentDecision({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);

  const decide = (d: 'approve' | 'reject') => start(async () => {
    const r = await decideStudent(id, d, reason);
    if (!r.ok) { toast(r.error, 'error'); return; }
    toast(d === 'approve' ? 'Approved and emailed' : 'Rejected and emailed');
    router.refresh();
  });

  return (
    <div className="mt-5">
      {!rejecting ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => decide('approve')}>Approve</button>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setRejecting(true)}>Reject</button>
        </div>
      ) : (
        <div className="rounded-2xl bg-bench p-4">
          <fieldset>
            <legend className="label">Reason (sent to the student)</legend>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label key={r} className="flex items-start gap-2 text-[14.5px]"><input type="radio" name={`reason-${id}`} className="mt-1 accent-[var(--color-spruce)]" checked={reason === r} onChange={() => setReason(r)} />{r}</label>
              ))}
              <label className="flex items-start gap-2 text-[14.5px]"><input type="radio" name={`reason-${id}`} className="mt-1 accent-[var(--color-spruce)]" checked={!REASONS.includes(reason)} onChange={() => setReason('')} />Other</label>
            </div>
          </fieldset>
          {!REASONS.includes(reason) && <textarea className="field mt-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write the reason" aria-label="Other reason" />}
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-sm bg-alert text-white hover:bg-alert/90" disabled={pending || !reason.trim()} onClick={() => decide('reject')}>Reject and email</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
