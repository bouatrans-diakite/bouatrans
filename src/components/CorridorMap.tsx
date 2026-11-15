export type InterventionZone = 'all' | 'spain_national' | 'france_benelux' | 'central_europe';

interface CorridorMapProps {
  originCity?: string;
  destinationCity?: string;
  activeZone?: InterventionZone;
  onSelectHub?: (cityName: string) => void;
}

interface HubPoint {
  name: string;
  short: string;
  zone: Exclude<InterventionZone, 'all'>;
  x: number;
  y: number;
  isHQ?: boolean;
  anchor?: 'start' | 'end';
  dx?: number;
  dy?: number;
}

const HUB_POINTS: HubPoint[] = [
  { name: 'Yuncos (Toledo)', short: 'Yuncos (HQ)', zone: 'spain_national', x: 118, y: 238, isHQ: true, anchor: 'start', dx: 6, dy: 12 },
  { name: 'Madrid', short: 'Madrid', zone: 'spain_national', x: 130, y: 214, anchor: 'start', dx: 7, dy: 2 },
  { name: 'Séville', short: 'Séville', zone: 'spain_national', x: 88, y: 262, anchor: 'end', dx: -7, dy: 3 },
  { name: 'Valence', short: 'Valence', zone: 'spain_national', x: 186, y: 240, anchor: 'start', dx: 8, dy: 4 },
  { name: 'Barcelone', short: 'Barcelone', zone: 'spain_national', x: 224, y: 204, anchor: 'start', dx: 8, dy: 3 },
  { name: 'Bilbao', short: 'Bilbao', zone: 'spain_national', x: 142, y: 162, anchor: 'end', dx: -8, dy: 3 },
  { name: 'Lisbonne', short: 'Lisbonne', zone: 'spain_national', x: 54, y: 238, anchor: 'end', dx: -6, dy: 3 },
  { name: 'Bordeaux', short: 'Bordeaux', zone: 'france_benelux', x: 178, y: 130, anchor: 'end', dx: -8, dy: 3 },
  { name: 'Marseille', short: 'Marseille', zone: 'france_benelux', x: 268, y: 162, anchor: 'start', dx: 8, dy: 3 },
  { name: 'Lyon', short: 'Lyon', zone: 'france_benelux', x: 258, y: 116, anchor: 'end', dx: -8, dy: 3 },
  { name: 'Paris', short: 'Paris', zone: 'france_benelux', x: 222, y: 68, anchor: 'end', dx: -8, dy: 3 },
  { name: 'Bruxelles', short: 'Bruxelles', zone: 'france_benelux', x: 256, y: 40, anchor: 'end', dx: -7, dy: 3 },
  { name: 'Rotterdam', short: 'Rotterdam', zone: 'france_benelux', x: 266, y: 24, anchor: 'start', dx: 8, dy: 3 },
  { name: 'Milan', short: 'Milan', zone: 'central_europe', x: 332, y: 124, anchor: 'start', dx: 8, dy: 3 },
  { name: 'Francfort', short: 'Francfort', zone: 'central_europe', x: 320, y: 56, anchor: 'start', dx: 8, dy: 3 },
  { name: 'Munich', short: 'Munich', zone: 'central_europe', x: 364, y: 78, anchor: 'start', dx: 8, dy: 3 },
];

function matchPoint(city?: string): HubPoint | undefined {
  if (!city) return undefined;
  const lower = city.toLowerCase();
  return HUB_POINTS.find(
    (p) => lower.includes(p.name.toLowerCase().split(' ')[0]) || p.name.toLowerCase().includes(lower),
  );
}

export function CorridorMap({
  originCity,
  destinationCity,
  activeZone = 'all',
  onSelectHub,
}: CorridorMapProps) {
  const fromPt = matchPoint(originCity) || HUB_POINTS[0];
  const toPt = matchPoint(destinationCity) || HUB_POINTS[9]; // Lyon default highlight

  const midX = (fromPt.x + toPt.x) / 2 - 14;
  const midY = (fromPt.y + toPt.y) / 2 - 22;

  return (
    <div className="relative h-full w-full flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0B1F3A] text-white p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <p className="text-xs font-medium text-slate-300">
            Carte Espagne (National) & Europe (International)
          </p>
          <p className="font-display text-sm font-bold text-white">
            Base Yuncos (Toledo) · {fromPt.short} → {toPt.short}
          </p>
        </div>
        <span className="font-mono text-xs text-orange-400 whitespace-nowrap">
          100 % Espagne & Europe
        </span>
      </div>

      <svg
        viewBox="0 0 430 280"
        className="w-full h-auto my-auto"
        role="img"
        aria-label={`Carte stratégique Espagne et Europe Boua Trans depuis Yuncos reliant ${fromPt.short} à ${toPt.short}`}
      >
        <defs>
          <pattern id="grid-lines" width="28" height="28" patternUnits="userSpaceOnUse">
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="rgba(148, 163, 184, 0.10)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="430" height="280" fill="url(#grid-lines)" rx="8" />

        {/* Western & Central Europe landmass silhouette (strictly Iberia + EU) */}
        <path
          d="M 48 268 L 42 222 L 72 178 L 138 156 L 166 120 L 156 80 L 200 54 L 242 24 L 296 18 L 352 40 L 392 78 L 372 132 L 348 164 L 310 156 L 266 172 L 230 206 L 194 248 L 122 270 Z"
          fill="rgba(30, 58, 95, 0.58)"
          stroke="rgba(148, 163, 184, 0.28)"
          strokeWidth="1.2"
        />

        {/* Secondary European trunk routes from Yuncos (Toledo) */}
        <g stroke="rgba(148, 163, 184, 0.34)" strokeWidth="1.2" strokeDasharray="3 3" fill="none">
          <line x1="118" y1="238" x2="88" y2="262" />
          <line x1="118" y1="238" x2="54" y2="238" />
          <line x1="118" y1="238" x2="186" y2="240" />
          <line x1="118" y1="238" x2="142" y2="162" />
          <line x1="142" y1="162" x2="178" y2="130" />
          <line x1="178" y1="130" x2="222" y2="68" />
          <line x1="222" y1="68" x2="256" y2="40" />
          <line x1="256" y1="40" x2="266" y2="24" />
          <line x1="130" y1="214" x2="224" y2="204" />
          <line x1="224" y1="204" x2="268" y2="162" />
          <line x1="268" y1="162" x2="258" y2="116" />
          <line x1="258" y1="116" x2="332" y2="124" />
          <line x1="258" y1="116" x2="222" y2="68" />
          <line x1="258" y1="116" x2="320" y2="56" />
          <line x1="320" y1="56" x2="364" y2="78" />
        </g>

        {/* Active highlighted corridor */}
        <path
          d={`M ${fromPt.x} ${fromPt.y} Q ${midX} ${midY} ${toPt.x} ${toPt.y}`}
          fill="none"
          stroke="#F97316"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Hub Nodes */}
        {HUB_POINTS.map((hub) => {
          const isSelected = hub.name === fromPt.name || hub.name === toPt.name;
          const zoneActive = activeZone === 'all' || hub.zone === activeZone || hub.isHQ;
          return (
            <g
              key={hub.name}
              onClick={() => onSelectHub?.(hub.name)}
              className={onSelectHub ? 'cursor-pointer' : undefined}
              opacity={zoneActive ? 1 : 0.35}
            >
              <circle
                cx={hub.x}
                cy={hub.y}
                r={isSelected ? 5.5 : hub.isHQ ? 4.8 : 3.2}
                fill={isSelected ? '#F97316' : hub.isHQ ? '#FFFFFF' : '#94A3B8'}
                stroke="#0B1F3A"
                strokeWidth="1.5"
              />
              <text
                x={hub.x + (hub.dx ?? 8)}
                y={hub.y + (hub.dy ?? 3)}
                textAnchor={hub.anchor ?? 'start'}
                fontSize={isSelected || hub.isHQ ? '9.5' : '8'}
                fontWeight={isSelected || hub.isHQ ? '700' : '500'}
                fill={isSelected ? '#FDBA74' : hub.isHQ ? '#FFFFFF' : '#CBD5E1'}
                fontFamily="DM Sans, sans-serif"
              >
                {hub.short}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
