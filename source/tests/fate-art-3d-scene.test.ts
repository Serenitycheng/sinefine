import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { createStreetStudy } from '../lib/fate-art-3d-scene';
import {
  STREET_STUDY,
  STUDY_CAMERA_SOLIDS,
  studyCamera,
  studySafeCamera,
} from '../lib/fate-art-3d-layout';

void test('3D camera compositions show facades and stay above ground on narrow and wide screens', () => {
  for (const aspect of [390 / 630, 1280 / 570]) {
    for (const view of ['street', 'house', 'cafe'] as const) {
      const preset = studyCamera(view, aspect);
      const offset = new T.Vector3()
        .fromArray(preset.position)
        .sub(new T.Vector3().fromArray(preset.target));
      const polar = Math.acos(offset.y / offset.length());
      assert.ok(
        polar >= STREET_STUDY.minPolar && polar <= STREET_STUDY.maxPolar,
      );
      assert.ok(
        offset.length() >= STREET_STUDY.minDistance &&
          offset.length() <= STREET_STUDY.maxDistance,
      );
      assert.ok(preset.position.every(Number.isFinite));
      assert.ok(preset.target.every(Number.isFinite));
    }
  }
});

void test('street study uses real, closed three-dimensional buildings and finite geometry', () => {
  const world = createStreetStudy();
  try {
    for (const name of ['residential-house', 'corner-cafe']) {
      const building = world.scene.getObjectByName(name);
      assert.ok(building);
      const size = new T.Box3()
        .setFromObject(building)
        .getSize(new T.Vector3());
      assert.ok(
        size.x > 6 && size.y > 5 && size.z > 6,
        `${name}: ${size.toArray().join(',')}`,
      );
    }
    for (const geo of world.resources.geometries) {
      assert.ok([...geo.getAttribute('position').array].every(Number.isFinite));
      assert.ok([...geo.getAttribute('normal').array].every(Number.isFinite));
    }
    world.scene.traverse((object) => {
      assert.ok(object.matrixWorld.elements.every(Number.isFinite));
      if (object instanceof T.InstancedMesh)
        assert.ok([...object.instanceMatrix.array].every(Number.isFinite));
    });
  } finally {
    world.dispose();
  }
});

void test('panning and close orbit cannot leave the camera inside a building or roof', () => {
  for (const building of STUDY_CAMERA_SOLIDS) {
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const target = [
        building.x - Math.cos(angle) * 6,
        1.8,
        building.z - Math.sin(angle) * 6,
      ];
      const safe = studySafeCamera([building.x, 5, building.z], target);
      assert.ok(safe.every(Number.isFinite));
      assert.ok(
        STUDY_CAMERA_SOLIDS.every(
          (box) =>
            Math.abs(safe[0] - box.x) >= box.width / 2 + 0.25 ||
            Math.abs(safe[2] - box.z) >= box.depth / 2 + 0.25 ||
            safe[1] >= box.top,
        ),
      );
      assert.deepEqual(studySafeCamera(safe, target), safe);
    }
  }
});

void test('detailed foliage and roof tiles remain batched for the small sample', () => {
  const world = createStreetStudy();
  try {
    let draws = 0;
    let triangles = 0;
    world.scene.traverse((object) => {
      if (object instanceof T.Mesh) {
        draws++;
        const count =
          object.geometry.index?.count ??
          object.geometry.getAttribute('position').count;
        triangles +=
          (count / 3) * (object instanceof T.InstancedMesh ? object.count : 1);
      }
    });
    assert.ok(draws < 200, `${draws} unbatched draws`);
    assert.ok(triangles < 600000, `${triangles} triangles`);
    const leaves = world.scene.getObjectByName('hand-shaped-leaves');
    assert.ok(leaves instanceof T.InstancedMesh && leaves.count > 10000);
    const roofs: T.Object3D[] = [];
    world.scene.traverse((object) => {
      if (object.name === 'curved-ceramic-roof') roofs.push(object);
    });
    assert.equal(roofs.length, 3);
  } finally {
    world.dispose();
  }
});

void test('leaving the sample disposes owned materials, textures and geometry once', () => {
  const world = createStreetStudy({ asphalt: new T.Texture() });
  const resources = [
    ...world.resources.geometries,
    ...world.resources.materials,
    ...world.resources.textures,
  ];
  const calls = new Map(resources.map((resource) => [resource, 0]));
  for (const resource of resources)
    resource.addEventListener('dispose', () =>
      calls.set(resource, (calls.get(resource) ?? 0) + 1),
    );
  world.dispose();
  world.dispose();
  assert.equal(world.scene.children.length, 0);
  assert.ok([...calls.values()].every((value) => value === 1));
});
