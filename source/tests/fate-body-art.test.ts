import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyFacing, BODY_FACINGS } from '../lib/fate-body-facing';
import { bodyArtSprite, bodyInteractionSprite } from '../lib/fate-body-art';
import { STREET_PARTNERS } from '../lib/fate-cast';
import {
  formalHousePlan,
  houseResidentSprite,
} from '../lib/fate-house-sprites';
import { seatedSpriteForAction } from '../lib/fate-seated-sprites';

void test('opposite chair poses use authored views instead of mirroring asymmetrical clothing', () => {
  const left = bodyArtSprite('diarmuid', 'down', 0, 'adult', 'read')!;
  const right = seatedSpriteForAction(left, {
    id: 'read',
    pose: 'read',
    facing: 'right',
    contact: { x: 0, y: 0 },
    elevation: 0,
  });
  assert.equal(right.mirror, false);
  assert.equal(right.seatedFacing, 'right');
  assert.notEqual(right.cropX, left.cropX);
  assert.equal(right.standingHeight, left.standingHeight);
  assert.ok(right.seat);
});

void test('eight painted movement sectors choose whole-body views and a stop preserves the oblique view', () => {
  const vectors = [
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  vectors.forEach(([x, y], i) =>
    assert.equal(bodyFacing({ x, y }, 'down'), BODY_FACINGS[i]),
  );
  for (const facing of BODY_FACINGS)
    assert.equal(bodyFacing({ x: 0, y: 0 }, facing), facing);
});

void test('all identities and both Waver stages have eight distinct registered views at their established height', () => {
  for (const id of STREET_PARTNERS)
    for (const stage of id === 'waver'
      ? (['young', 'adult'] as const)
      : (['adult'] as const)) {
      const crops = new Set();
      for (const facing of BODY_FACINGS) {
        const s = houseResidentSprite(
          id,
          'down',
          0,
          stage,
          undefined,
          undefined,
          facing,
        )!;
        assert.equal(s.materialVersion, 'body-v2', `${id}/${stage}/${facing}`);
        assert.equal(s.bodyFacing, facing);
        assert.ok(
          Math.abs(s.bounds.height * s.scale - s.standingHeight!) < 0.001,
        );
        assert.ok(
          s.cropX >= 0 &&
            s.cropY >= 0 &&
            s.cropX + s.cellWidth <= s.imageWidth &&
            s.cropY + s.cellHeight <= s.imageHeight,
        );
        crops.add(`${s.cropX}:${s.cropY}`);
        const walking = houseResidentSprite(
          id,
          'down',
          2,
          stage,
          undefined,
          undefined,
          facing,
        )!;
        assert.ok(walking.rig?.layers.length);
      }
      assert.equal(crops.size, 8, `${id}/${stage}`);
    }
});

void test('all 22 versions have real chair reading, a registered hip, and authored standing interaction art', () => {
  for (const id of STREET_PARTNERS)
    for (const stage of id === 'waver'
      ? (['young', 'adult'] as const)
      : (['adult'] as const)) {
      const plan = formalHousePlan('old-repair', id, stage),
        action = plan.rooms.annex.actions.find((a) => a.id === 'manual')!;
      assert.ok(action, `${id}/${stage}`);
      const s = seatedSpriteForAction(
        plan.sprite(id, 'down', 0, action.pose),
        action,
      );
      assert.equal(s.materialVersion, 'body-v2');
      assert.ok(s.seat);
      assert.equal(s.seatedFacing, 'left');
      const stand = bodyArtSprite(id, 'left', 0, stage)!;
      for (const motion of ['read', 'work']) {
        const work = bodyInteractionSprite(stand, motion);
        assert.notEqual(
          `${work.file}/${work.index}`,
          `${stand.file}/${stand.index}`,
          `${id}/${motion}`,
        );
        assert.equal(work.standingHeight, stand.standingHeight);
      }
    }
});

void test('new chair poses and floor poses use separate frames, without substituting a chair for an unpainted floor pose', () => {
  for (const id of [
    'saber',
    'taiga',
    'diarmuid',
    'natalia',
    'waver',
  ] as const) {
    const stage = id === 'waver' ? 'young' : 'adult';
    const chair = bodyArtSprite(id, 'down', 0, stage, 'read', 'down', 'chair')!;
    const floor = bodyArtSprite(id, 'down', 0, stage, 'read', 'down', 'floor')!;
    assert.ok(chair && floor);
    assert.notEqual(chair.index, floor.index);
    assert.ok(floor.poseHeightRatio! < chair.poseHeightRatio!);
  }
  assert.equal(
    bodyArtSprite('rin', 'down', 0, 'adult', 'read', 'down', 'floor'),
    null,
  );
});
