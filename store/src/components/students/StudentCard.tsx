import { STUDENT } from '@/lib/config';

/** Hero illustration: a college ID with the discount tag tied on and a "Verified" stamp that lands once. */
export default function StudentCard() {
  const year = new Date().getFullYear();
  return (
    <div className="relative mx-auto w-full max-w-[460px] [perspective:1200px]" aria-hidden>
      <div className="student-card relative rotate-[-4deg] overflow-hidden rounded-[26px] bg-white shadow-[0_40px_80px_-40px_rgba(15,61,51,.55),0_2px_0_rgba(15,61,51,.05)]">
        <div className="flex items-center justify-between bg-spruce px-6 py-4 text-white">
          <span className="display text-[17px] font-bold">Student identity card</span>
          <span className="text-[13px] text-white/70">{year}–{String(year + 1).slice(2)}</span>
        </div>
        <div className="grid grid-cols-[96px_1fr] gap-5 p-6">
          <div className="flex h-[118px] items-end justify-center overflow-hidden rounded-2xl bg-bench">
            <svg width="76" height="96" viewBox="0 0 76 96"><circle cx="38" cy="34" r="20" fill="#c7d1c9" /><path d="M2 96c2-24 17-36 36-36s34 12 36 36z" fill="#c7d1c9" /></svg>
          </div>
          <div className="space-y-3 pt-1">
            {[['Name', 76], ['Course', 58], ['Roll number', 44], ['Valid until', 50]].map(([k, w]) => (
              <div key={k as string}>
                <p className="text-[11.5px] text-mute">{k}</p>
                <div className="mt-1 h-[9px] rounded-full bg-bench-2" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-hidden border-t border-dashed border-line px-6 py-3">
          {Array.from({ length: 34 }, (_, i) => <span key={i} className="h-5 bg-spruce/70" style={{ width: i % 3 ? 1.5 : 3 }} />)}
        </div>
        <div className="stamp absolute bottom-[70px] right-7 rotate-[-12deg] rounded-xl border-[3px] border-pass px-3 py-1.5 text-pass">
          <span className="display text-[22px] font-extrabold leading-none tracking-wide">Verified</span>
        </div>
      </div>
      <div className="absolute -right-3 -top-10 rotate-[10deg] md:-right-8">
        <span className="absolute left-1/2 top-[-34px] h-10 w-px bg-spruce/40" />
        <div className="qc-shadow">
          <div className="qc-tag [--tag-w:132px] text-center">
            <p className="text-[12px] font-semibold leading-none">students save</p>
            <p className="price mt-1 text-[44px] leading-none">{STUDENT.percent}%</p>
            <p className="mt-1 text-[12px] font-semibold">on every laptop</p>
          </div>
        </div>
      </div>
    </div>
  );
}
