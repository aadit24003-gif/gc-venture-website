import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/checkout', '/cart', '/orders', '/login', '/register', '/forgot', '/reset', '/verify-email', '/api', '/units'] }],
    sitemap: `${BRAND.url}/sitemap.xml`,
  };
}
