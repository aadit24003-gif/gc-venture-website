import { cardProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

/** Card-sized catalogue for the search dialog and other client widgets. */
export async function GET() {
  const items = await cardProducts();
  return Response.json(items, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' } });
}
