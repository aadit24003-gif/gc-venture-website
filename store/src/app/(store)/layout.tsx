import { isDemo } from '@/lib/config';
import { getViewer } from '@/lib/auth/session';
import { getCart } from '@/lib/cart';
import { CartProvider } from '@/components/cart/CartContext';
import CartDrawer from '@/components/cart/CartDrawer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CompareTray from '@/components/compare/CompareTray';
import { razorpayConfigured } from '@/lib/providers/razorpay';
import Scenes from '@/components/Scenes';
import { getSettings } from '@/lib/settings';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [viewer, cart, settings] = await Promise.all([getViewer(), getCart(), getSettings()]);
  return (
    <CartProvider initial={cart}>
      {isDemo() && (
        <aside aria-label="Demo mode" className="bg-accent-soft text-[13px] font-medium text-accent-ink">
          <p className="wrap py-1.5 text-center">Demo mode: sample stock, sign-in codes on screen{razorpayConfigured() ? '' : ', simulated payments'}. Nothing is charged.</p>
        </aside>
      )}
      <Header viewer={viewer ? { name: viewer.user.name, isStaff: viewer.isStaff } : null} bookingAmount={settings.shipping.bookingEnabled ? settings.shipping.bookingAmount : null} />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <CompareTray />
      <CartDrawer />
      <Scenes />
    </CartProvider>
  );
}
