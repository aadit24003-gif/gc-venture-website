'use client';

/**
 * The closed lid seen from above, showing what each grade's wear looks like.
 * Marks fade in and out as the grade changes.
 */
import { AnimatePresence, motion } from 'motion/react';
import type { ArtSpec } from '@/lib/db/schema';
import type { GradeKey } from '@/lib/config';

const LID: Record<ArtSpec['colour'], { fill: string; edge: string; mark: string; dent: string }> = {
  black: { fill: '#24282b', edge: '#15181a', mark: 'rgba(255,255,255,.34)', dent: 'rgba(0,0,0,.45)' },
  graphite: { fill: '#474d52', edge: '#33383c', mark: 'rgba(255,255,255,.35)', dent: 'rgba(0,0,0,.35)' },
  silver: { fill: '#d3d7db', edge: '#b9bec3', mark: 'rgba(80,88,95,.42)', dent: 'rgba(60,68,75,.3)' },
  'space-grey': { fill: '#8b8f94', edge: '#73777c', mark: 'rgba(255,255,255,.38)', dent: 'rgba(0,0,0,.25)' },
  midnight: { fill: '#2f3845', edge: '#212833', mark: 'rgba(255,255,255,.3)', dent: 'rgba(0,0,0,.4)' },
  starlight: { fill: '#e6dfd2', edge: '#cfc7b8', mark: 'rgba(90,80,60,.35)', dent: 'rgba(80,70,50,.25)' },
};

/** Labels pointing at the marks: [mark x, mark y, label x, label y, text]. */
const NOTES: Record<GradeKey, [number, number, number, number, string][]> = {
  pristine: [],
  excellent: [[135, 89, 150, 52, 'Hairline, 3 cm'], [311, 216, 236, 250, 'Hairline, 2 cm']],
  good: [[120, 73, 132, 44, 'Scuff, 5 cm'], [330, 70, 252, 104, 'Small dent'], [46, 258, 76, 236, 'Corner wear'], [206, 235, 168, 206, 'Scuff']],
};

const EXCELLENT = [
  'M118 92 l34 -6',
  'M300 212 l22 9',
];
const GOOD = [
  'M96 78 l48 -10', 'M104 88 l26 -4', 'M286 206 l40 14', 'M312 96 l18 22', 'M180 236 l52 -3', 'M70 196 l10 24',
];

export default function LidMarks({ colour, grade, brand, className, annotate }: { colour: ArtSpec['colour']; grade: GradeKey; brand: string; className?: string; annotate?: boolean }) {
  const c = LID[colour];
  const marks = grade === 'good' ? GOOD : grade === 'excellent' ? EXCELLENT : [];
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label={`Lid of a ${grade} grade laptop${marks.length ? `, with ${marks.length} light marks` : ', with no visible marks'}`}>
      <defs>
        <linearGradient id="lid-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".08" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="284" rx="170" ry="8" fill="#0f3d33" opacity=".15" />
      <rect x="30" y="24" width="340" height="250" rx="18" fill={c.edge} />
      <rect x="34" y="28" width="332" height="242" rx="15" fill={c.fill} />
      <rect x="34" y="28" width="332" height="242" rx="15" fill="url(#lid-sheen)" />
      <rect x="80" y="24" width="240" height="5" rx="2" fill={c.edge} opacity=".8" />
      {brand === 'Apple' && <circle cx="200" cy="149" r="13" fill={c.edge} opacity=".55" />}
      {brand === 'Lenovo' && <text x="300" y="250" fontSize="13" fontFamily="Arial" fontStyle="italic" fontWeight="bold" fill={c.mark}>ThinkPad</text>}
      {brand === 'Dell' && <circle cx="200" cy="149" r="15" fill="none" stroke={c.mark} strokeWidth="2" />}
      {brand === 'HP' && <circle cx="200" cy="149" r="15" fill="none" stroke={c.mark} strokeWidth="2.5" />}

      <AnimatePresence>
        {marks.map((d, i) => (
          <motion.path
            key={`${grade}-${i}`}
            d={d}
            stroke={c.mark}
            strokeWidth={grade === 'good' && i % 2 === 0 ? 2.2 : 1.3}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
          />
        ))}
        {grade === 'good' && (
          <motion.g key="dent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.3 }}>
            <ellipse cx="330" cy="70" rx="9" ry="6" fill={c.dent} />
            <ellipse cx="331" cy="68" rx="6" ry="3.5" fill={c.mark} opacity=".5" />
            <path d="M36 248 q2 18 20 20" stroke={c.mark} strokeWidth="3" fill="none" strokeLinecap="round" />
          </motion.g>
        )}
        {annotate && NOTES[grade].map(([mx, my, lx, ly, text], i) => (
          <motion.g key={`${grade}-n${i}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.35 + i * 0.1 }}>
            <line x1={mx} y1={my} x2={lx + 4} y2={ly} stroke="#f5c84c" strokeWidth="1.2" />
            <circle cx={mx} cy={my} r="5" fill="none" stroke="#f5c84c" strokeWidth="1.6" />
            <rect x={lx - 4} y={ly - 13} width={text.length * 6.6 + 16} height="21" rx="10.5" fill="#f5c84c" />
            <text x={lx + 4} y={ly + 2} fontSize="11.5" fontWeight="600" fill="#0f3d33" style={{ fontFamily: 'var(--font-sans)' }}>{text}</text>
          </motion.g>
        ))}
        {annotate && grade === 'pristine' && (
          <motion.g key="clean" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }}>
            <rect x="136" y="186" width="128" height="24" rx="12" fill="#f5c84c" />
            <text x="200" y="202" fontSize="12" fontWeight="600" fill="#0f3d33" textAnchor="middle" style={{ fontFamily: 'var(--font-sans)' }}>No visible marks</text>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}
