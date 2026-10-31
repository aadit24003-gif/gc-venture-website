import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { BRAND, isDemo } from '@/lib/config';
import { getViewer } from '@/lib/auth/session';
import { CartProvider } from '@/components/cart/CartContext';
import CartDrawer from '@/components/cart/CartDrawer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/Toaster';
import { razorpayConfigured } from '@/lib/providers/razorpay';

const bricolage = localFont({
  src: './fonts/bricolage.woff2',
  variable: '--font-bricolage',
  weight: '200 800',
  display: 'swap',
});
const instrument = localFont({
  src: [
    { path: './fonts/instrument-sans.woff2', style: 'normal', weight: '400 700' },
    { path: './fonts/instrument-sans-italic.woff2', style: 'italic', weight: '400 700' },
  ],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name}: certified refurbished laptops in India`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: { siteName: BRAND.name, locale: 'en_IN', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#0f3d33' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const demo = isDemo();
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${instrument.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] btn btn-tag">Skip to content</a>
        <CartProvider>
          {demo && (
            <div className="bg-spruce text-[13.5px] text-white/85">
              <p className="wrap py-2 text-center">
                Demo mode: sign-in codes appear on screen{razorpayConfigured() ? '' : ' and payments are simulated'}. Nothing is charged.
              </p>
            </div>
          )}
          <Header viewer={viewer ? { name: viewer.user.name, isAdmin: viewer.isAdmin } : null} />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
