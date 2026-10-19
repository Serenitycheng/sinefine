import assert from 'node:assert/strict';
import test from 'node:test';
import { cityActorMotion } from '../lib/fate-city-gait';
import { cityPilotPaint } from '../lib/fate-city-art';
import { cityWalkFacing } from '../lib/fate-city-art-controls';
import { CITY_ART_SCENE_IDS } from '../lib/fate-city-art-scenes';
import { CITY_ART_MODES } from '../lib/fate-city-art-camera';
import { houseGaitFrame } from '../lib/fate-house-walk';
import { STREET_PARTNERS } from '../lib/fate-cast';
import {
  formalHousePlan,
  houseResidentSprite,
} from '../lib/fate-house-sprites';
import { seatedSpriteForAction } from '../lib/fate-seated-sprites';
import { previewPresentation } from '../lib/fate-preview-presentation';
import { interiorOcclusionLayers } from '../lib/fate-interior-occlusion';
import { insideInteriorShape } from '../lib/fate-interior-geometry';

void test('every city painting uses its painted displacement for facing and model travel', () => {
  const from = { x: 620, y: 1160 },
    to = { x: 625, y: 1168 };
  for (const scene of CITY_ART_SCENE_IDS)
    for (const mode of CITY_ART_MODES) {
      const a = cityPilotPaint(from, mode, scene),
        b = cityPilotPaint(to, mode, scene);
      const m = cityActorMotion(from, to, mode, scene, 'right', 0.4);
      assert.equal(
        m.direction,
        cityWalkFacing({ x: b.x - a.x, y: b.y - a.y }, 'right'),
      );
      assert.ok(Number.isFinite(m.travel) && m.travel > 0);
      assert.equal(
        cityActorMotion(from, to, mode, scene, 'right', 0.8).travel,
        m.travel / 2,
      );
      assert.deepEqual(cityActorMotion(from, from, mode, scene, 'up', 0.4), {
        direction: 'up',
        bodyFacing: 'up',
        travel: 0,
      });
    }
});
void test('all native residents complete six moving phases without inserting rest, including fractional Kiritsugu rig phases', () => {
  for (const actor of STREET_PARTNERS) {
    const phases = new Set<number>();
    for (let distance = 0; distance < 1200; distance++) {
      const phase = houseGaitFrame(actor, distance, true);
      assert.ok(phase >= 1 && phase < 7);
      phases.add(Math.floor(phase));
      const sprite = houseResidentSprite(actor, 'left', phase)!;
      assert.ok(Number.isFinite(sprite.scale));
    }
    assert.equal(phases.size, 6);
    assert.equal(houseGaitFrame(actor, 1200, false), 0);
  }
});
void test('all 21 identities use a registered chair pose or an honest standing interaction', () => {
  for (const actor of STREET_PARTNERS)
    for (const stage of actor === 'waver'
      ? (['young', 'adult'] as const)
      : (['adult'] as const)) {
      const plan = formalHousePlan('old-repair', actor, stage),
        room = plan.rooms.annex;
      const action = room.actions.find((a) => a.id === 'manual');
      const spot = room.scene.spots.find((s) => s.id === 'manual')!;
      if (!action) {
        assert.doesNotMatch(spot.label, /坐下/);
        continue;
      }
      const sprite = seatedSpriteForAction(
        plan.sprite(actor, 'down', 0, action.pose),
        action,
      );
      assert.ok(sprite.seated && sprite.seat, actor);
      if (sprite.seatedFacing) assert.equal(sprite.seatedFacing, 'left', actor);
      const v = previewPresentation(room.scene, spot.point, sprite, action);
      assert.ok(
        Math.abs(
          v.foot.x +
            (sprite.seat!.x - sprite.anchorX) * v.spriteScale -
            action.seat!.x,
        ) < 1e-6,
      );
      assert.ok(
        Math.abs(
          v.foot.y +
            (sprite.seat!.y - sprite.anchorY) * v.spriteScale -
            action.seat!.y,
        ) < 1e-6,
      );
      const desk = room.scene.furniture.find((f) => f.id === 'desk')!;
      assert.ok(
        v.layer < desk.footprint.y + desk.footprint.height,
        'legs belong behind the desk',
      );
    }
});
void test('floor sitting is confined to the temple and chair poses are not substituted for floor sitting', () => {
  for (const actor of ['medea', 'kuzuki', 'rin', 'kiritsugu'] as const) {
    const temple = formalHousePlan('temple', actor, 'adult');
    assert.equal(
      Object.values(temple.rooms).some((r) => r.actions.length > 0),
      actor === 'medea' || actor === 'kuzuki',
    );
    if (actor === 'medea' || actor === 'kuzuki')
      assert.ok(
        Object.values(formalHousePlan('old-repair', actor, 'adult').rooms).some(
          (r) => r.actions.length > 0,
        ),
      );
  }
});

void test('repair desk masks contain its apron, leg and cabinet while leaving the seated body visible through the opening', () => {
  const scene = formalHousePlan('old-repair', 'rin', 'adult').rooms.annex.scene;
  const masks = interiorOcclusionLayers(scene).filter((l) => l.id === 'desk');
  const covered = (x: number, y: number) =>
    masks.some((l) => insideInteriorShape({ x, y }, l.polygon));
  assert.equal(
    covered(1400, 630),
    false,
    'open air below the tabletop is not a solid painted block',
  );
  assert.equal(
    covered(1400, 450),
    true,
    'apron still hides limbs which pass behind it',
  );
  assert.equal(covered(1490, 650), true, 'desk leg remains solid');
  assert.equal(covered(1550, 650), true, 'cabinet remains solid');
});
