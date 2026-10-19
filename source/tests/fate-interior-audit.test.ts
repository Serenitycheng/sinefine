import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
  interiorProject,
} from '../lib/fate-city-interior-scenes';
import { cityPreviewVisit } from '../lib/fate-city-preview-visit';
import {
  interiorClearSegment,
  interiorMove,
  interiorRoute,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';
import {
  nearestInteriorSpot,
  interiorObjectFacing,
} from '../lib/fate-interior-interaction';
import { EMIYA_ROOMS } from '../lib/fate-emiya-house';
import { interiorDoorGuides } from '../lib/fate-interior-controls';
import { previewPresentation } from '../lib/fate-preview-presentation';
import registrations from '../lib/fate-interior-contact-data.json';
import { furnitureSolids } from '../lib/fate-interior-access';

void test('Illya attaches her seated hips to the painted Tohsaka chair without moving her safe approach', () => {
  const { plan } = cityPreviewVisit(CITY_INTERIOR_SCENES.tohsaka, 'illya');
  const room = plan.rooms.study;
  const action = room.actions.find((item) => item.id === 'tea')!;
  const point = room.scene.spots.find((item) => item.id === 'tea')!.point;
  const original = { ...point };
  const sprite = plan.sprite('illya', 'left', 0, action.pose);
  assert.ok(action.seat);
  assert.ok(sprite.seat);
  const view = previewPresentation(room.scene, point, sprite, action);
  const hip = {
    x: view.foot.x + (sprite.seat.x - sprite.anchorX) * view.spriteScale,
    y: view.foot.y + (sprite.seat.y - sprite.anchorY) * view.spriteScale,
  };
  assert.ok(Math.abs(hip.x - 979.8016) < 0.01);
  assert.ok(Math.abs(hip.y - 532.2969) < 0.01);
  assert.deepEqual(point, original);
  assert.equal(plan.sprite('illya', 'left', 0).seat, undefined);
});

void test('flower inspections face the actual pot or counter while retaining a standing approach', () => {
  const room = cityPreviewVisit(CITY_INTERIOR_SCENES['miyama-florist'], 'illya')
    .plan.rooms.hall;
  for (const id of ['gardenia', 'wrap']) {
    const spot = room.scene.spots.find((s) => s.id === id)!;
    const point = spot.approaches![0],
      paint = interiorProject(point, room.scene.floor);
    const facing = interiorObjectFacing(point, spot.target, room.scene, 'down');
    const vectors = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    assert.ok(
      (spot.target!.x - paint.x) * vectors[facing].x +
        (spot.target!.y - paint.y) * vectors[facing].y >
        0,
    );
    assert.equal(
      room.actions.some((a) => a.id === id),
      false,
    );
    assert.equal(
      nearestInteriorSpot(spot.approaches![0], room.scene, id)?.id,
      id,
    );
  }
});

void test('door labels avoid nearby actions and clickable objects on a narrow screen', () => {
  const body = { x: 160, y: 310, width: 50, height: 82 },
    hint = { x: 90, y: 405, width: 230, height: 52 },
    object = { x: 50, y: 280, width: 48, height: 48 };
  const marks = interiorDoorGuides(
    [
      { x: 270, y: 480 },
      { x: 200, y: 280 },
    ],
    { width: 390, height: 618 },
    body,
    [hint, object],
  );
  for (const mark of marks) {
    assert.ok(mark);
    const rect = {
      x: mark.x - mark.width / 2,
      y: mark.y - 18,
      width: mark.width,
      height: 36,
    };
    for (const reserved of [body, hint, object])
      assert.ok(
        rect.x + rect.width <= reserved.x ||
          rect.x >= reserved.x + reserved.width ||
          rect.y + rect.height <= reserved.y ||
          rect.y >= reserved.y + reserved.height,
      );
  }
});

const rooms = CITY_INTERIOR_IDS.flatMap((site) =>
  Object.entries(
    cityPreviewVisit(CITY_INTERIOR_SCENES[site], 'illya').plan.rooms,
  ).map(([id, room]) => ({ key: `${site}/${id}`, site, id, ...room })),
);

void test('every authored contact correction refers to an existing room, object and furniture', () => {
  type Registration = {
    targets: Record<string, unknown>;
    closeups?: Record<string, unknown>;
    details?: Record<string, string>;
    approaches?: Record<string, unknown>;
    hitboxes?: Record<string, unknown>;
    seats?: Record<string, unknown>;
    objects?: Record<string, string>;
  };
  for (const [key, data] of Object.entries(registrations) as [
    string,
    Registration,
  ][]) {
    const room = rooms.find((r) => r.key === key);
    assert.ok(room, key);
    for (const field of [
      'targets',
      'closeups',
      'details',
      'approaches',
      'hitboxes',
      'seats',
      'objects',
    ] as const)
      for (const id of Object.keys(data[field] ?? {}))
        assert.ok(
          room.scene.spots.some((s) => s.id === id),
          `${key}.${field}.${id}`,
        );
    for (const id of Object.values(data.objects ?? {}))
      assert.ok(
        room.scene.furniture.some((f) => f.id === id),
        `${key} owner ${id}`,
      );
  }
});

void test('chair and table apertures leave empty floor visible instead of cutting a body with background pixels', () => {
  const contains = (
    x: number,
    y: number,
    poly: readonly { x: number; y: number }[],
  ) => {
    let yes = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (
        a.y > y !== b.y > y &&
        x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
      )
        yes = !yes;
    }
    return yes;
  };
  for (const [key, id, x, y] of [
    ['tohsaka/study', 'reception-seating', 48, 63],
    ['matou/lounge', 'living-seating', 35, 65],
    ['einzbern/lounge', 'coffee-table', 33, 56],
    ['waver/lounge', 'tea-table', 37, 64],
    ['temple/lounge', 'low-table', 49, 60],
    ['cafe/hall', 'left-table', 20, 58],
    ['miyama-florist/annex', 'chair', 82, 70],
    ['miyama-florist/annex', 'desk', 85, 55],
  ] as const) {
    const furniture = rooms
      .find((r) => r.key === key)!
      .scene.furniture.find((f) => f.id === id)!;
    assert.ok(furniture.silhouettes && furniture.silhouettes.length > 1);
    assert.equal(
      furniture.silhouettes.some((poly) => contains(x * 16, y * 9, poly)),
      false,
      `${key}:${id}`,
    );
  }
});

void test('all 62 areas expose authored object targets and retain their approach and doorway identities', () => {
  assert.equal(rooms.length, 62);
  let objects = 0;
  for (const room of rooms) {
    const ids = new Set<string>();
    for (const spot of room.scene.spots) {
      objects++;
      assert.ok(!ids.has(spot.id), `${room.key}:${spot.id}`);
      ids.add(spot.id);
      assert.ok(spot.target, `${room.key}:${spot.id} needs a visible object`);
      assert.ok(
        Number.isFinite(spot.target.x) && Number.isFinite(spot.target.y),
      );
      assert.ok(
        spot.target.x >= 0 &&
          spot.target.x <= 1600 &&
          spot.target.y >= 0 &&
          spot.target.y <= 900,
      );
      assert.ok(
        interiorWalkable(spot.point, room.scene),
        `${room.key}:${spot.id}`,
      );
    }
  }
  assert.equal(objects, 177);
});

void test('all areas have collision-safe routes from every doorway to every object and other doorway', () => {
  for (const room of rooms)
    for (const start of room.doors)
      for (const end of [...room.doors, ...room.scene.spots]) {
        const path = interiorRoute(start.point, end.point, room.scene);
        assert.ok(path, `${room.key}:${start.id}->${end.id}`);
        let previous = start.point;
        for (const point of path) {
          assert.ok(interiorClearSegment(previous, point, room.scene));
          previous = point;
        }
        assert.deepEqual(previous, end.point);
      }
});

void test('registered polygon edges stop manual walking without adding invisible rectangular corners', () => {
  let contacts = 0;
  for (const room of rooms)
    for (const solid of room.scene.furniture)
      for (const poly of furnitureSolids(solid)) {
        const bounds = solid.footprint;
        for (const p of poly)
          assert.ok(
            p.x >= bounds.x - 1e-7 &&
              p.x <= bounds.x + bounds.width + 1e-7 &&
              p.y >= bounds.y - 1e-7 &&
              p.y <= bounds.y + bounds.height + 1e-7,
            `${room.key}:${solid.id} broad phase contains ground`,
          );
        const area = poly.reduce((a, p, i) => {
          const q = poly[(i + 1) % poly.length];
          return a + p.x * q.y - q.x * p.y;
        }, 0);
        assert.ok(
          Math.abs(area) > 1e-7,
          `${room.key}:${solid.id} nondegenerate ground`,
        );
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i],
            b = poly[(i + 1) % poly.length],
            d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 32) continue;
          const normal = {
            x: ((b.y - a.y) / d) * Math.sign(area),
            y: ((a.x - b.x) / d) * Math.sign(area),
          };
          const start = {
            x: (a.x + b.x) / 2 + normal.x * 15,
            y: (a.y + b.y) / 2 + normal.y * 15,
          };
          if (!interiorWalkable(start, room.scene)) continue;
          const moved = interiorMove(
            start,
            { x: -normal.x * 45, y: -normal.y * 45 },
            room.scene,
          );
          assert.ok(
            interiorWalkable(moved, room.scene),
            `${room.key}:${solid.id}`,
          );
          assert.ok(interiorClearSegment(start, moved, room.scene));
          assert.ok(
            Math.hypot(moved.x - start.x, moved.y - start.y) < 30,
            `${room.key}:${solid.id} blocks passage`,
          );
          contacts++;
        }
      }
  assert.ok(contacts > 200, `checked ${contacts} accessible edges`);
});

void test('Emiya visitors share actual furniture volumes rather than masks made from empty room pixels', () => {
  for (const room of rooms.filter((r) => r.site === 'emiya')) {
    const native = EMIYA_ROOMS[room.id as keyof typeof EMIYA_ROOMS];
    for (const f of room.scene.furniture) {
      const piece = native.pieces.find((p) => p.id === f.id)!;
      assert.deepEqual(f.footprint, piece.footprint);
      if (!piece.painted)
        assert.equal(f.silhouette, undefined, `${room.key}:${f.id}`);
    }
    for (const spot of room.scene.spots) assert.ok(spot.target);
  }
});

void test('Tohsaka stair volume stops walking behind its entrance and leaves that entrance accessible', () => {
  const room = rooms.find((r) => r.key === 'tohsaka/hall')!;
  const stairs = room.scene.furniture.find((f) => f.id === 'stairs')!;
  const r = stairs.footprint;
  assert.equal(
    interiorWalkable(
      { x: r.x + r.width / 2, y: r.y + r.height / 2 },
      room.scene,
    ),
    false,
  );
  assert.ok(
    interiorWalkable(
      room.doors.find((d) => d.to === 'bedroom')!.point,
      room.scene,
    ),
  );
});

void test('a nearby object behind a solid edge does not expose an interaction through the furniture', () => {
  const room = rooms.find((r) => r.key === 'einzbern/illya')!;
  const scene = {
    ...room.scene,
    furniture: [
      {
        id: 'partition',
        footprint: { x: 490, y: 250, width: 20, height: 100 },
      },
    ],
    spots: [
      {
        id: 'book',
        label: '读书',
        point: { x: 525, y: 300 },
        target: { x: 800, y: 400 },
        detail: '',
      },
    ],
  };
  assert.equal(nearestInteriorSpot({ x: 475, y: 300 }, scene), null);
  assert.equal(nearestInteriorSpot({ x: 530, y: 300 }, scene)?.id, 'book');
  const spot = room.scene.spots[0];
  assert.ok(interiorProject(spot.point, room.scene.floor).y > spot.target!.y);
});
