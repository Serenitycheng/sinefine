import { STREET } from '@/lib/street';
import { STREET_SCENE_SCALE } from '@/lib/fate-district';
import { FateCityScenery } from './fate-city-scenery';
import styles from './street-walk.module.css';

export function FateStreetScenery({ period }: { period: string }) {
  return (
    <div
      className={styles.continuousScenery}
      style={{
        width: STREET.width * STREET_SCENE_SCALE,
        height: STREET.height * STREET_SCENE_SCALE,
        filter: period === '夜间' ? 'brightness(.58) saturate(.78)' : period === '傍晚' ? 'brightness(.86) sepia(.14)' : undefined,
      }}
      aria-hidden="true"
    >
      <FateCityScenery labels={false} />
    </div>
  );
}
