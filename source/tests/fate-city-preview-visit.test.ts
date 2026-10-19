import assert from 'node:assert/strict';
import test from 'node:test';
import { cityPreviewVisit } from '../lib/fate-city-preview-visit';
import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
} from '../lib/fate-city-interior-scenes';
import { houseResidentSprite } from '../lib/fate-house-sprites';
import { STREET_PARTNERS } from '../lib/fate-cast';

void test('Illya enters either florist room as Illya instead of the shop sample Sakura', () => {
  const visit = cityPreviewVisit(
    CITY_INTERIOR_SCENES['miyama-florist'],
    'illya',
  );
  assert.equal(visit.actor, 'illya');
  assert.deepEqual(
    visit.plan.cast.map((p) => p.id),
    ['illya'],
  );
  for (const room of Object.values(visit.plan.rooms)) {
    assert.equal(room.scene.id, 'miyama-florist');
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      const sprite = visit.plan.sprite(visit.actor, direction, 1);
      assert.equal(
        sprite.file,
        houseResidentSprite('illya', direction, 1)!.file,
      );
      assert.notEqual(
        sprite.file,
        houseResidentSprite('sakura', direction, 1, 'adult', 'miyama-florist')!
          .file,
      );
    }
  }
  assert.ok(visit.plan.rooms.hall.doors.some((d) => d.to === null));
  assert.ok(visit.plan.rooms.hall.doors.some((d) => d.to !== null));
});

void test('all city buildings retain a visiting identity, including non-resident visitors', () => {
  for (const id of CITY_INTERIOR_IDS)
    for (const actor of STREET_PARTNERS) {
      const visit = cityPreviewVisit(CITY_INTERIOR_SCENES[id], actor);
      assert.equal(visit.actor, actor, `${id}:${actor}`);
      assert.deepEqual(
        visit.plan.cast.map((p) => p.id),
        [actor],
      );
      assert.ok(visit.plan.rooms[visit.room]);
      const sprite = visit.plan.sprite(actor, 'down', 0);
      assert.ok(sprite.file && sprite.cellWidth > 0 && sprite.cellHeight > 0);
    }
});

void test('the Emiya visitor enters its street-facing forecourt without changing the original scene', () => {
  const original = JSON.stringify(CITY_INTERIOR_SCENES);
  const visit = cityPreviewVisit(CITY_INTERIOR_SCENES.emiya, 'illya');
  assert.equal(visit.room, 'forecourt');
  assert.deepEqual(visit.entry, { x: 500, y: 632 });
  assert.ok(visit.plan.rooms.forecourt.doors.some((d) => d.to === null));
  assert.equal(JSON.stringify(CITY_INTERIOR_SCENES), original);
});
