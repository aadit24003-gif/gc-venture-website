import Link from 'next/link';
import Logo from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[80vh] flex-col items-start justify-center py-20">
      <Link href="/" aria-label="Home"><Logo /></Link>
      <p className="mono mt-14 text-[13px] text-mute">ERROR 404 · CHECK FAILED</p>
      <h1 className="mt-3 text-[40px] md:text-[60px]">This page didn’t pass inspection.</h1>
      <p className="mt-3 max-w-[50ch] text-[17px] text-mute">The link may be old or mistyped. The laptops are all still here.</p>
      <div className="mt-8 flex gap-3"><Link href="/laptops" className="btn btn-primary">Browse laptops</Link><Link href="/" className="btn btn-ghost">Home</Link></div>
    </div>
  );
}
