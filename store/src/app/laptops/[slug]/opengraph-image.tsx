import { ImageResponse } from 'next/og';
import { getProduct, toCard } from '@/lib/products';
import { CHECK_COUNT, GRADES, POLICY } from '@/lib/config';
import { digits, gb } from '@/lib/format';
import { savedPct } from '@/lib/pricing';
import { C, OG_SIZE, OgLogo, OgRupee, OgTag, ogFonts } from '@/lib/og';
import LaptopArt from '@/components/LaptopArt';

export const alt = 'Refurbished laptop with its price and condition report';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  const fonts = await ogFonts();
  if (!p) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: C.bench }} />, { ...size, fonts });
  const card = toCard(p);
  const saved = savedPct(card.fromPrice, p.newPrice);
  const g = GRADES[card.fromGrade];
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.bench, padding: '56px 64px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 600 }}>
          <OgLogo />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontFamily: 'Instrument', fontSize: 26, color: C.mute }}>{p.brand}{p.year ? `, ${p.year}` : ''}, refurbished</div>
            <div style={{ display: 'flex', fontFamily: 'Bricolage', fontSize: 70, lineHeight: 1.02, color: C.spruce, letterSpacing: -2, marginTop: 6 }}>{p.model}</div>
            <div style={{ display: 'flex', fontFamily: 'Instrument', fontSize: 26, color: C.ink, marginTop: 14 }}>{p.cpuShort}, {gb(p.ramGb)}, {gb(p.ssdGb)} SSD, {p.screenIn}″</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Bricolage', fontSize: 84, color: C.spruce, lineHeight: 1 }}><OgRupee size={64} />{digits(card.fromPrice)}</div>
            {saved ? <div style={{ display: 'flex', fontFamily: 'Instrument', fontSize: 26, color: C.pass, paddingBottom: 10 }}>{saved}% below new</div> : null}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', flex: 1 }}>
          <div style={{ display: 'flex', width: 470, height: 323 }}>
            <LaptopArt art={p.art} brand={p.brand} slug={p.slug} flat noText />
          </div>
          <div style={{ display: 'flex', position: 'absolute', right: -10, bottom: -40 }}>
            <OgTag width={300} title="Condition report" rows={[['Grade', g.label], ['Battery health', `${g.batteryMin}%+`], ['Checks passed', `${CHECK_COUNT}/${CHECK_COUNT}`], ['Warranty', `${POLICY.warrantyMonths} months`]]} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
