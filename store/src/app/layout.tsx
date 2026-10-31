import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/funnel-display/wght.css';
import '@fontsource-variable/funnel-sans/wght.css';
import '@fontsource-variable/funnel-sans/wght-italic.css';
import '@fontsource-variable/geist-mono/wght.css';
import './globals.css';
import { BRAND, isDemo } from '@/lib/config';
import { getViewer } from '@/lib/auth/session';
import { getCart } from '@/lib/cart';
import { CartProvider } from '@/components/cart/CartContext';
import CartDrawer from '@/components/cart/CartDrawer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from '@/components/Toaster';
import CompareTray from '@/components/compare/CompareTray';
import { razorpayConfigured } from '@/lib/providers/razorpay';

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name}: certified refurbished laptops in India`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: { siteName: BRAND.name, locale: 'en_IN', type: 'website' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = { themeColor: '#ffffff' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [viewer, cart] = await Promise.all([getViewer(), getCart()]);
  const demo = isDemo();
  return (
    <html lang="en-IN">
      <body className="flex min-h-dvh flex-col">
        <CartProvider initial={cart}>
          {demo && (
            <aside aria-label="Demo mode" className="bg-accent text-[13px] font-medium text-ink">
              <p className="wrap py-1.5 text-center">
                Demo mode: sample stock, sign-in codes on screen{razorpayConfigured() ? '' : ', simulated payments'}. Nothing is charged.
              </p>
            </aside>
          )}
          <Header viewer={viewer ? { name: viewer.user.name, isStaff: viewer.isStaff } : null} />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
          <CompareTray />
          <CartDrawer />
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
