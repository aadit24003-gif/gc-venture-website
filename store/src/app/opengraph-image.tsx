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
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.canvas, padding: 60, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 600 }}>
          <OgLogo />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 52, lineHeight: 1.06, color: C.ink, letterSpacing: -2 }}>Business laptops. Half the price.</div>
            <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 52, lineHeight: 1.06, color: C.accent, letterSpacing: -2, marginTop: 4 }}>Checked on video first.</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 21, color: C.mute }}>Video check before dispatch · serial match on delivery · {POLICY.warrantyMonths}-month warranty</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative', width: 480 }}>
          {photo ? <img src={photo} width={480} height={350} style={{ borderRadius: 24, background: C.white }} alt="" /> : null}
          <div style={{ display: 'flex', position: 'absolute', bottom: -20, left: 16 }}>
            <OgCert width={330} title="Inspection report" seal={`${CHECK_COUNT}/${CHECK_COUNT}`} rows={[['Battery health', 'measured'], ['SSD health', 'measured'], ['Every mark', 'noted']]} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
