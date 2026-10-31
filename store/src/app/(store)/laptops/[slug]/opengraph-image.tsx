import { ImageResponse } from 'next/og';
import { getProduct, toCard } from '@/lib/products';
import { CHECK_COUNT, GRADES, POLICY } from '@/lib/config';
import { digits, gb } from '@/lib/format';
import { savedPct } from '@/lib/pricing';
import { C, OG_SIZE, OgCert, OgLogo, OgRupee, ogFonts, ogPhoto } from '@/lib/og';
import LaptopArt from '@/components/LaptopArt';

export const alt = 'Refurbished laptop with its price and inspection report';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  const fonts = await ogFonts();
  if (!p) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: C.canvas }} />, { ...size, fonts });
  const card = toCard(p);
  const saved = savedPct(card.fromPrice, p.newPrice);
  const best = card.bestBattery;
  const photo = p.images[0] ? await ogPhoto(p.images[0].src, 500, 360) : null;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.canvas, padding: '54px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 590 }}>
          <OgLogo />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 25, color: C.mute }}>{p.brand}{p.year ? ` · ${p.year}` : ''} · certified refurbished</div>
            <div style={{ display: 'flex', fontFamily: 'Display', fontSize: p.model.length > 16 ? 50 : 62, lineHeight: 1.04, color: C.ink, letterSpacing: -2, marginTop: 6 }}>{p.model}</div>
            <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 25, color: C.ink, marginTop: 12 }}>{p.cpuShort} · {gb(p.ramGb)} · {gb(p.ssdGb)} SSD · {p.screenIn}-inch</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Display', fontSize: 72, color: C.ink, lineHeight: 1 }}><OgRupee size={56} />{digits(card.fromPrice)}</div>
            {saved ? <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 24, color: C.white, background: C.deal, borderRadius: 10, padding: '6px 12px', marginBottom: 10 }}>Save {saved}% vs new</div> : null}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative', flex: 1 }}>
          <div style={{ display: 'flex', width: 470, height: 340, background: C.white, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
            {photo ? <img src={photo} width={450} height={324} alt="" /> : <div style={{ display: 'flex', width: 420, height: 290 }}><LaptopArt art={p.art} brand={p.brand} slug={p.slug} flat noText /></div>}
          </div>
          <div style={{ display: 'flex', position: 'absolute', right: -6, bottom: -30 }}>
            <OgCert width={320} title="Inspection" seal={`${CHECK_COUNT}/${CHECK_COUNT}`} rows={[['Units on sale', String(card.unitsOnSale || 'Sold out')], ['Best battery', best ? `${best}%` : `${GRADES[card.fromGrade].batteryMin}%+`], ['Warranty', `${POLICY.warrantyMonths} months`]]} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
