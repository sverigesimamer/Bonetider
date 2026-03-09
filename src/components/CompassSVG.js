import React from 'react';

export default function CompassSVG({ animNeedle, isAligned, theme, size = 280 }) {
  const C = size / 2, OR = size / 2 - 4, RR = OR - 28, IR = RR - 20;
  const rad = a => ((a - 90) * Math.PI) / 180;
  const px  = (a, r) => C + Math.cos(rad(a)) * r;
  const py  = (a, r) => C + Math.sin(rad(a)) * r;

  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const cards = [
    {l:'N',d:0},{l:'NE',d:45},{l:'E',d:90},{l:'SE',d:135},
    {l:'S',d:180},{l:'SW',d:225},{l:'W',d:270},{l:'NW',d:315},
  ];

  // Needle geometry
  const SL = IR - 16, TL = 26, AW = 9, HL = 20;
  const nr   = rad(animNeedle), perp = nr + Math.PI / 2;
  const tx   = C + Math.cos(nr) * SL, ty = C + Math.sin(nr) * SL;
  const lx   = C - Math.cos(nr) * TL, ly = C - Math.sin(nr) * TL;
  const h1x  = tx - Math.cos(nr)*HL + Math.cos(perp)*AW;
  const h1y  = ty - Math.sin(nr)*HL + Math.sin(perp)*AW;
  const h2x  = tx - Math.cos(nr)*HL - Math.cos(perp)*AW;
  const h2y  = ty - Math.sin(nr)*HL - Math.sin(perp)*AW;

  // Kaaba marker on ring
  const kmx = C + Math.cos(nr) * (RR - 2);
  const kmy = C + Math.sin(nr) * (RR - 2);

  const nc = isAligned ? theme.success : theme.accent;

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="cg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={theme.card} />
          <stop offset="100%" stopColor={theme.bgSecondary} />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Rings */}
      <circle cx={C} cy={C} r={OR} fill={theme.bgSecondary}
        stroke={isAligned ? theme.success : theme.border}
        strokeWidth={isAligned ? 3 : 1.5} />
      <circle cx={C} cy={C} r={RR + 6} fill="url(#cg)"
        stroke={theme.border} strokeWidth="1" opacity=".5" />
      <circle cx={C} cy={C} r={IR} fill={theme.card}
        stroke={theme.border} strokeWidth="1" />

      {/* Tick marks */}
      {ticks.map(d => {
        const isMaj = d % 90 === 0, isMid = d % 45 === 0, is10 = d % 10 === 0;
        const r1 = RR + 2, tl = isMaj ? 16 : isMid ? 11 : is10 ? 7 : 3;
        return (
          <line key={d}
            x1={px(d,r1)} y1={py(d,r1)}
            x2={px(d,r1-tl)} y2={py(d,r1-tl)}
            stroke={isMaj ? theme.accent : is10 ? theme.textMuted : theme.border}
            strokeWidth={isMaj ? 2.5 : is10 ? 1.5 : 1}
            opacity={isMaj ? 1 : is10 ? .5 : .2} />
        );
      })}

      {/* Cardinal labels */}
      {cards.map(({ l, d }) => {
        const r = RR - 20, isC = l.length === 1;
        return (
          <text key={l}
            x={px(d,r)} y={py(d,r) + (isC ? 5 : 4)}
            textAnchor="middle"
            fontSize={isC ? 13 : 9}
            fontWeight={isC ? 800 : 600}
            fill={l === 'N' ? theme.accent : isC ? theme.text : theme.textMuted}
            opacity={isC ? 1 : .65}
            fontFamily="'DM Sans', system-ui, sans-serif">
            {l}
          </text>
        );
      })}

      {/* Kaaba marker */}
      <circle cx={kmx} cy={kmy} r={11} fill={theme.accent} opacity=".18" />
      <circle cx={kmx} cy={kmy} r={7}  fill={theme.accent} />
      <text x={kmx} y={kmy + 5} textAnchor="middle" fontSize="10">🕋</text>

      {/* Needle */}
      <line x1={C} y1={C} x2={lx} y2={ly}
        stroke={nc} strokeWidth="2.5" strokeLinecap="round" opacity=".3" />
      <line x1={C} y1={C} x2={tx} y2={ty}
        stroke={nc} strokeWidth="3.5" strokeLinecap="round"
        filter={isAligned ? 'url(#glow)' : undefined} />
      <path d={`M${tx},${ty} L${h1x},${h1y} L${h2x},${h2y}Z`} fill={nc} />

      {/* Pivot */}
      <circle cx={C} cy={C} r={9}   fill={nc} opacity=".2" />
      <circle cx={C} cy={C} r={5.5} fill={nc} />
      <circle cx={C} cy={C} r={2.5} fill={theme.bg} />
    </svg>
  );
}
