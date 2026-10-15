import type { PreviewSprite } from '@/lib/fate-preview-house';
import { runtimeArt } from '@/lib/fate-runtime-art';

export function FateArtRig({
  sprite,
  scale,
  left = 0,
  top = 0,
}: {
  sprite: PreviewSprite;
  scale: number;
  left?: number;
  top?: number;
}) {
  return (
    <span
      aria-hidden="true"
      data-art-rig="kiritsugu"
      data-rig-phase={sprite.rig!.phase}
      style={{
        display: 'block',
        position: 'absolute',
        left,
        top,
        width: sprite.cellWidth * scale,
        height: sprite.cellHeight * scale,
        transform: `translate(${-sprite.anchorX * scale}px,${-sprite.anchorY * scale}px)${sprite.mirror ? ' scaleX(-1)' : ''}`,
        pointerEvents: 'none',
      }}
    >
      {sprite.rig!.layers.map((layer) => (
        <span
          key={layer.part}
          data-rig-part={layer.part}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${runtimeArt(sprite.file)})`,
            backgroundSize: `${sprite.imageWidth * scale}px ${sprite.imageHeight * scale}px`,
            backgroundPosition: `${-sprite.cropX * scale}px ${-sprite.cropY * scale}px`,
            backgroundRepeat: 'no-repeat',
            clipPath: `polygon(${layer.clip.map(([x, y]) => `${(x / sprite.cellWidth) * 100}% ${(y / sprite.cellHeight) * 100}%`).join(',')})`,
            transformOrigin: '0 0',
            transform: `matrix(${[...layer.matrix.slice(0, 4), layer.matrix[4] * scale, layer.matrix[5] * scale].join(',')})`,
            filter:
              layer.shade !== 1 ? `brightness(${layer.shade ?? 1})` : undefined,
          }}
        />
      ))}
    </span>
  );
}
