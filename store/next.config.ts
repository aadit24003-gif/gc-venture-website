import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite (local database) loads its WebAssembly from its own folder, so it must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite', 'sharp'],
  poweredByHeader: false,
  devIndicators: false,
  // The database migrations are read at runtime on first start, so ship them with every function.
  outputFileTracingIncludes: { '/**/*': ['./drizzle/**/*', './src/lib/og-fonts/*'] },
  turbopack: { root: path.join(import.meta.dirname) },
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
