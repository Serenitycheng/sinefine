import type { HomeId } from '@/lib/fate-housing';
import { HOME_ROOMS, roomOffset, roomTranslation } from '@/lib/fate-indoor-layout';

type Palette = {
  wall: string;
  floor: string;
  floorDark: string;
  trim: string;
  fabric: string;
  rug: string;
  accent: string;
};

const PALETTES: Record<HomeId, Palette> = {
  einzbern: {
    wall: '#c5c9c6',
    floor: '#aeb8b4',
    floorDark: '#869996',
    trim: '#5e7779',
    fabric: '#d8ded7',
    rug: '#567d85',
    accent: '#d8bc88',
  },
  emiya: {
    wall: '#bda883',
    floor: '#b98c5d',
    floorDark: '#89613e',
    trim: '#5d5544',
    fabric: '#738875',
    rug: '#a05448',
    accent: '#edc880',
  },
  tohsaka: {
    wall: '#c9b99d',
    floor: '#a47a58',
    floorDark: '#6f4f3d',
    trim: '#593f46',
    fabric: '#934d55',
    rug: '#6c374a',
    accent: '#e2bd78',
  },
  matou: {
    wall: '#918e82',
    floor: '#756657',
    floorDark: '#514c43',
    trim: '#37433e',
    fabric: '#7d7c72',
    rug: '#514d56',
    accent: '#b49c70',
  },
  waver: {
    wall: '#c7b69b',
    floor: '#a68159',
    floorDark: '#79583e',
    trim: '#544638',
    fabric: '#6e7976',
    rug: '#765b52',
    accent: '#e6bd70',
  },
  temple: {
    wall: '#c6b895',
    floor: '#b29c69',
    floorDark: '#8b774c',
    trim: '#5e5940',
    fabric: '#9a8161',
    rug: '#638276',
    accent: '#edca85',
  },
  church: {
    wall: '#c4c0b1',
    floor: '#9e9789',
    floorDark: '#736e66',
    trim: '#4c5a5e',
    fabric: '#617988',
    rug: '#5a6174',
    accent: '#e5cb94',
  },
  kayneth: {
    wall: '#d0c5ad',
    floor: '#ae8b6a',
    floorDark: '#805f4b',
    trim: '#63504c',
    fabric: '#875e64',
    rug: '#6d4f65',
    accent: '#e7c989',
  },
  fujimura: {
    wall: '#d3c298',
    floor: '#bd9569',
    floorDark: '#916e4b',
    trim: '#685f48',
    fabric: '#899772',
    rug: '#a9694d',
    accent: '#f0cf83',
  },
  natalia: {
    wall: '#bbb5a5',
    floor: '#9b8066',
    floorDark: '#715947',
    trim: '#465b5a',
    fabric: '#617779',
    rug: '#56666b',
    accent: '#d8b476',
  },
};

const ESTATES: HomeId[] = ['einzbern', 'tohsaka', 'matou', 'kayneth'];
const JAPANESE: HomeId[] = ['emiya', 'fujimura', 'temple'];

function RoomTag({ x, y, label }: { x: number; y: number; label: string }) {
  const width = Math.max(78, label.length * 15 + 22);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height="25"
        rx="4"
        fill="#28352e"
        opacity=".9"
      />
      <path
        d={`M${x + 9} ${y + 19}h${width - 18}`}
        stroke="#d5bb79"
        strokeWidth="1"
        opacity=".65"
      />
      <text
        x={x + 10}
        y={y + 16}
        fill="#f8ebc9"
        fontSize="12"
        fontWeight="650"
        letterSpacing="1"
      >
        {label}
      </text>
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy="6" rx="15" ry="6" fill="#25352d" opacity=".35" />
      <circle r="12" fill="#7a6647" stroke="#d4b981" strokeWidth="2" />
      <path
        d="M0 0c-13-18-18-5-8 3M0 0c12-22 20-5 7 3M0 0c-3-17 8-18 4-2M0 0c-12-8-12 7-2 6"
        fill="none"
        stroke="#42654e"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M-8-5l-6-8M8-8l8-8"
        stroke="#a9c086"
        strokeWidth="2"
        opacity=".8"
      />
    </g>
  );
}

function Books({ x, y, count = 5 }: { x: number; y: number; count?: number }) {
  const colors = [
    '#8d493d',
    '#49625c',
    '#cfac69',
    '#5c617a',
    '#a7774d',
    '#797c5d',
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }, (_, index) => (
        <g key={index} transform={`translate(${index * 11} 0)`}>
          <rect
            y={index % 2 ? 2 : 0}
            width="9"
            height={index % 2 ? 21 : 23}
            rx="1"
            fill={colors[index % colors.length]}
            stroke="#362d27"
            strokeWidth="1"
          />
          <path
            d="M2 5h5M2 17h5"
            stroke="#e8d4a7"
            strokeWidth="1"
            opacity=".7"
          />
        </g>
      ))}
    </g>
  );
}

function Lamp({ x, y, night }: { x: number; y: number; night: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {night && <circle r="56" fill="url(#indoor-lamplight)" opacity=".62" />}
      <circle r="11" fill="#765b3b" stroke="#e1c48e" strokeWidth="2" />
      <circle r="6" fill={night ? '#ffdfa0' : '#eed3a0'} />
      <circle r="2" fill="#fff8d6" />
    </g>
  );
}

/** A layered top-down room illustration sharing the exact coordinates of the walk map. */
export function FateIndoorScene({
  home,
  rooms,
  night,
}: {
  home: HomeId;
  rooms: [string, string, string, string];
  night: boolean;
}) {
  const p = PALETTES[home];
  const estate = ESTATES.includes(home);
  const japanese = JAPANESE.includes(home);
  const bookish = home === 'waver' || home === 'church' || home === 'temple';
  return (
    <svg viewBox="0 0 720 460" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern
          id="indoor-planks"
          width="78"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0H78M0 26H78M39 0v13M0 13h78M73 13v13"
            stroke={p.floorDark}
            strokeWidth="1.5"
            opacity=".36"
          />
          <path
            d="M8 7h24M47 20h19"
            stroke="#f6ddae"
            strokeWidth="1"
            opacity=".2"
          />
        </pattern>
        <pattern
          id="indoor-tile"
          width="31"
          height="31"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0H31V31"
            fill="none"
            stroke={p.floorDark}
            strokeWidth="2"
            opacity=".4"
          />
          <path d="M3 3h25v25H3z" fill="#fff9df" opacity=".08" />
        </pattern>
        <pattern
          id="indoor-tatami"
          width="74"
          height="46"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0h74v46H0z"
            fill="#d2c494"
            opacity=".16"
            stroke="#746b4a"
            strokeWidth="3"
          />
          <path
            d="M4 8h66M4 17h66M4 26h66M4 35h66"
            stroke="#6e724e"
            strokeWidth=".6"
            opacity=".22"
          />
        </pattern>
        <pattern
          id="indoor-rug"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M8 0l8 8-8 8L0 8z"
            fill="none"
            stroke="#f7dfb3"
            strokeWidth="1"
            opacity=".3"
          />
        </pattern>
        <radialGradient id="indoor-lamplight">
          <stop stopColor="#ffe4a3" stopOpacity=".86" />
          <stop offset="1" stopColor="#ffe4a3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="indoor-glass" x2="0" y2="1">
          <stop stopColor="#c8e3d8" />
          <stop offset="1" stopColor="#658d93" />
        </linearGradient>
        <linearGradient id="indoor-wood" x2="0" y2="1">
          <stop stopColor="#e2b985" />
          <stop offset="1" stopColor="#7a543b" />
        </linearGradient>
        <filter id="indoor-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="2"
            dy="3"
            stdDeviation="2"
            floodColor="#1a201c"
            floodOpacity=".42"
          />
        </filter>
      </defs>

      <rect width="720" height="460" fill="#25312d" />
      <rect
        x="12"
        y="10"
        width="696"
        height="440"
        rx="17"
        fill={p.trim}
        stroke="#e2c69b"
        strokeWidth="2"
      />
      <rect
        x="29"
        y="27"
        width="662"
        height="406"
        rx="8"
        fill={p.wall}
        stroke="#2e302b"
        strokeWidth="4"
      />
      <rect x="44" y="44" width="632" height="370" fill={p.floor} />
      <rect x="44" y="44" width="632" height="370" fill="url(#indoor-planks)" />
      <rect
        x={394 + roomOffset(home, 'table').x}
        y={44 + roomOffset(home, 'table').y}
        width="282"
        height="158"
        fill="#d6c8aa"
        opacity=".55"
      />
      <rect x={394 + roomOffset(home, 'table').x} y={44 + roomOffset(home, 'table').y}
        width="282" height="158" fill="url(#indoor-tile)" />
      {japanese && (
        <>
          <rect
            x="44"
            y="258"
            width="282"
            height="156"
            fill="url(#indoor-tatami)"
          />
          <rect
            x="394"
            y="258"
            width="282"
            height="156"
            fill="url(#indoor-tatami)"
          />
        </>
      )}
      {estate && (
        <rect
          x="44"
          y="44"
          width="282"
          height="158"
          fill="url(#indoor-rug)"
          opacity=".75"
        />
      )}

      {/* The cross-shaped wooden passage stays visible and fully walkable. */}
      <rect
        x="326"
        y="44"
        width="68"
        height="386"
        fill={p.floorDark}
        opacity=".48"
      />
      <rect x="326" y="44" width="68" height="386" fill="url(#indoor-planks)" />
      <rect
        x="44"
        y="202"
        width="632"
        height="56"
        fill={p.floorDark}
        opacity=".4"
      />
      <rect x="44" y="202" width="632" height="56" fill="url(#indoor-planks)" />
      <rect
        x="345"
        y="76"
        width="30"
        height="315"
        rx="7"
        fill={p.rug}
        stroke="#e3c997"
        strokeWidth="3"
        opacity=".8"
      />
      <rect
        x="345"
        y="76"
        width="30"
        height="315"
        rx="7"
        fill="url(#indoor-rug)"
      />
      <rect
        x="70"
        y="220"
        width="580"
        height="20"
        rx="6"
        fill={p.rug}
        stroke="#e1c48b"
        strokeWidth="3"
        opacity=".62"
      />
      <rect
        x="70"
        y="220"
        width="580"
        height="20"
        rx="6"
        fill="url(#indoor-rug)"
      />

      {/* Lounge: upholstered seating, woven rug, table and a lived-in sideboard. */}
      <g transform={roomTranslation(home, 'lounge')}>
      <rect
        x="82"
        y="87"
        width="166"
        height="91"
        rx="17"
        fill={p.rug}
        stroke="#d9ba81"
        strokeWidth="3"
        opacity=".7"
      />
      <rect
        x="87"
        y="90"
        width="153"
        height="45"
        rx="12"
        fill={p.fabric}
        stroke={p.trim}
        strokeWidth="5"
        filter="url(#indoor-shadow)"
      />
      <path
        d="M104 95v35M165 95v35M223 95v35"
        stroke="#f8e3b3"
        strokeWidth="2"
        opacity=".5"
      />
      <rect
        x="99"
        y="142"
        width="109"
        height="25"
        rx="9"
        fill="url(#indoor-wood)"
        stroke="#634f3a"
        strokeWidth="3"
        filter="url(#indoor-shadow)"
      />
      <circle cx="125" cy="154" r="8" fill="#e3d4b5" />
      <circle cx="125" cy="154" r="4" fill="#735d4e" />
      <path
        d="M160 148h27v12h-27z"
        fill="#e8dbbd"
        stroke="#8c694d"
        strokeWidth="1"
      />
      <rect
        x="259"
        y="98"
        width="27"
        height="70"
        rx="3"
        fill={p.trim}
        stroke="#d2ad77"
        strokeWidth="2"
      />
      <Books x={262} y={104} count={2} />
      <Plant x={281} y={182} />
      </g>

      {/* Kitchen: cupboards, sink, stove, dining table, plates and chairs. */}
      <g transform={roomTranslation(home, 'table')}>
      <rect
        x="413"
        y="83"
        width="213"
        height="33"
        rx="5"
        fill={p.trim}
        stroke="#eed4a0"
        strokeWidth="2"
        filter="url(#indoor-shadow)"
      />
      <rect
        x="420"
        y="90"
        width="57"
        height="20"
        rx="3"
        fill="#9da8a3"
        stroke="#e4d6bc"
        strokeWidth="3"
      />
      <path d="M448 86v12" stroke="#d9d7ca" strokeWidth="3" />
      <circle
        cx="542"
        cy="99"
        r="9"
        fill="#393a35"
        stroke="#c4b48b"
        strokeWidth="2"
      />
      <circle
        cx="568"
        cy="99"
        r="7"
        fill="#393a35"
        stroke="#c4b48b"
        strokeWidth="2"
      />
      <rect
        x="494"
        y="137"
        width="94"
        height="39"
        rx="15"
        fill="url(#indoor-wood)"
        stroke="#624a38"
        strokeWidth="3"
        filter="url(#indoor-shadow)"
      />
      <ellipse
        cx="518"
        cy="156"
        rx="11"
        ry="8"
        fill="#f2e6cb"
        stroke="#9c7d59"
        strokeWidth="2"
      />
      <ellipse
        cx="565"
        cy="156"
        rx="11"
        ry="8"
        fill="#f2e6cb"
        stroke="#9c7d59"
        strokeWidth="2"
      />
      <path
        d="M532 150l9 7 9-7"
        fill="none"
        stroke="#7d9d69"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect
        x="510"
        y="123"
        width="27"
        height="9"
        rx="4"
        fill={p.fabric}
        stroke={p.trim}
        strokeWidth="2"
      />
      <rect
        x="550"
        y="181"
        width="27"
        height="9"
        rx="4"
        fill={p.fabric}
        stroke={p.trim}
        strokeWidth="2"
      />
      <Plant x={648} y={178} />
      </g>

      {/* Study: shelves have individual book spines; desk retains open floor around it. */}
      <g transform={roomTranslation(home, 'study')}>
      <rect
        x="63"
        y="285"
        width="210"
        height="37"
        rx="3"
        fill={p.trim}
        stroke="#d4b886"
        strokeWidth="3"
        filter="url(#indoor-shadow)"
      />
      <Books x={72} y={290} count={16} />
      <rect
        x="92"
        y="336"
        width="112"
        height="31"
        rx="5"
        fill="url(#indoor-wood)"
        stroke="#694d36"
        strokeWidth="3"
        filter="url(#indoor-shadow)"
      />
      <rect
        x="103"
        y="342"
        width="29"
        height="18"
        rx="2"
        fill="#efe4c8"
        stroke="#a78b62"
        strokeWidth="1"
      />
      <path d="M118 344v14" stroke="#a78b62" />
      <rect
        x="149"
        y="345"
        width="35"
        height="14"
        rx="2"
        fill="#343d39"
        stroke="#caa969"
        strokeWidth="1"
      />
      <circle cx="191" cy="345" r="5" fill="#e5c17a" />
      <rect
        x="130"
        y="373"
        width="38"
        height="17"
        rx="5"
        fill={p.fabric}
        stroke={p.trim}
        strokeWidth="3"
      />
      {bookish && (
        <>
          <Books x={232} y={339} count={5} />
          <path d="M226 376l17-2 4 10-18 4z" fill="#e8dabe" stroke="#7d6246" />
        </>
      )}
      <Plant x={275} y={388} />
      </g>

      {/* Bedroom: layered bedding, folded blanket, bedside lamp and storage. */}
      <g transform={roomTranslation(home, 'rest')}>
      <rect
        x="474"
        y="282"
        width="156"
        height="101"
        rx="8"
        fill={p.rug}
        stroke="#d1b780"
        strokeWidth="3"
        opacity=".72"
      />
      <rect
        x="498"
        y="294"
        width="109"
        height="69"
        rx="7"
        fill={p.trim}
        stroke="#dfc397"
        strokeWidth="4"
        filter="url(#indoor-shadow)"
      />
      <rect x="505" y="299" width="95" height="57" rx="6" fill="#e7dac0" />
      <rect
        x="510"
        y="303"
        width="34"
        height="18"
        rx="6"
        fill="#fff4db"
        stroke="#b5a484"
      />
      <rect
        x="560"
        y="303"
        width="34"
        height="18"
        rx="6"
        fill="#fff4db"
        stroke="#b5a484"
      />
      <path d="M508 330h89v24h-89z" fill={p.fabric} />
      <path d="M508 334h89" stroke="#f4e2ba" strokeWidth="2" opacity=".55" />
      <rect
        x="630"
        y="306"
        width="29"
        height="35"
        rx="3"
        fill="url(#indoor-wood)"
        stroke="#5b4d3b"
        strokeWidth="2"
      />
      <circle
        cx="645"
        cy="323"
        r="8"
        fill="#e5c987"
        stroke="#9b764d"
        strokeWidth="2"
      />
      <rect
        x="418"
        y="296"
        width="35"
        height="78"
        rx="3"
        fill={p.trim}
        stroke="#c5a470"
        strokeWidth="2"
      />
      <path d="M422 328h27M422 351h27" stroke="#dec08b" strokeWidth="2" />
      <Plant x={650} y={389} />
      </g>

      {/* Open thresholds line up with the walkable cross; walls frame the rooms. */}
      <path
        d="M43 202h275M402 202h274M43 258h275M402 258h274M326 44v150M326 266v148M394 44v150M394 266v148"
        stroke={p.trim}
        strokeWidth="8"
        opacity=".85"
      />
      <path
        d="M43 202h275M402 202h274M43 258h275M402 258h274"
        stroke="#e4c993"
        strokeWidth="2"
        opacity=".75"
      />
      <path
        d="M323 196l11 11M387 196l11 11M323 263l11-11M387 263l11-11"
        stroke="#e5c786"
        strokeWidth="3"
      />
      <rect
        x="35"
        y="35"
        width="650"
        height="388"
        rx="4"
        fill="none"
        stroke={p.trim}
        strokeWidth="17"
      />
      <rect
        x="42"
        y="42"
        width="636"
        height="374"
        rx="2"
        fill="none"
        stroke="#e2c99d"
        strokeWidth="2"
        opacity=".7"
      />
      <path
        d="M330 429h60"
        stroke="#e8c88c"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M342 430h36"
        stroke="#395550"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M111 35h92M517 35h92M35 110v59M685 110v59"
        stroke="url(#indoor-glass)"
        strokeWidth="10"
      />
      <path
        d="M111 35h92M517 35h92M35 110v59M685 110v59"
        stroke="#f6e4b4"
        strokeWidth="1"
      />
      <path
        d="M157 31v9M563 31v9M31 139h9M681 139h9"
        stroke={p.trim}
        strokeWidth="4"
      />
      {night && (
        <rect
          x="44"
          y="44"
          width="632"
          height="370"
          fill="#14232a"
          opacity=".28"
        />
      )}
      <g transform={roomTranslation(home, 'lounge')}><Lamp x={220} y={178} night={night} /></g>
      <g transform={roomTranslation(home, 'table')}><Lamp x={608} y={178} night={night} /></g>
      <g transform={roomTranslation(home, 'study')}><Lamp x={205} y={389} night={night} /></g>
      <g transform={roomTranslation(home, 'rest')}><Lamp x={642} y={369} night={night} /></g>
      {HOME_ROOMS[home].map((zone, index) => <RoomTag key={zone}
        x={[65, 414, 65, 414][index]} y={[50, 50, 264, 264][index]}
        label={rooms[['lounge', 'table', 'study', 'rest'].indexOf(zone)]} />)}
    </svg>
  );
}
