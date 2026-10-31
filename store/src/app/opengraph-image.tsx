import { ImageResponse } from 'next/og';
import { BRAND, CHECK_COUNT, POLICY, STUDENT } from '@/lib/config';
import { C, OG_SIZE, OgLogo, OgTag, ogFonts } from '@/lib/og';

export const alt = `${BRAND.name}: certified refurbished laptops with a condition report on every one`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.bench, padding: 64, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 640 }}>
          <OgLogo />
          <div style={{ display: 'flex', fontFamily: 'Bricolage', fontSize: 76, lineHeight: 1.02, color: C.spruce, letterSpacing: -2.5 }}>Every laptop arrives with its test results.</div>
          <div style={{ display: 'flex', fontFamily: 'Instrument', fontSize: 26, color: C.mute }}>Dell, HP, Lenovo and MacBooks. {POLICY.warrantyMonths}-month warranty. Students save {STUDENT.percent}%.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 10 }}>
          <OgTag title="Condition report" rows={[['Grade', 'Excellent'], ['Battery health', '80% or more'], ['SSD health', '90% or more'], ['Checks passed', `${CHECK_COUNT} of ${CHECK_COUNT}`]]} />
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
