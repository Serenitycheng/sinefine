'use client';
import { useId } from 'react';
import type { PreviewSprite } from '@/lib/fate-preview-house';
import { runtimeArt } from '@/lib/fate-runtime-art';
import type { InteractionMotion } from '@/lib/fate-interaction-motion';
import { bodyInteractionSprite } from '@/lib/fate-body-art';
import styles from './fate-interaction-motion.module.css';

/** Preserve the whole painted body. Generic rectangular arm cuts also moved
 * hair, sleeves and coats, especially in back/side views. Authored poses and
 * articulated rigs remain owned by their character renderers. */
export function FateInteractionMotion({
  sprite,
  scale,
  motion,
}: {
  sprite: PreviewSprite;
  scale: number;
  motion: InteractionMotion;
}) {
  const id = useId().replaceAll(':', '');
  const s = bodyInteractionSprite(sprite, motion);
  // Additional pose sheets have different authored pixel heights.
  scale *=
    (sprite.bounds.height * sprite.scale) /
    Math.max(1, s.bounds.height * sprite.scale);
  const b = s.bounds;
  const x = s.mirror ? s.cellWidth - b.x - b.width : b.x;
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
          {s.clip ? (
            <polygon points={s.clip.map((p) => p.join(',')).join(' ')} />
          ) : (
            <rect x={x} y={b.y} width={b.width} height={b.height} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}body)`}>
        <image
          href={runtimeArt(s.file)}
          x={-s.cropX}
          y={-s.cropY}
          width={s.imageWidth}
          height={s.imageHeight}
        />
      </g>
    </svg>
  );
}
