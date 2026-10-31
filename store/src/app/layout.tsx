import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/funnel-display/wght.css';
import '@fontsource-variable/funnel-sans/wght.css';
import '@fontsource-variable/funnel-sans/wght-italic.css';
import '@fontsource-variable/geist-mono/wght.css';
import './globals.css';
import { BRAND } from '@/lib/config';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name}: certified refurbished laptops in India`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: { siteName: BRAND.name, locale: 'en_IN', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
