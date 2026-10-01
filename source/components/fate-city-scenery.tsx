import { FateStreetScenery } from './fate-street-scenery';

/** Overview and walking view use the same roads, buildings and entrances. */
export function FateCityScenery({ miniature = false, labels = true, period = '午后' }: {
  miniature?: boolean; labels?: boolean; period?: string;
}) {
  return <FateStreetScenery map miniature={miniature} labels={labels} period={period}/>;
}
