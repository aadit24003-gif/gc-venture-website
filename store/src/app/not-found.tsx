import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[60vh] flex-col items-start justify-center py-20">
      <div className="qc-shadow rotate-[-4deg]">
        <div className="qc-tag [--tag-w:180px] text-center">
          <p className="text-[13px] font-semibold">Checks passed</p>
          <p className="price text-[48px] leading-none">0/1</p>
        </div>
      </div>
      <h1 className="mt-10 text-[40px] md:text-[56px]">This page didn’t pass.</h1>
      <p className="mt-3 max-w-[50ch] text-[17px] text-mute">The link may be old or mistyped. The laptops are all still here.</p>
      <div className="mt-8 flex gap-3"><Link href="/laptops" className="btn btn-primary">Browse laptops</Link><Link href="/" className="btn btn-ghost">Home</Link></div>
    </div>
  );
}
