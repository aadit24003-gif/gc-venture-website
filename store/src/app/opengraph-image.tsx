import { ImageResponse } from 'next/og';
import { BRAND, CHECK_COUNT, POLICY } from '@/lib/config';
import { C, OG_SIZE, OgCert, OgLogo, ogFonts, ogPhoto } from '@/lib/og';

export const alt = `${BRAND.name}: certified pre-owned laptops, each listed with its own inspection report`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const photo = await ogPhoto('/products/lenovo-thinkpad-x1-carbon-gen-9/1.webp', 520, 380);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.ivory, padding: 60, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 600 }}>
          <OgLogo />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 17, letterSpacing: 4, color: C.accentInk }}>CERTIFIED PRE-OWNED LAPTOPS</div>
            <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 60, lineHeight: 1.0, color: C.ink, marginTop: 18 }}>Exceptional laptops,</div>
            <div style={{ display: 'flex', fontFamily: 'Display', fontStyle: 'italic', fontSize: 60, lineHeight: 1.0, color: C.accentInk, marginTop: 4 }}>honestly restored.</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 23, color: C.mute }}>{CHECK_COUNT}-point inspection · {POLICY.warrantyMonths}-month warranty · {POLICY.returnDays}-day returns</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative', width: 480 }}>
          {photo ? <img src={photo} width={480} height={350} style={{ borderRadius: 10, background: C.white, border: `1.5px solid ${C.line}` }} alt="" /> : null}
          <div style={{ display: 'flex', position: 'absolute', bottom: -20, left: 16 }}>
            <OgCert width={330} title="Inspection report" seal={`${CHECK_COUNT}/${CHECK_COUNT}`} rows={[['Battery health', 'measured'], ['SSD health', 'measured'], ['Every mark', 'noted']]} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
