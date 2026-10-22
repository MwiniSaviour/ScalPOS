const stroke = "stroke-[3.5]";

export function ArtSell() {
  return (
    <svg viewBox="0 0 340 250" className="mx-auto w-full max-w-[290px]" aria-hidden="true">
      {/* stand */}
      <rect x="240" y="146" width="68" height="8" rx="3" className="fill-ink" />
      <line x1="252" y1="152" x2="248" y2="188" strokeWidth="6" strokeLinecap="round" className="stroke-ink" />
      <line x1="298" y1="152" x2="302" y2="188" strokeWidth="6" strokeLinecap="round" className="stroke-ink" />
      {/* product box */}
      <rect x="244" y="92" width="56" height="54" rx="6" className={`fill-surface stroke-ink ${stroke}`} />
      <rect x="268" y="100" width="24" height="12" rx="3" className="fill-accent" />
      <rect x="252" y="120" width="3" height="20" className="fill-ink" />
      <rect x="260" y="120" width="3" height="20" className="fill-ink" />
      <rect x="270" y="120" width="4" height="20" className="fill-ink" />
      <rect x="278" y="120" width="3" height="20" className="fill-ink" />
      <rect x="286" y="120" width="3" height="20" className="fill-ink" />
      {/* swoosh + confetti */}
      <path d="M214 66 C220 69 224 71 227 73" fill="none" className="stroke-ink3" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 9" />
      <circle cx="233" cy="77" r="6" className="fill-accent" />
      <path d="M246 62 L254 56 L252 66 Z" className="fill-accent" />
      {/* character */}
      <line x1="118" y1="158" x2="114" y2="218" strokeWidth="11" strokeLinecap="round" className="stroke-ink" />
      <line x1="142" y1="158" x2="146" y2="218" strokeWidth="11" strokeLinecap="round" className="stroke-ink" />
      <ellipse cx="112" cy="226" rx="13" ry="6" className="fill-ink" />
      <ellipse cx="148" cy="226" rx="13" ry="6" className="fill-ink" />
      <rect x="104" y="86" width="52" height="74" rx="13" className="fill-ink" />
      <path d="M106 102 C94 118 95 136 104 150" fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      <path d="M152 100 C168 96 180 88 190 82" fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      <rect x="186" y="44" width="28" height="46" rx="5" className={`fill-surface stroke-ink ${stroke}`} />
      <circle cx="200" cy="80" r="3" className="fill-accent" />
      <circle cx="130" cy="60" r="21" className={`fill-surface stroke-ink ${stroke}`} />
      <path d="M107 62 A23 23 0 0 1 153 62 Z" className="fill-ink" />
    </svg>
  );
}

export function ArtTrack() {
  return (
    <svg viewBox="0 0 340 250" className="mx-auto w-full max-w-[290px]" aria-hidden="true">
      {/* floating bar chart */}
      <path d="M40 174 H98" fill="none" className="stroke-ink3" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.1 9" />
      <rect x="44" y="148" width="10" height="26" rx="3" className="fill-ink" />
      <rect x="58" y="138" width="10" height="36" rx="3" className="fill-ink" />
      <rect x="72" y="146" width="10" height="28" rx="3" className="fill-ink" />
      <rect x="86" y="118" width="11" height="56" rx="3" className="fill-accent" />
      <path d="M46 132 C60 114 78 104 92 98" fill="none" className="stroke-ink3" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 9" />
      <path d="M85 96 L93 98 L90 106" fill="none" className="stroke-ink3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* character */}
      <line x1="118" y1="158" x2="114" y2="218" strokeWidth="11" strokeLinecap="round" className="stroke-ink" />
      <line x1="142" y1="158" x2="146" y2="218" strokeWidth="11" strokeLinecap="round" className="stroke-ink" />
      <ellipse cx="112" cy="226" rx="13" ry="6" className="fill-ink" />
      <ellipse cx="148" cy="226" rx="13" ry="6" className="fill-ink" />
      <rect x="104" y="86" width="52" height="74" rx="13" className="fill-ink" />
      <path d="M150 98 C170 90 194 80 214 72" fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      <path d="M106 104 C122 112 146 118 166 122" fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      <circle cx="130" cy="60" r="21" className={`fill-surface stroke-ink ${stroke}`} />
      <path d="M107 62 A23 23 0 0 1 153 62 Z" className="fill-ink" />
      {/* receipt tape held in front */}
      <path
        d="M172 42 L222 42 L222 182 L216 174 L210 182 L204 174 L198 182 L192 174 L186 182 L180 174 L172 182 Z"
        className={`fill-surface stroke-ink ${stroke}`}
        strokeLinejoin="round"
      />
      <rect x="178" y="52" width="36" height="3" rx="1.5" className="fill-ink" />
      <rect x="178" y="64" width="24" height="3" rx="1.5" className="fill-ink" />
      <rect x="178" y="76" width="30" height="3" rx="1.5" className="fill-ink" />
      <rect x="178" y="88" width="36" height="3" rx="1.5" className="fill-ink" />
      <rect x="178" y="140" width="18" height="3" rx="1.5" className="fill-ink" />
      <rect x="178" y="156" width="36" height="13" rx="3" className="fill-accent" />
      {/* swoosh + dot */}
      <path d="M234 140 C248 132 258 126 264 122" fill="none" className="stroke-ink3" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 9" />
      <circle cx="272" cy="117" r="6" className="fill-accent" />
    </svg>
  );
}

export function ArtGrow() {
  return (
    <svg viewBox="0 0 340 250" className="mx-auto w-full max-w-[290px]" aria-hidden="true">
      {/* coin */}
      <circle cx="264" cy="66" r="20" className={`fill-surface stroke-ink ${stroke}`} />
      <text x="264" y="73" textAnchor="middle" fontFamily="sans-serif" fontSize="20" className="fill-ink">
        ₵
      </text>
      {/* receipt corner */}
      <path
        d="M246 128 L298 128 L298 166 L291 158 L284 166 L277 158 L270 166 L263 158 L256 166 L249 158 L246 158 Z"
        className={`fill-surface stroke-ink ${stroke}`}
        strokeLinejoin="round"
      />
      <rect x="252" y="136" width="26" height="3" rx="1.5" className="fill-ink" />
      <rect x="252" y="144" width="16" height="3" rx="1.5" className="fill-ink" />
      {/* swoosh + dot */}
      <path d="M224 26 C238 22 250 26 256 34" fill="none" className="stroke-ink3" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 9" />
      <circle cx="262" cy="38" r="6" className="fill-accent" />
      {/* character */}
      <line x1="118" y1="158" x2="114" y2="218" strokeWidth="11" strokeLinecap="round" className="stroke-ink" />
      <line x1="142" y1="158" x2="146" y2="218" strokeWidth="11" strokeLinecap="round" className="stroke-ink" />
      <ellipse cx="112" cy="226" rx="13" ry="6" className="fill-ink" />
      <ellipse cx="148" cy="226" rx="13" ry="6" className="fill-ink" />
      <rect x="104" y="86" width="52" height="74" rx="13" className="fill-ink" />
      <path d="M106 102 C94 118 95 136 104 150" fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      <path d="M152 98 C170 90 184 80 194 72" fill="none" className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      {/* raised phone with check */}
      <rect x="184" y="16" width="34" height="56" rx="6" className={`fill-surface stroke-ink ${stroke}`} />
      <circle cx="201" cy="38" r="14" className="fill-accent" />
      <path d="M195 38 L200 43 L208 32" fill="none" className="stroke-accentink" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="130" cy="60" r="21" className={`fill-surface stroke-ink ${stroke}`} />
      <path d="M107 62 A23 23 0 0 1 153 62 Z" className="fill-ink" />
    </svg>
  );
}
