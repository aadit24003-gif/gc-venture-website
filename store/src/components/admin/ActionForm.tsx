'use client';

/**
 * Generic client wrappers for server actions that return { ok, error?, message? }.
 * ActionForm posts its fields as FormData; RunButton calls an action with no arguments
 * (bind the arguments on the server: action.bind(null, id)).
 */
import { useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { toast } from '../Toaster';

type Result = { ok: boolean; error?: string; message?: string; redirect?: string };

export function ActionForm({ action, children, submit = 'Save', className = '', reset = false, confirmText, danger }: {
  action: (fd: FormData) => Promise<Result>; children: React.ReactNode; submit?: string; className?: string; reset?: boolean; confirmText?: string; danger?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form ref={ref} className={className} onSubmit={(e) => {
      e.preventDefault();
      if (confirmText && !confirm(confirmText)) return;
      const fd = new FormData(e.currentTarget);
      start(async () => {
        const r = await action(fd);
        if (!r.ok) { toast(r.error ?? 'Something went wrong', 'error'); return; }
        toast(r.message ?? 'Saved');
        if (reset) ref.current?.reset();
        if (r.redirect) router.push(r.redirect); else router.refresh();
      });
    }}>
      {children}
      <div className="mt-3"><button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={pending}>{pending ? 'Saving…' : submit}</button></div>
    </form>
  );
}

export function RunButton({ action, label, confirmText, className = 'btn btn-ghost btn-sm' }: { action: () => Promise<Result>; label: string; confirmText?: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className={className} disabled={pending} onClick={() => {
      if (confirmText && !confirm(confirmText)) return;
      start(async () => {
        const r = await action();
        if (!r.ok) toast(r.error ?? 'Something went wrong', 'error');
        else { toast(r.message ?? 'Done'); if (r.redirect) router.push(r.redirect); else router.refresh(); }
      });
    }}>{pending ? '…' : label}</button>
  );
}
