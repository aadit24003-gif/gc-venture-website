import { STATUS } from '@/lib/order-status';

export default function Pill({ status }: { status: string }) {
  const st = STATUS[status] ?? { label: status, tone: 'wait' };
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${st.tone === 'bad' ? 'bg-alert-soft text-alert' : st.tone === 'wait' ? 'bg-tag-soft text-spruce' : 'bg-pass-soft text-pass'}`}>{st.label}</span>;
}
