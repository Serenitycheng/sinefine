import { DISTRICT_LANDMARKS, STREET_SCENE_SCALE } from '@/lib/fate-district';
import { STREET, WALK_AREAS, type Rect } from '@/lib/street';
import styles from './street-walk.module.css';

function overlapsRoad(x: number, y: number, width: number, height: number) {
  return WALK_AREAS.some(
    (road) =>
      x < road.right + 12 &&
      x + width > road.left - 12 &&
      y < road.bottom + 12 &&
      y + height > road.top - 12,
  );
}

const buildings = Array.from({ length: 18 * 10 }, (_, index) => {
  const column = index % 18;
  const row = Math.floor(index / 18);
  const x = 95 + column * 168 + (row % 2) * 22;
  const y = 100 + row * 155;
  const width = 110 + ((index * 17) % 34);
  const height = 78 + ((index * 23) % 28);
  if ((x > 1500 && x < 1760) || overlapsRoad(x, y, width, height)) return null;
  return { x, y, width, height, variant: (index * 7 + row) % 5 };
}).filter((building): building is NonNullable<typeof building> =>
  Boolean(building),
);

const horizontalRoads = WALK_AREAS.filter(
  (road) => road.right - road.left > road.bottom - road.top,
);
const verticalRoads = WALK_AREAS.filter(
  (road) => road.right - road.left <= road.bottom - road.top,
);

function Road({ road, horizontal }: { road: Rect; horizontal: boolean }) {
  const width = road.right - road.left;
  const height = road.bottom - road.top;
  return (
    <g>
      <rect
        x={road.left - 9}
        y={road.top - 9}
        width={width + 18}
        height={height + 18}
        rx="11"
        fill="#d5d1bd"
      />
      <rect
        x={road.left}
        y={road.top}
        width={width}
        height={height}
        rx="5"
        fill="#626d6c"
      />
      {horizontal ? (
        <>
          <path
            d={`M ${road.left + 12} ${road.top + 9} H ${road.right - 12} M ${road.left + 12} ${road.bottom - 9} H ${road.right - 12}`}
            stroke="#b1aca0"
            strokeWidth="2"
            opacity=".6"
          />
          <path
            d={`M ${road.left + 22} ${(road.top + road.bottom) / 2} H ${road.right - 22}`}
            stroke="#efe4ba"
            strokeWidth="2"
            strokeDasharray="25 28"
            opacity=".72"
          />
        </>
      ) : (
        <>
          <path
            d={`M ${road.left + 9} ${road.top + 12} V ${road.bottom - 12} M ${road.right - 9} ${road.top + 12} V ${road.bottom - 12}`}
            stroke="#b1aca0"
            strokeWidth="2"
            opacity=".6"
          />
          <path
            d={`M ${(road.left + road.right) / 2} ${road.top + 22} V ${road.bottom - 22}`}
            stroke="#efe4ba"
            strokeWidth="2"
            strokeDasharray="25 28"
            opacity=".72"
          />
        </>
      )}
    </g>
  );
}

function Building({
  x,
  y,
  width,
  height,
  variant,
}: NonNullable<(typeof buildings)[number]>) {
  const wall = ['#dccbb2', '#b9c6ba', '#d7c5b7', '#b5bdc0', '#d1c5a3'][variant];
  const roof = ['#667a78', '#657484', '#896e6c', '#687764', '#866f62'][variant];
  return (
    <g>
      <rect
        x={x + 8}
        y={y + 12}
        width={width}
        height={height}
        rx="5"
        fill="#172b2b"
        opacity=".22"
      />
      <rect
        x={x}
        y={y + 16}
        width={width}
        height={height - 16}
        rx="3"
        fill={wall}
        stroke="#465957"
        strokeWidth="2"
      />
      <path
        d={`M ${x - 7} ${y + 18} L ${x + width / 2} ${y - 13} L ${x + width + 7} ${y + 18} Z`}
        fill={roof}
        stroke="#394d4c"
        strokeWidth="4"
      />
      <path
        d={`M ${x + 10} ${y + 29} H ${x + width - 10}`}
        stroke="#f3e8cd"
        strokeWidth="3"
        opacity=".55"
      />
      {[0, 1, 2].map((pane) => (
        <rect
          key={pane}
          x={x + 13 + pane * ((width - 30) / 3)}
          y={y + 39}
          width="19"
          height="20"
          rx="2"
          fill="#7baba9"
          stroke="#eddbbd"
          strokeWidth="3"
        />
      ))}
      <rect
        x={x + width / 2 - 13}
        y={y + height - 24}
        width="26"
        height="24"
        fill="#756c5d"
        stroke="#e5d3ad"
        strokeWidth="3"
      />
    </g>
  );
}

function LandmarkFront({ id }: { id: string }) {
  if (id === 'park')
    return (
      <g>
        <ellipse
          cx="0"
          cy="-82"
          rx="85"
          ry="48"
          fill="#7fa182"
          stroke="#d5d1b2"
          strokeWidth="7"
        />
        <ellipse cx="9" cy="-88" rx="35" ry="19" fill="#7caaa9" />
        <circle cx="-55" cy="-103" r="24" fill="#42705d" />
        <circle cx="60" cy="-100" r="25" fill="#507964" />
        <path
          d="M -72 -39 Q 0 -59 72 -39"
          stroke="#d1bc8d"
          strokeWidth="5"
          fill="none"
        />
      </g>
    );
  if (id === 'temple')
    return (
      <g>
        <path
          d="M -73 -44 V -110 M 73 -44 V -110 M -93 -106 H 93 M -75 -119 H 75"
          stroke="#9a4c3f"
          strokeWidth="12"
          fill="none"
        />
        <path
          d="M -100 -117 Q 0 -153 100 -117"
          fill="none"
          stroke="#5b6560"
          strokeWidth="11"
        />
        <path d="M -13 -44 V -71 H 13 V -44" fill="#a6a69a" />
      </g>
    );
  if (id === 'church')
    return (
      <g>
        <rect
          x="-72"
          y="-122"
          width="144"
          height="81"
          fill="#d1cbb8"
          stroke="#647270"
          strokeWidth="4"
        />
        <path
          d="M -84 -122 L 0 -166 L 84 -122 Z"
          fill="#62707a"
          stroke="#3d5254"
          strokeWidth="5"
        />
        <path
          d="M 0 -177 V -143 M -12 -167 H 12"
          stroke="#e7d6a4"
          strokeWidth="5"
        />
        <path d="M -14 -41 V -81 H 14 V -41" fill="#526362" />
        <circle
          cx="0"
          cy="-112"
          r="14"
          fill="#9db8b4"
          stroke="#e5d9bc"
          strokeWidth="4"
        />
      </g>
    );
  if (id === 'cafe' || id === 'shops')
    return (
      <g>
        <rect
          x="-76"
          y="-119"
          width="152"
          height="80"
          rx="3"
          fill={id === 'cafe' ? '#c8b19c' : '#bac2b6'}
          stroke="#55625c"
          strokeWidth="4"
        />
        <path
          d="M -81 -122 L -63 -144 H 66 L 81 -122 Z"
          fill="#6a7775"
          stroke="#425451"
          strokeWidth="4"
        />
        <path
          d="M -76 -81 H 76 L 69 -63 H -69 Z"
          fill={id === 'cafe' ? '#7c9a94' : '#a8826d'}
          stroke="#ebe1c6"
          strokeWidth="4"
        />
        <path
          d="M -51 -82 V -65 M -18 -82 V -65 M 16 -82 V -65 M 50 -82 V -65"
          stroke="#efe6cd"
          strokeWidth="4"
        />
        <rect
          x="-56"
          y="-60"
          width="36"
          height="21"
          fill="#739796"
          stroke="#efe6cd"
          strokeWidth="3"
        />
        <rect
          x="22"
          y="-60"
          width="35"
          height="21"
          fill="#739796"
          stroke="#efe6cd"
          strokeWidth="3"
        />
        <rect
          x="-11"
          y="-60"
          width="24"
          height="21"
          fill="#665d52"
          stroke="#e4d7b8"
          strokeWidth="3"
        />
      </g>
    );
  if (id === 'school')
    return (
      <g>
        <rect
          x="-91"
          y="-130"
          width="182"
          height="90"
          fill="#e0d4b8"
          stroke="#606e69"
          strokeWidth="5"
        />
        <path d="M -97 -131 H 97 L 78 -148 H -77 Z" fill="#6a7672" />
        {[-64, -32, 0, 32, 64].map((x) => (
          <rect
            key={x}
            x={x - 9}
            y="-111"
            width="18"
            height="22"
            fill="#8bb4ae"
            stroke="#f7e9c8"
            strokeWidth="3"
          />
        ))}
        <rect x="-13" y="-67" width="26" height="27" fill="#776c59" />
      </g>
    );
  return null;
}

export function FateStreetScenery({ period }: { period: string }) {
  return (
    <div
      className={styles.continuousScenery}
      style={{
        width: STREET.width * STREET_SCENE_SCALE,
        height: STREET.height * STREET_SCENE_SCALE,
        filter:
          period === '夜间'
            ? 'brightness(.52) saturate(.8)'
            : period === '傍晚'
              ? 'brightness(.83) sepia(.14)'
              : undefined,
      }}
      aria-hidden="true"
    >
      <svg
        className={styles.sceneryWorld}
        viewBox={`0 0 ${STREET.width} ${STREET.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="fuyuki-ground"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <rect width="32" height="32" fill="#9caa8e" />
            <path
              d="M 0 31 H 32 M 31 0 V 32"
              stroke="#dde0c0"
              strokeWidth="1"
              opacity=".17"
            />
          </pattern>
          <pattern
            id="fuyuki-water"
            width="38"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <rect width="38" height="48" fill="#6996a0" />
            <path
              d="M 4 14 Q 17 9 29 14 M 10 35 Q 22 30 38 35"
              fill="none"
              stroke="#c3d7c9"
              strokeWidth="3"
              opacity=".38"
            />
          </pattern>
        </defs>
        <rect
          width={STREET.width}
          height={STREET.height}
          fill="url(#fuyuki-ground)"
        />
        <path
          d="M 0 0 H 1480 V 275 Q 1070 205 710 265 Q 360 312 0 230 Z"
          fill="#6f8b72"
        />
        <path
          d="M 0 0 H 1480 V 150 Q 800 105 0 165 Z"
          fill="#4b6f65"
          opacity=".65"
        />
        <rect
          x="1512"
          y="0"
          width="247"
          height={STREET.height}
          fill="#ced1b6"
        />
        <rect
          x="1530"
          y="0"
          width="210"
          height={STREET.height}
          fill="url(#fuyuki-water)"
        />
        <path
          d="M 1518 0 V 1660 M 1752 0 V 1660"
          stroke="#e9e1c7"
          strokeWidth="8"
        />
        {buildings.map((building, index) => (
          <Building key={index} {...building} />
        ))}
        {horizontalRoads.map((road, index) => (
          <Road key={`h${index}`} road={road} horizontal />
        ))}
        {verticalRoads.map((road, index) => (
          <Road key={`v${index}`} road={road} horizontal={false} />
        ))}
        {Array.from({ length: 52 }, (_, index) => {
          const bank = index < 26 ? 0 : 1;
          const x = bank
            ? 1810 + ((index * 179) % 1120)
            : 170 + ((index * 211) % 1290);
          const y = 245 + ((index * 257) % 1180);
          if (overlapsRoad(x - 19, y - 19, 38, 38)) return null;
          return (
            <g key={index}>
              <ellipse
                cx={x + 5}
                cy={y + 8}
                rx="22"
                ry="14"
                fill="#253e3e"
                opacity=".23"
              />
              <circle
                cx={x}
                cy={y}
                r="19"
                fill="#4e745d"
                stroke="#315b52"
                strokeWidth="4"
              />
              <circle cx={x - 6} cy={y - 6} r="8" fill="#9cba8d" opacity=".7" />
            </g>
          );
        })}
        {DISTRICT_LANDMARKS.map((place) => (
          <g key={place.id} transform={`translate(${place.x} ${place.y})`}>
            <LandmarkFront id={place.id} />
            <circle r="22" fill="#263d3a" stroke="#f0d294" strokeWidth="3" />
            <circle r="7" fill="#f0d294" />
            <rect
              x={-Math.max(122, place.name.length * 17 + 16) / 2}
              y="-65"
              width={Math.max(122, place.name.length * 17 + 16)}
              height="28"
              rx="5"
              fill="#203a38"
              opacity=".94"
            />
            <text
              y="-46"
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="#fff4d5"
              fontFamily="Arial, Microsoft YaHei, sans-serif"
            >
              {place.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
