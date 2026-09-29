import Image from 'next/image';
import { STREET } from '@/lib/street';

/** The map and walking canvas use the same painted geography and coordinates. */
export function FateCityScenery({
  miniature = false,
  labels = true,
}: {
  miniature?: boolean;
  labels?: boolean;
}) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} aria-hidden="true">
      <Image
        src="/fate/street/fuyuki-city-miyama.png"
        alt=""
        fill
        sizes={miniature ? '360px' : '1584px'}
        unoptimized={!miniature}
        loading={miniature ? 'lazy' : 'eager'}
        draggable={false}
        style={{ objectFit: 'fill' }}
      />
      {labels && (
        <svg
          viewBox={`0 0 ${STREET.width} ${STREET.height}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <g fontFamily="Arial, Microsoft YaHei, sans-serif" fontWeight="700" letterSpacing="3" fill="#fff7dd" stroke="#203b38" strokeWidth="5" paintOrder="stroke">
            <text x="210" y="112" fontSize="34">冬木市 · 深山町</text>
            <text x="2040" y="112" fontSize="34">冬木市 · 新都</text>
            <text x="1560" y="725" fontSize="22" transform="rotate(90 1560 725)">未远川</text>
            {!miniature && (
              <>
                <text x="360" y="745" fontSize="21">穗群原学园</text>
                <text x="575" y="1265" fontSize="21">深山商店街</text>
                <text x="1850" y="786" fontSize="21">河岸公园</text>
                <text x="2265" y="1590" fontSize="21">新都商业街</text>
              </>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
