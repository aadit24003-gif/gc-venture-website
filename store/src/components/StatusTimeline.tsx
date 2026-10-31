import { Check } from 'lucide-react';
import { TIMELINE, timelineIndex } from '@/lib/order-status';
import { formatDate } from '@/lib/format';

/** The 8-step order tracker. Steps light up to the current status; each shows when it happened. */
export default function StatusTimeline({ status, events, placedAt }: { status: string; events: { status: string; at: string }[]; placedAt: string }) {
  const cur = timelineIndex(status);
  const stopped = ['cancelled', 'payment_failed', 'delivery_failed'].includes(status);
  const when = (key: string) => key === 'placed' ? placedAt : [...events].reverse().find((e) => e.status === key)?.at;
  return (
    <ol className="grid gap-0 sm:grid-cols-8" aria-label="Order progress">
      {TIMELINE.map((s, i) => {
        const done = i <= cur && !(stopped && i === cur && status !== 'delivery_failed');
        const isCur = i === cur;
        const at = when(s.key);
        return (
          <li key={s.key} className="relative flex gap-3 pb-5 sm:flex-col sm:gap-2 sm:pb-0" aria-current={isCur ? 'step' : undefined}>
            {i < TIMELINE.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5 sm:left-7 sm:top-[13px] sm:h-0.5 sm:w-[calc(100%-16px)] ${i < cur ? 'bg-ink' : 'bg-line-2'}`} aria-hidden="true" />}
            <span className={`relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${done ? 'border-ink bg-ink text-white' : isCur ? 'border-ink bg-white' : 'border-line-2 bg-white'}`}>
              {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <span className="mono text-[11px] text-mute">{i + 1}</span>}
            </span>
            <span className="sm:pr-2">
              <span className={`block text-[13.5px] font-semibold leading-tight ${i <= cur ? 'text-ink' : 'text-faint'}`}>{s.label}</span>
              {at && i <= cur ? <span className="block text-[11.5px] text-mute">{formatDate(at, true)}</span> : null}
              <span className="sr-only">{done ? 'done' : isCur ? 'current step' : 'not yet'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
