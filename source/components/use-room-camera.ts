'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CityPoint } from '@/lib/fate-city-layout';
import {
  roomArrivalCamera,
  roomFollowCamera,
  roomResizeCamera,
} from '@/lib/fate-room-camera';

export function useRoomCamera(input: {
  foot: CityPoint;
  body: CityPoint & { width: number; height: number };
  scale: number;
  size: { width: number; height: number };
  target: CityPoint;
  anchor?: CityPoint;
  ready: boolean;
}) {
  const [position, setPosition] = useState<CityPoint | null>(null);
  const current = useRef(input);
  const displayed = useRef<CityPoint | null>(null);
  const geometry = useRef({ scale: input.scale, size: input.size });
  useLayoutEffect(() => {
    current.current = input;
    displayed.current = position;
  });
  useEffect(() => {
    if (!input.ready) return;
    let raf = 0,
      last = 0;
    const tick = (now: number) => {
      const value = current.current,
        previous = geometry.current;
      const origin = displayed.current;
      const resized =
        previous.scale !== value.scale ||
        previous.size.width !== value.size.width ||
        previous.size.height !== value.size.height;
      const next = !origin
        ? roomArrivalCamera(
            value.anchor,
            value.foot,
            value.scale,
            value.size,
            value.body,
            value.target,
          )
        : resized
          ? roomResizeCamera(
              origin,
              value.foot,
              previous,
              value.scale,
              value.size,
              value.body,
            )
          : roomFollowCamera(
              origin,
              value.foot,
              value.scale,
              value.size,
              value.body,
              last ? Math.min(0.05, (now - last) / 1000) : 0,
            );
      last = now;
      geometry.current = { scale: value.scale, size: value.size };
      if (!origin || Math.hypot(origin.x - next.x, origin.y - next.y) > 0.05)
        setPosition(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [input.ready]);
  return (
    position ??
    roomArrivalCamera(
      input.anchor,
      input.foot,
      input.scale,
      input.size,
      input.body,
      input.target,
    )
  );
}
