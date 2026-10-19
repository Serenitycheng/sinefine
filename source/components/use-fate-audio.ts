'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  fateAudio,
  type AmbientSound,
  type GroundSound,
} from '@/lib/fate-audio';
import type { CityPoint } from '@/lib/fate-city-layout';
import { houseWalkDistance } from '@/lib/fate-house-walk';
import type { InteriorFloor } from '@/lib/fate-city-interior-scenes';

export function useFateAudio(input: {
  key: string;
  ambient: AmbientSound;
  ground: GroundSound;
  active: boolean;
  position: () => CityPoint | null;
  floor?: InteriorFloor;
}) {
  const current = useRef(input);
  useLayoutEffect(() => {
    current.current = input;
  });
  useEffect(() => {
    fateAudio.initialize();
    if (!input.active) return;
    const release = fateAudio.claim({ key: input.key, ambient: input.ambient });
    let previous: CityPoint | null = null;
    const timer = setInterval(() => {
      const value = current.current,
        point = value.position();
      if (point && previous && !document.hidden) {
        const distance = value.floor
          ? houseWalkDistance(previous, point, value.floor)
          : Math.hypot(point.x - previous.x, point.y - previous.y) * 1.8;
        fateAudio.walk(distance, value.ground);
      }
      previous = point ? { ...point } : null;
    }, 80);
    return () => {
      clearInterval(timer);
      release();
    };
  }, [input.key, input.ambient, input.active]);
}
