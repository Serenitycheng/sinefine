import assert from 'node:assert/strict';
import test from 'node:test';
import { houseResidentSprite } from '../lib/fate-house-sprites';
import { ILLYA_DISPLAY_SCALE } from '../lib/fate-actor-proportions';
import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
  interiorDepth,
} from '../lib/fate-city-interior-scenes';
import { cityPreviewVisit } from '../lib/fate-city-preview-visit';
import { previewPresentation } from '../lib/fate-preview-presentation';
import { mirrorPreviewSprite } from '../lib/fate-preview-house';
import { FootstepClock, fateAudio, roomAcoustics } from '../lib/fate-audio';
import { interactionMotion } from '../lib/fate-interaction-motion';
import crops from '../lib/fate-interior-closeup-data.json';
import { interiorObjectFrame } from '../lib/fate-interior-detail';

void test('Illya has one consistent taller standing calibration across directions and walk phases, with the original foot anchors', () => {
  const child = houseResidentSprite('illya', 'down', 0)!;
  const childHeight = child.bounds.height * child.scale;
  for (const adult of [
    'rin',
    'sakura',
    'kiritsugu',
    'irisviel',
    'shirou',
  ] as const) {
    const model = houseResidentSprite(adult, 'down', 0)!;
    assert.ok(
      childHeight < model.bounds.height * model.scale * 0.9,
      `${adult}: retain the child's relative height`,
    );
  }
  for (const direction of ['down', 'up', 'left', 'right'] as const)
    for (let phase = 0; phase <= 6; phase++) {
      const s = houseResidentSprite('illya', direction, phase)!;
      assert.ok(
        Math.abs(s.bounds.height * s.scale - 242 * ILLYA_DISPLAY_SCALE) < 4,
      );
      assert.ok(s.anchorY >= s.bounds.y + s.bounds.height - 4);
    }
});

void test('seated visitors do not grow with a chair multiplier, and registered pelvis contacts remain exact', () => {
  for (const site of CITY_INTERIOR_IDS)
    for (const actor of ['illya', 'kiritsugu', 'rin', 'sakura'] as const) {
      const plan = cityPreviewVisit(CITY_INTERIOR_SCENES[site], actor).plan;
      for (const room of Object.values(plan.rooms))
        for (const action of room.actions) {
          let sprite = plan.sprite(actor, 'down', 0, action.pose);
          if (action.mirror) sprite = mirrorPreviewSprite(sprite);
          if (!sprite.seated) continue;
          const point = room.scene.spots.find((s) => s.id === action.id)!.point;
          const view = previewPresentation(room.scene, point, sprite, action);
          const relative =
            view.body.height /
            interiorDepth(action.contact, room.scene.floor) /
            sprite.standingHeight! /
            (room.scene.figureScale ?? 1);
          assert.ok(
            relative >= 0.73 && relative <= 0.84,
            `${site}/${action.id}/${actor}: ${relative}`,
          );
          if (sprite.seat && action.seat) {
            assert.ok(
              Math.abs(
                view.foot.x +
                  (sprite.seat.x - sprite.anchorX) * view.spriteScale -
                  action.seat.x,
              ) < 1e-7,
            );
            assert.ok(
              Math.abs(
                view.foot.y +
                  (sprite.seat.y - sprite.anchorY) * view.spriteScale -
                  action.seat.y,
              ) < 1e-7,
            );
          }
          if (!action.behind?.length) assert.equal(view.layer >= point.y, true);
        }
    }
});

void test('all 177 object crops are registered individually, stay inside the painting and contain their chosen focal point', () => {
  let count = 0;
  for (const site of CITY_INTERIOR_IDS) {
    const plan = cityPreviewVisit(CITY_INTERIOR_SCENES[site], 'illya').plan;
    for (const [id, room] of Object.entries(plan.rooms)) {
      const registered = (crops as Record<string, Record<string, number[]>>)[
        `${site}/${id}`
      ];
      assert.ok(registered);
      assert.deepEqual(
        Object.keys(registered).sort(),
        room.scene.spots.map((s) => s.id).sort(),
      );
      for (const spot of room.scene.spots) {
        const f = spot.detailFrame!;
        assert.ok(f);
        assert.ok(
          f.x >= 0 &&
            f.y >= 0 &&
            f.x + f.width <= 1600.1 &&
            f.y + f.height <= 900.1,
        );
        assert.ok(Math.abs(f.width / f.height - 1.6) < 0.002);
        const p = spot.detailTarget ?? spot.target!;
        assert.ok(
          p.x >= f.x - 0.1 &&
            p.x <= f.x + f.width + 0.1 &&
            p.y >= f.y - 0.1 &&
            p.y <= f.y + f.height + 0.1,
        );
        count++;
      }
    }
  }
  assert.equal(count, 177);
  assert.notEqual(
    interiorObjectFrame({ x: 500, y: 500 }, '看看窗户').width,
    interiorObjectFrame({ x: 500, y: 500 }, '看看花').width,
  );
});

void test('footsteps follow actual distance; stationary frames and teleports produce no sound, and muted synthesis needs no browser audio context', () => {
  const a = new FootstepClock(),
    b = new FootstepClock();
  let steps = 0;
  for (let i = 0; i < 96; i++) steps += a.advance(2);
  assert.equal(steps, b.advance(192));
  assert.equal(a.advance(0), 0);
  assert.equal(a.advance(900), 0);
  assert.equal(a.advance(NaN), 0);
  assert.doesNotThrow(() => {
    fateAudio.walk(100, 'wood');
    fateAudio.door();
    fateAudio.interact('wrap');
  });
  assert.equal(fateAudio.enabled, false);
  assert.deepEqual(roomAcoustics('卫宫宅', '家庭和室'), {
    ambient: 'home',
    ground: 'tatami',
  });
  assert.deepEqual(roomAcoustics('卫宫宅', '门前庭院'), {
    ambient: 'outdoor',
    ground: 'stone',
  });
  assert.deepEqual(roomAcoustics('深山花店', '花艺工作间'), {
    ambient: 'shop',
    ground: 'wood',
  });
  assert.equal(interactionMotion('看看包装台'), 'wrap');
  assert.equal(interactionMotion('看看水槽与花桶'), 'pour');
  assert.equal(interactionMotion('翻阅笔记'), 'read');
});
