import { ImageResponse } from 'next/og';
import { BRAND, CHECK_COUNT, POLICY, STUDENT } from '@/lib/config';
import { C, OG_SIZE, OgCert, OgLogo, ogFonts, ogPhoto } from '@/lib/og';

export const alt = `${BRAND.name}: certified refurbished laptops, each listed with its own inspection report`;
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
            <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 70, lineHeight: 1.0, color: C.ink, letterSpacing: -2.5 }}>Business-class laptops.</div>
            <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 70, lineHeight: 1.0, color: C.mute, letterSpacing: -2.5, marginTop: 6 }}>Half the price.</div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 25, color: C.mute }}>ThinkPad, Latitude, EliteBook, MacBook. {POLICY.warrantyMonths}-month warranty. Students save {STUDENT.percent}%.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative', width: 480 }}>
          {photo ? <img src={photo} width={480} height={350} style={{ borderRadius: 24, background: C.white }} alt="" /> : null}
          <div style={{ display: 'flex', position: 'absolute', bottom: -20, left: -30 }}>
            <OgCert width={330} title="Inspection report" seal={`${CHECK_COUNT}/${CHECK_COUNT}`} rows={[['Battery health', 'measured'], ['SSD health', 'measured'], ['Every mark', 'noted']]} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
