import { FORMAL_HOUSE_PLANS } from './fate-formal-house-plans';
import { formalHousePlan, houseResidentSprite } from './fate-house-sprites';
import {
  INTERIOR_ART_ENTRY,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import type { HouseSiteId } from './fate-formal-buildings';
import { fatePerson, type PartnerId, type WaverStage } from './fate-cast';
import type { PreviewHouse } from './fate-preview-house';
import { registeredInterior } from './fate-interior-contacts';

/** Enter with the street visitor, rather than the building's first sample actor. */
export function cityPreviewVisit(
  scene: CityInteriorScene,
  actor: PartnerId,
  stage: WaverStage = 'adult',
) {
  const registered = Object.hasOwn(FORMAL_HOUSE_PLANS, scene.id);
  const plan: PreviewHouse = registered
    ? formalHousePlan(scene.id as HouseSiteId, actor, stage)
    : {
        name: scene.name,
        routeSummary: scene.room,
        cast: [{ id: actor, name: fatePerson(actor, stage)!.name }],
        sprite: (id, direction, phase) =>
          houseResidentSprite(id as PartnerId, direction, phase, stage)!,
        rooms: {
          hall: {
            scene: registeredInterior(scene.id, 'hall', scene),
            actions: [],
            doors: [
              {
                id: 'street',
                label: '回到街道',
                point: INTERIOR_ART_ENTRY,
                to: null,
                arrival: INTERIOR_ART_ENTRY,
              },
            ],
          },
        },
      };
  return {
    plan,
    actor,
    room: scene.id === 'emiya' ? 'forecourt' : 'hall',
    entry:
      registered && scene.id !== 'emiya'
        ? { x: 500, y: 560 }
        : { ...INTERIOR_ART_ENTRY },
  };
}
