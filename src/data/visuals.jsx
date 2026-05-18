import React from 'react';

// ============================================================
// SVG ART VISUALS — 12 programmatic abstract artworks
// These are React JSX, not database data, so they stay client-side.
// ============================================================
const ART_VISUALS = {
  v1: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#EFEDE5"/>
      {Array.from({length: 12}).map((_, r) =>
        Array.from({length: 12}).map((_, c) => (
          <circle key={`${r}-${c}`} cx={20 + c*32} cy={20 + r*32} r={Math.max(1, ((r+c)%6)*1.5)} fill="#0E0E0C"/>
        ))
      )}
    </svg>
  ),
  v2: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF3B1F"/>
          <stop offset="0.5" stopColor="#FFB200"/>
          <stop offset="1" stopColor="#EFEDE5"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g2)"/>
      <rect x="60" y="60" width="280" height="280" fill="none" stroke="#0E0E0C" strokeWidth="1"/>
      <text x="60" y="50" fontFamily="JetBrains Mono" fontSize="10" fill="#0E0E0C">FIELD STUDY №14</text>
    </svg>
  ),
  v3: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#0E0E0C"/>
      <rect x="0" y="0" width="200" height="200" fill="#FF3B1F"/>
      <rect x="200" y="200" width="200" height="200" fill="#FBFAF5"/>
      <rect x="280" y="0" width="120" height="80" fill="#1A4FFF"/>
      <line x1="200" y1="0" x2="200" y2="400" stroke="#0E0E0C" strokeWidth="2"/>
      <line x1="0" y1="200" x2="400" y2="200" stroke="#0E0E0C" strokeWidth="2"/>
    </svg>
  ),
  v4: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#FBFAF5"/>
      {Array.from({length: 40}).map((_,i) => (
        <line key={i} x1="0" y1={i*10 + Math.sin(i)*5} x2="400" y2={i*10 + Math.cos(i)*15} stroke="#0E0E0C" strokeWidth="0.5"/>
      ))}
      <circle cx="200" cy="200" r="80" fill="#EFEDE5"/>
      <circle cx="200" cy="200" r="80" fill="none" stroke="#0E0E0C"/>
    </svg>
  ),
  v5: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#EFEDE5"/>
      <text x="20" y="180" fontFamily="Bricolage Grotesque" fontSize="220" fontWeight="700" fill="#0E0E0C" letterSpacing="-15">A</text>
      <text x="180" y="380" fontFamily="Bricolage Grotesque" fontSize="220" fontWeight="700" fill="#FF3B1F" letterSpacing="-15">Z</text>
      <rect x="20" y="20" width="360" height="360" fill="none" stroke="#0E0E0C" strokeWidth="1"/>
    </svg>
  ),
  v6: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="g6" cx="0.5" cy="0.5">
          <stop offset="0" stopColor="#FFB200"/>
          <stop offset="0.6" stopColor="#FF3B1F"/>
          <stop offset="1" stopColor="#0E0E0C"/>
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g6)"/>
    </svg>
  ),
  v7: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#FBFAF5"/>
      {Array.from({length: 15}).map((_,i) => (
        <ellipse key={i} cx="200" cy="200" rx={20+i*12} ry={10+i*6} fill="none" stroke="#0E0E0C" strokeWidth="0.6" opacity={1 - i*0.05}/>
      ))}
    </svg>
  ),
  v8: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#0E0E0C"/>
      {Array.from({length: 30}).map((_,i) => (
        <rect key={i} x={Math.random()*400} y={i*14} width={Math.random()*200+50} height="3" fill="#FF3B1F" opacity={Math.random()}/>
      ))}
      <text x="40" y="380" fontFamily="JetBrains Mono" fontSize="11" fill="#FBFAF5">CHANNEL_ERR_03</text>
    </svg>
  ),
  v9: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#EFEDE5"/>
      <polygon points="200,40 360,360 40,360" fill="none" stroke="#0E0E0C" strokeWidth="1.2"/>
      <polygon points="200,100 310,320 90,320" fill="none" stroke="#FF3B1F" strokeWidth="1.2"/>
      <polygon points="200,160 270,290 130,290" fill="#0E0E0C"/>
      <circle cx="200" cy="240" r="14" fill="#EFEDE5"/>
    </svg>
  ),
  v10: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#1A4FFF"/>
      <rect x="40" y="40" width="320" height="320" fill="#FBFAF5"/>
      <circle cx="200" cy="200" r="100" fill="#FFB200"/>
      <rect x="100" y="180" width="200" height="40" fill="#0E0E0C"/>
    </svg>
  ),
  v11: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#FBFAF5"/>
      {Array.from({length: 20}).map((_,r) =>
        Array.from({length: 20}).map((_,c) => {
          const ch = ['/','\\','|','-','+','#','.',' '][Math.floor((r*c+r+c)%8)];
          return <text key={`${r}-${c}`} x={20+c*18} y={30+r*18} fontFamily="JetBrains Mono" fontSize="14" fill="#0E0E0C">{ch}</text>;
        })
      )}
    </svg>
  ),
  v12: (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#0E7C3A"/>
      <rect x="0" y="0" width="400" height="200" fill="#EFEDE5"/>
      <rect x="40" y="160" width="80" height="80" fill="#FF3B1F"/>
      <circle cx="280" cy="120" r="60" fill="#0E0E0C"/>
      <line x1="0" y1="200" x2="400" y2="200" stroke="#0E0E0C" strokeWidth="3"/>
    </svg>
  ),
};

export default ART_VISUALS;
