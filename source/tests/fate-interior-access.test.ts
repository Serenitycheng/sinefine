import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
  interiorProject,
  interiorUnproject,
} from '../lib/fate-city-interior-scenes';
import { cityPreviewVisit } from '../lib/fate-city-preview-visit';
import {
  interiorSpotRoute,
  interiorSpotDistance,
  interiorHitSpot,
  furnitureSolids,
} from '../lib/fate-interior-access';
import {
  nearestInteriorSpot,
  nearbyInteriorSpots,
} from '../lib/fate-interior-interaction';
import {
  interiorMove,
  interiorWalkable,
  interiorClearSegment,
} from '../lib/fate-city-interior-navigation';
import { CITY_ART_SCENE_IDS } from '../lib/fate-city-art-scenes';
import { cityArtScenePlaces } from '../lib/fate-city-art-map';
import { cityArtNearbyPlace } from '../lib/fate-city-art-interaction';
import {
  cityPilotWalkable,
  cityPilotLine,
  cityPilotRoute,
} from '../lib/fate-city-art-navigation';
import { cityArtExits } from '../lib/fate-city-art-portals';
import { EMIYA_ROOMS, EMIYA_ACTIVITIES } from '../lib/fate-emiya-house';
import {
  emiyaPieceSpot,
  emiyaNearestInspection,
  emiyaActivitySpot,
  emiyaActivityDistance,
} from '../lib/fate-emiya-access';

const rooms = CITY_INTERIOR_IDS.flatMap((site) =>
  Object.entries(
    cityPreviewVisit(CITY_INTERIOR_SCENES[site], 'illya').plan.rooms,
  ).map(([id, room]) => ({ site, id, ...room })),
);

void test('all reachable object actions remain in the nearby choices even when several share a counter', () => {
  for (const room of rooms)
    for (const spot of room.scene.spots)
      for (const point of spot.approaches ?? [spot.point]) {
        const options = nearbyInteriorSpots(point, room.scene);
        assert.ok(
          options.some((s) => s.id === spot.id),
          `${room.site}/${room.id}:${spot.id} is not hidden by another action`,
        );
        assert.equal(
          nearbyInteriorSpots(point, room.scene, spot.id)[0]?.id,
          spot.id,
        );
      }
  const study = rooms.find((r) => r.site === 'emiya' && r.id === 'study')!;
  const point = study.scene.spots.find((s) => s.id === 'read')!.approaches![0];
  assert.deepEqual(
    new Set(nearbyInteriorSpots(point, study.scene).map((s) => s.id)),
    new Set(['read', 'study']),
  );
});

void test('sloping side cabinets leave visible aisles open and retain their actual solid bodies', () => {
  const cases: readonly [string, number, number, number, number][] = [
    ['einzbern/kitchen', 60, 63, 50, 51],
    ['waver/kitchen', 26, 86, 12, 75],
    ['cafe/prep', 23, 86, 12, 75],
    ['cafe/prep', 72, 82, 78, 78],
    ['shops/hall', 75, 77, 92, 74],
    ['shops/annex', 22, 85, 15, 75],
    ['old-repair/annex', 22, 81, 12, 70],
    ['miyama-bakery/annex', 28, 80, 20, 70],
    ['shinto-convenience/annex', 19, 79, 10, 70],
    ['old-bookshop/hall', 15, 87, 8, 70],
    ['old-bookshop/annex', 11, 83, 7, 65],
    ['old-bookshop/annex', 88, 88, 95, 80],
    ['temple/kitchen', 27, 67, 12, 55],
  ];
  for (const [key, x, y, solidX, solidY] of cases) {
    const room = rooms.find((r) => r.site + '/' + r.id === key)!;
    const point = (px: number, py: number) =>
      interiorUnproject({ x: px * 16, y: py * 9 }, room.scene.floor)!;
    assert.ok(
      interiorWalkable(point(x, y), room.scene),
      `${key} visible empty aisle`,
    );
    assert.equal(
      interiorWalkable(point(solidX, solidY), room.scene),
      false,
      `${key} real cabinet remains solid`,
    );
    assert.ok(
      interiorSpotRoute(point(x, y), room.scene.spots[0], room.scene),
      `${key} can leave the aisle`,
    );
  }
});

void test('remaining stair flights block their drawn steps while keeping the approach and real door accessible', () => {
  for (const [key, x, y, frontY] of [
    ['matou/hall', 69, 48.5, 54],
    ['tohsaka/workshop', 12, 43.5, 50],
  ] as const) {
    const room = rooms.find((r) => r.site + '/' + r.id === key)!;
    const point = (py: number) =>
      interiorUnproject({ x: x * 16, y: py * 9 }, room.scene.floor)!;
    assert.equal(interiorWalkable(point(y), room.scene), false, key);
    assert.ok(interiorWalkable(point(frontY), room.scene), key);
    assert.equal(
      interiorClearSegment(point(frontY), point(y), room.scene),
      false,
    );
    if (key === 'matou/hall')
      assert.ok(
        interiorWalkable(
          room.doors.find((d) => d.id === 'bedroom')!.point,
          room.scene,
        ),
      );
  }
});

void test('native Emiya furniture and activities expose the same physical interaction as visitor rooms', () => {
  let inspected = 0;
  for (const room of Object.values(EMIYA_ROOMS))
    for (const piece of room.pieces.filter(
      (p) =>
        p.solid !== false &&
        !EMIYA_ACTIVITIES.some((a) => a.room === room.id && a.piece === p.id),
    )) {
      const spot = emiyaPieceSpot(room.id, piece.id);
      assert.ok(
        spot.approaches?.some(
          (point) =>
            emiyaNearestInspection({ room: room.id, point }, EMIYA_ACTIVITIES)
              ?.piece === piece.id,
        ),
        `${room.id}:${piece.id}`,
      );
      inspected++;
    }
  assert.equal(inspected, 9);
  for (const a of EMIYA_ACTIVITIES)
    for (const point of emiyaActivitySpot(a).approaches ?? [])
      assert.ok(
        Number.isFinite(emiyaActivityDistance(a, { room: a.room, point })),
      );
});

void test('standing beside the visible Tohsaka chair exposes its action and the window is approached on the right', () => {
  const room = rooms.find((r) => r.site === 'tohsaka' && r.id === 'study')!;
  const point = interiorUnproject(
    { x: 61.2 * 16, y: 70 * 9 },
    room.scene.floor,
  )!;
  assert.ok(interiorWalkable(point, room.scene));
  assert.equal(nearestInteriorSpot(point, room.scene)?.id, 'tea');
  const window = room.scene.spots.find((s) => s.id === 'window')!;
  assert.equal(interiorHitSpot(window.target!, room.scene)?.id, 'window');
  const path = interiorSpotRoute(point, window, room.scene)!;
  assert.ok(path?.length);
  assert.ok(
    path.every((p) => p.x >= point.x - 25),
    'the right aisle stays open with a small standing clearance, without a detour to the left of the room',
  );
  let from = point;
  for (const p of path) {
    assert.ok(interiorClearSegment(from, p, room.scene));
    from = p;
  }
  assert.ok(Number.isFinite(interiorSpotDistance(from, window, room.scene)));
});

void test('all 177 objects can be reached by actual movement and expose E from their physical approach', () => {
  let count = 0;
  for (const room of rooms)
    for (const spot of room.scene.spots) {
      const key = `${room.site}/${room.id}:${spot.id}`;
      assert.ok(spot.approaches?.length, `${key} has physical access`);
      for (const p of spot.approaches)
        assert.ok(interiorWalkable(p, room.scene), key);
      let point = { ...room.doors[0].point };
      const path = interiorSpotRoute(point, spot, room.scene);
      assert.ok(path, `${key} can approach the visible object`);
      for (const target of path) {
        let steps = 0;
        while (Math.hypot(target.x - point.x, target.y - point.y) > 0.01) {
          const gap = Math.hypot(target.x - point.x, target.y - point.y),
            fraction = Math.min(1, 4 / gap);
          const next = interiorMove(
            point,
            {
              x: (target.x - point.x) * fraction,
              y: (target.y - point.y) * fraction,
            },
            room.scene,
          );
          assert.ok(
            Math.hypot(next.x - point.x, next.y - point.y) > 0.001,
            `${key} route and movement agree`,
          );
          point = next;
          assert.ok(++steps < 1000, key);
        }
      }
      assert.ok(
        Number.isFinite(interiorSpotDistance(point, spot, room.scene)),
        `${key} E is enabled at arrival`,
      );
      assert.equal(
        nearestInteriorSpot(point, room.scene, spot.id)?.id,
        spot.id,
        `${key} E matches the selected visible object`,
      );
      count++;
    }
  assert.equal(count, 177);
});

void test('florist workbench follows its sloping cabinet edge and is approached from the visible aisle', () => {
  const room = rooms.find(
    (r) => r.site === 'miyama-florist' && r.id === 'annex',
  )!;
  const floorPoint = (x: number, y: number) =>
    interiorUnproject({ x: x * 16, y: y * 9 }, room.scene.floor)!;
  const standing = floorPoint(37, 75);
  const besidePots = floorPoint(26, 75);
  assert.ok(
    interiorWalkable(besidePots, room.scene),
    'open floor beside the diagonal cabinet is not solid',
  );
  assert.ok(interiorClearSegment(standing, besidePots, room.scene));
  const moved = interiorMove(
    standing,
    { x: besidePots.x - standing.x, y: besidePots.y - standing.y },
    room.scene,
  );
  assert.ok(Math.hypot(moved.x - besidePots.x, moved.y - besidePots.y) < 0.01);
  assert.equal(
    interiorHitSpot({ x: 28 * 16, y: 74 * 9 }, room.scene),
    null,
    'empty floor is not part of the cabinet hit mask',
  );
  for (const [x, y] of [
    [14, 80],
    [23, 65],
    [29.5, 57],
    [37.5, 45],
  ])
    assert.equal(
      interiorWalkable(floorPoint(x, y), room.scene),
      false,
      'cabinet and actual flower buckets remain solid',
    );
  const pots = room.scene.spots.find((s) => s.id === 'pots')!;
  assert.equal(nearestInteriorSpot(besidePots, room.scene)?.id, pots.id);
  for (const start of [standing, besidePots, room.doors[0].point])
    for (const id of ['pots', 'sink']) {
      const spot = room.scene.spots.find((s) => s.id === id)!;
      const path = interiorSpotRoute(start, spot, room.scene);
      assert.ok(path?.length, id);
      let point = start;
      for (const next of path) {
        assert.ok(interiorClearSegment(point, next, room.scene), id);
        point = next;
      }
      assert.ok(
        Number.isFinite(interiorSpotDistance(point, spot, room.scene)),
        id,
      );
      assert.equal(nearestInteriorSpot(point, room.scene, id)?.id, id);
      const paint = interiorProject(point, room.scene.floor);
      assert.ok(
        paint.x >= (id === 'sink' ? 33 : 21) * 16 && paint.y < 80 * 9,
        'approach stays in the aisle, not behind or below the cabinet',
      );
    }
});

void test('compound chair groups block their own solids while leaving the real gaps walkable', () => {
  for (const key of ['tohsaka/study', 'matou/lounge']) {
    const room = rooms.find((r) => r.site + '/' + r.id === key)!;
    const group = room.scene.furniture.find(
      (f) => f.collisions && f.collisions.length > 1,
    )!;
    assert.ok(group);
    for (const poly of furnitureSolids(group)) {
      const center = {
        x: poly.reduce((n, p) => n + p.x, 0) / poly.length,
        y: poly.reduce((n, p) => n + p.y, 0) / poly.length,
      };
      assert.equal(interiorWalkable(center, room.scene), false);
    }
  }
});

void test('all street entrances use the same reachable proximity for the prompt and E, and shared exits stay bidirectional', () => {
  let entrances = 0,
    approaches = 0,
    exits = 0;
  for (const scene of CITY_ART_SCENE_IDS) {
    const places = cityArtScenePlaces(scene);
    for (const place of places) {
      assert.ok(
        cityPilotWalkable(place.point, 1, scene),
        `${scene}:${place.id}`,
      );
      assert.equal(
        cityArtNearbyPlace(place.point, scene, places)?.id,
        place.id,
      );
      entrances++;
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6,
          p = {
            x: place.point.x + 18 * Math.cos(angle),
            y: place.point.y + 18 * Math.sin(angle),
          };
        if (
          !cityPilotWalkable(p, 1, scene) ||
          !cityPilotLine(p, place.point, scene)
        )
          continue;
        assert.ok(cityArtNearbyPlace(p, scene, places));
        assert.ok(cityPilotRoute(p, place.point, scene));
        approaches++;
      }
    }
    for (const exit of cityArtExits(scene)) {
      assert.ok(cityPilotWalkable(exit.point, 1, scene));
      assert.ok(cityPilotWalkable(exit.point, 1, exit.scene));
      assert.ok(cityArtExits(exit.scene).some((back) => back.scene === scene));
      exits++;
    }
  }
  assert.ok(entrances >= 18 && approaches >= 100 && exits >= 36);
});
