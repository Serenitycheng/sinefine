import type { CityPoint } from './fate-city-layout';
import type { CityArtScene } from './fate-city-art-scenes';

export const CITY_ART_MODES = ['overview', 'along', 'eye'] as const;
export type CityArtMode = (typeof CITY_ART_MODES)[number];
export const CITY_ART_CAMERAS: Record<
  CityArtMode,
  {
    label: string;
    painting: string;
    width: number;
    height: number;
  }
> = {
  overview: {
    label: '斜俯看',
    painting: '/fate/city-art/miyama-residential-west-soft-v2.png',
    width: 1672,
    height: 941,
  },
  along: {
    label: '沿路看',
    painting: '/fate/city-art/miyama-residential-west-along-soft-v2.png',
    width: 1671,
    height: 941,
  },
  eye: {
    label: '平视前路',
    painting: '/fate/city-art/miyama-residential-west-eye-soft-v2.png',
    width: 1672,
    height: 941,
  },
};

export const OLD_STREET_CAMERAS: typeof CITY_ART_CAMERAS = {
  overview: {
    label: '斜俯看',
    painting: '/fate/city-art/miyama-old-north-overview-v1.png',
    width: 1672,
    height: 941,
  },
  along: {
    label: '沿路看',
    painting: '/fate/city-art/miyama-old-north-along-v1.png',
    width: 1672,
    height: 941,
  },
  eye: {
    label: '平视前路',
    painting: '/fate/city-art/miyama-old-north-eye-v1.png',
    width: 1672,
    height: 941,
  },
};
export function cityArtCamera(
  mode: CityArtMode,
  scene: CityArtScene = 'residential',
) {
  if (scene === 'residential') return CITY_ART_CAMERAS[mode];
  if (scene === 'old-street') return OLD_STREET_CAMERAS[mode];
  return {
    ...CITY_ART_CAMERAS[mode],
    painting: `/fate/city-art/${scene}-${mode}-v1.png`,
    width: 1672,
    height: 941,
  };
}

/** Keep the actor's feet at the same screen position while both complete
 * registered paintings dissolve together. This changes the camera, never the
 * world position, route, or doorstep. */
export function cityCameraPan(
  screenFoot: CityPoint,
  nextPaint: CityPoint,
  scale: number,
  size: { width: number; height: number },
  painting: { width: number; height: number },
  following: boolean,
): CityPoint {
  const center = following
    ? {
        x: size.width * 0.52 - nextPaint.x * scale,
        y: size.height * 0.66 - nextPaint.y * scale,
      }
    : {
        x: (size.width - painting.width * scale) / 2,
        y: (size.height - painting.height * scale) / 2,
      };
  return {
    x: screenFoot.x - center.x - nextPaint.x * scale,
    y: screenFoot.y - center.y - nextPaint.y * scale,
  };
}

/** Only extreme magnification caps the displayed body; feet and world pace
 * are unchanged. Leave room for the complete sprite even in a short viewport. */
export function cityCameraActorScale(
  depth: number,
  scale: number,
  size: { width: number; height: number },
) {
  return Math.min(
    0.44 * depth,
    Math.max(32, size.height - 64) / (276 * 1.05 * scale),
    Math.max(32, size.width - 32) / (312 * 1.05 * scale),
  );
}

/** Prefer an unbroken painting and the previous foot anchor. If an edge makes
 * those incompatible, expose only the gutter needed to show the entire actor.
 * Dragging may browse away; walking and a new view restore the safe frame. */
export function cityCameraOrigin(
  desired: CityPoint,
  foot: CityPoint,
  scale: number,
  size: { width: number; height: number },
  painting: { width: number; height: number },
  actorScale: number,
  keepActor = true,
): CityPoint {
  const body = actorScale * 1.05 * scale;
  const axis = (
    value: number,
    viewport: number,
    extent: number,
    at: number,
    before: number,
    after: number,
  ) => {
    const low = extent > viewport ? viewport - extent : (viewport - extent) / 2;
    const high = extent > viewport ? 0 : low;
    const covered = Math.max(low, Math.min(high, value));
    if (!keepActor) return covered;
    const actorLow = 12 + before - at;
    const actorHigh = viewport - 12 - after - at;
    const sharedLow = Math.max(low, actorLow);
    const sharedHigh = Math.min(high, actorHigh);
    return sharedLow <= sharedHigh
      ? Math.max(sharedLow, Math.min(sharedHigh, value))
      : Math.max(actorLow, Math.min(actorHigh, covered));
  };
  return {
    x: axis(
      desired.x,
      size.width,
      painting.width * scale,
      foot.x * scale,
      157 * body,
      155 * body,
    ),
    y: axis(
      desired.y,
      size.height,
      painting.height * scale,
      foot.y * scale,
      254 * body,
      22 * body,
    ),
  };
}

/** Resize screen-pixel browsing offsets with the painting and keep the frame
 * covered. A desktop foot-anchored transition offset can otherwise put the
 * whole painting outside a portrait viewport. This never changes world/zoom. */
export function cityCameraResizePan(
  pan: CityPoint,
  previous: { width: number; height: number },
  next: { width: number; height: number },
  painting: { width: number; height: number },
  zoom: number,
  following: boolean,
  foot: CityPoint,
): CityPoint {
  const oldFit = Math.min(
    previous.width / painting.width,
    previous.height / painting.height,
  );
  const fit = Math.min(
    next.width / painting.width,
    next.height / painting.height,
  );
  const ratio = oldFit > 0 ? fit / oldFit : 1;
  const scale = fit * zoom;
  const base = following
    ? {
        x: next.width * 0.52 - foot.x * scale,
        y: next.height * 0.66 - foot.y * scale,
      }
    : {
        x: (next.width - painting.width * scale) / 2,
        y: (next.height - painting.height * scale) / 2,
      };
  const axis = (
    offset: number,
    origin: number,
    viewport: number,
    extent: number,
  ) =>
    extent <= viewport
      ? (viewport - extent) / 2 - origin
      : Math.max(viewport - extent - origin, Math.min(-origin, offset));
  return {
    x: axis(pan.x * ratio, base.x, next.width, painting.width * scale),
    y: axis(pan.y * ratio, base.y, next.height, painting.height * scale),
  };
}
