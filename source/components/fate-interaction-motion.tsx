'use client';
import { useId } from 'react';
import type { PreviewSprite } from '@/lib/fate-preview-house';
import { runtimeArt } from '@/lib/fate-runtime-art';
import {
  interactionArms,
  type InteractionMotion,
} from '@/lib/fate-interaction-motion';
import styles from './fate-interaction-motion.module.css';

/** Animate the existing painted limbs locally; the foot anchor never moves. */
export function FateInteractionMotion({
  sprite: s,
  scale,
  motion,
}: {
  sprite: PreviewSprite;
  scale: number;
  motion: InteractionMotion;
}) {
  const id = useId().replaceAll(':', '');
  const b = s.bounds;
  const { top: y, bottom, left, right, width: arm } = interactionArms(b);
  const rect = (x: number) => `M${x} ${y}h${arm}v${bottom - y}h${-arm}Z`;
  const image = (
    <image
      href={runtimeArt(s.file)}
      x={-s.cropX}
      y={-s.cropY}
      width={s.imageWidth}
      height={s.imageHeight}
    />
  );
  return (
    <svg
      aria-hidden="true"
      data-interaction-motion={motion}
      className={styles.actor}
      viewBox={`0 0 ${s.cellWidth} ${s.cellHeight}`}
      style={{
        width: s.cellWidth * scale,
        height: s.cellHeight * scale,
        transform: `translate(${-s.anchorX * scale}px,${-s.anchorY * scale}px)${s.mirror ? ' scaleX(-1)' : ''}`,
      }}
    >
      <defs>
        <clipPath id={`${id}body`}>
          <path
            d={`M${b.x} ${b.y}h${b.width}v${b.height}h${-b.width}Z${rect(left)}${rect(right)}`}
            clipRule="evenodd"
          />
        </clipPath>
        <clipPath id={`${id}left`}>
          <path d={rect(left)} />
        </clipPath>
        <clipPath id={`${id}right`}>
          <path d={rect(right)} />
        </clipPath>
        <linearGradient id={`${id}paper`} x2="1" y2="1">
          <stop stopColor="#e9ddbd" />
          <stop offset="1" stopColor="#c8b38f" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}body)`}>{image}</g>
      <g
        className={styles.left}
        data-motion={motion}
        style={{ transformOrigin: `${left + arm * 0.5}px ${y + 4}px` }}
      >
        <g clipPath={`url(#${id}left)`}>{image}</g>
      </g>
      <g
        className={styles.right}
        data-motion={motion}
        style={{ transformOrigin: `${right + arm * 0.5}px ${y + 4}px` }}
      >
        <g clipPath={`url(#${id}right)`}>{image}</g>
      </g>
      {motion === 'wrap' && (
        <g className={styles.prop}>
          <path
            d={`M${b.x + b.width * 0.25} ${bottom - b.height * 0.16}l${b.width * 0.43} -7l7 ${b.height * 0.13}l${-b.width * 0.44} 5Z`}
            fill={`url(#${id}paper)`}
            stroke="#a58f6e"
            strokeWidth=".8"
          />
          <path
            d={`M${b.x + b.width * 0.47} ${bottom - b.height * 0.17}v${b.height * 0.13}`}
            stroke="#a99c76"
            strokeWidth="2"
          />
        </g>
      )}
      {motion === 'read' && (
        <g className={styles.prop}>
          <path
            d={`M${b.x + b.width * 0.25} ${bottom - b.height * 0.16}l${b.width * 0.24} 3l${b.width * 0.24} -3v${b.height * 0.12}l${-b.width * 0.24} 3l${-b.width * 0.24} -3Z`}
            fill="#e6dfc8"
            stroke="#7d806c"
            strokeWidth="1.5"
          />
          <path
            d={`M${b.x + b.width * 0.49} ${bottom - b.height * 0.15}v${b.height * 0.12}`}
            stroke="#a2967d"
          />
        </g>
      )}
    </svg>
  );
}
