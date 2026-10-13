import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SCHOOL_ROOMS, SCHOOL_ROOM_IDS, SCHOOL_CAST } from '../lib/fate-school-house';
import { schoolSprite } from '../lib/fate-school-sprites';
import { matouSprite } from '../lib/fate-matou-sprites';
import { HOUSE_PREVIEWS } from '../lib/fate-preview-houses';
import { mirrorPreviewSprite, nearestPreviewDoor, type PreviewSprite } from '../lib/fate-preview-house';
import { CITY_INTERIOR_SCENES } from '../lib/fate-city-interior-scenes';
import { interiorWalkable, interiorRoute, interiorClearSegment, interiorMove } from '../lib/fate-city-interior-navigation';
import { houseCamera, houseZoom } from '../lib/fate-tohsaka-house';
import { previewPresentation } from '../lib/fate-preview-presentation';
import { defaultHousing, homeOf } from '../lib/fate-housing';
import frames from '../lib/fate-school-sprite-data.json';

void test('School adds five linked areas while reusing the approved classroom without altering its old floor', () => {
  assert.equal(HOUSE_PREVIEWS.school.rooms, SCHOOL_ROOMS);
  assert.equal(SCHOOL_ROOM_IDS.length, 5);
  assert.equal(new Set(SCHOOL_ROOM_IDS.map((id) => SCHOOL_ROOMS[id].scene.painting)).size, 5);
  assert.equal(SCHOOL_ROOMS.classroom.scene.painting, CITY_INTERIOR_SCENES.school.painting);
  assert.notDeepEqual(SCHOOL_ROOMS.classroom.scene.floor, CITY_INTERIOR_SCENES.school.floor);
  assert.equal(createHash('sha256').update(readFileSync('public' + SCHOOL_ROOMS.classroom.scene.painting)).digest('hex'),
    '841fad8896d3b3736c1804ba36cf9c632fb75d2b7c2c64fcb4b8856c54614e15');
  for (const id of SCHOOL_ROOM_IDS) {
    assert.equal(SCHOOL_ROOMS[id].scene.id, 'school');
    assert.ok(existsSync('public' + SCHOOL_ROOMS[id].scene.painting));
  }
});

void test('Eight school door directions preserve safe arrivals, return routes and one outdoor exit', () => {
  let links = 0, exits = 0;
  for (const id of SCHOOL_ROOM_IDS) for (const door of SCHOOL_ROOMS[id].doors) {
    const room = SCHOOL_ROOMS[id];
    assert.ok(interiorWalkable(door.point, room.scene), `${id}:${door.id}:threshold`);
    assert.equal(nearestPreviewDoor(door.point, room)?.id, door.id);
    if (!door.to) { assert.equal(id, 'hall'); exits++; continue; }
    links++;
    const other = SCHOOL_ROOMS[door.to as keyof typeof SCHOOL_ROOMS];
    const back = other.doors.find((d) => d.to === id)!;
    assert.ok(back, `${id}:return`);
    assert.ok(interiorWalkable(door.arrival, other.scene), `${id}:${door.id}:arrival`);
    assert.ok(interiorRoute(door.arrival, back.point, other.scene), `${id}:${door.id}:walk-back`);
  }
  assert.equal(links, 8); assert.equal(exits, 1);
  assert.ok(interiorWalkable({ x: 500, y: 560 }, SCHOOL_ROOMS.hall.scene));
});

void test('All fourteen school interactions are reachable by routes that never cross furniture', () => {
  let count = 0;
  for (const id of SCHOOL_ROOM_IDS) {
    const room = SCHOOL_ROOMS[id];
    const checks = [...room.doors.map((d) => d.point), ...room.scene.spots.map((s) => s.point)];
    count += room.scene.spots.length;
    for (const from of checks) for (const to of checks) {
      const route = interiorRoute(from, to, room.scene);
      assert.ok(route, `${id}:route:${JSON.stringify({from,to})}`);
      let previous = from;
      for (const next of route) {
        assert.ok(interiorClearSegment(previous, next, room.scene), `${id}:segment`);
        previous = next;
      }
      assert.ok(Math.hypot(previous.x-to.x, previous.y-to.y) < 0.01);
    }
  }
  assert.equal(count, 14);
});

void test('School furniture blocks manual movement and hall thresholds cannot be crossed without changing rooms', () => {
  for (const id of SCHOOL_ROOM_IDS) for (const item of SCHOOL_ROOMS[id].scene.furniture) {
    const point = {x:item.footprint.x+item.footprint.width/2,y:item.footprint.y+item.footprint.height/2};
    assert.equal(interiorWalkable(point, SCHOOL_ROOMS[id].scene), false, `${id}:${item.id}`);
    if (item.id.endsWith('-boundary')) assert.equal(item.silhouette, undefined);
  }
  const hall = SCHOOL_ROOMS.hall;
  for (const door of hall.doors.filter((d) => d.to)) {
    let point = { ...door.point, y:door.point.y+65 };
    for (let i=0; i<90; i++) point = interiorMove(point, {x:0,y:-8}, hall.scene);
    assert.ok(point.y > 0, door.id);
    assert.ok(interiorWalkable(point, hall.scene));
  }
});

function nativeCrop(sprite: PreviewSprite) {
  const bytes = readFileSync('public' + sprite.file);
  assert.equal(bytes.readUInt32BE(16), sprite.imageWidth);
  assert.equal(bytes.readUInt32BE(20), sprite.imageHeight);
  assert.ok(sprite.cropX >= 0 && sprite.cropY >= 0);
  assert.ok(sprite.cropX+sprite.cellWidth <= sprite.imageWidth && sprite.cropY+sprite.cellHeight <= sprite.imageHeight);
  assert.ok(sprite.bounds.width > 0 && sprite.bounds.height > 0);
  assert.ok(sprite.bounds.x >= 0 && sprite.bounds.y >= 0);
  assert.ok(sprite.bounds.x+sprite.bounds.width <= sprite.cellWidth && sprite.bounds.y+sprite.bounds.height <= sprite.cellHeight);
  assert.ok(sprite.anchorX >= 0 && sprite.anchorX <= sprite.cellWidth);
  assert.ok(sprite.anchorY >= 0 && sprite.anchorY <= sprite.cellHeight);
}

void test('Uniform models keep real crops, fixed direction scales, six native phases and mirrored foot anchors', () => {
  for (const actor of ['shirou','rin'] as const) {
    assert.equal(frames[actor].frames.length, 24);
    for (const direction of ['down','up','left','right'] as const) {
      nativeCrop(schoolSprite(actor,direction,0));
      const moving = Array.from({length:6},(_,i)=>schoolSprite(actor,direction,i+1));
      for (const sprite of moving) nativeCrop(sprite);
      assert.equal(new Set(moving.map((s)=>s.index)).size,6);
      assert.equal(new Set(moving.map((s)=>s.scale)).size,1);
    }
    for (let i=1; i<=6; i++) {
      const left = schoolSprite(actor,'left',i), right = schoolSprite(actor,'right',i);
      assert.equal(right.cropX,left.cropX);
      assert.equal(right.anchorX,left.cellWidth-left.anchorX);
      assert.ok(right.mirror);
    }
  }
});

void test('School reuses Sakura uniform and preserves all original household identities', () => {
  const housing = defaultHousing();
  assert.deepEqual(SCHOOL_CAST.map((a)=>a.id),['shirou','rin','sakura']);
  assert.equal(homeOf('shirou',housing),'emiya');
  assert.equal(homeOf('rin',housing),'tohsaka');
  assert.equal(homeOf('sakura',housing),'matou');
  for (const direction of ['down','up','left','right'] as const) for (let phase=0;phase<=6;phase++)
    assert.deepEqual(schoolSprite('sakura',direction,phase),matouSprite('sakura',direction,phase));
  for (const pose of ['sit','read'] as const) {
    const reused = matouSprite('sakura','down',0,pose), sample = schoolSprite('sakura','down',0,pose);
    assert.equal(sample.file,reused.file);
    assert.equal(sample.cropX,reused.cropX);
    assert.equal(sample.cropY,reused.cropY);
    assert.deepEqual(sample.bounds,reused.bounds);
    assert.ok(sample.seat);
  }
});

void test('Seven furniture poses have safe approaches and keep complete bodies at narrow and large zoom views', () => {
  let count = 0;
  for (const id of SCHOOL_ROOM_IDS) {
    const room = SCHOOL_ROOMS[id];
    const checks = room.doors.map((d)=>({point:d.point,action:undefined as (typeof room.actions)[number]|undefined}));
    for (const action of room.actions) {
      count++;
      const approach = room.scene.spots.find((s)=>s.id===action.id)!.point;
      assert.ok(interiorWalkable(approach,room.scene),`${id}:${action.id}`);
      assert.notDeepEqual(approach,action.contact);
      checks.push({point:action.contact,action});
    }
    for (const actor of SCHOOL_CAST) for (const {point,action} of checks)
      for (const size of [{width:1100,height:560},{width:390,height:430},{width:320,height:180}]) {
        let sprite = schoolSprite(actor.id,'down',0,action?.pose);
        if (action?.mirror) sprite = mirrorPreviewSprite(sprite);
        nativeCrop(sprite);
        const {foot,body} = previewPresentation(room.scene,point,sprite,action);
        const scale = Math.min(size.width/1600,size.height/900)*houseZoom(2.5,size,action?.seat?body.height:330);
        const origin = houseCamera({x:size.width/2-foot.x*scale,y:size.height*.7-foot.y*scale},scale,size,body);
        assert.ok(origin.x+body.x*scale >= -.1 && origin.y+body.y*scale >= -.1,`${id}:${actor.id}:top`);
        assert.ok(origin.x+(body.x+body.width)*scale <= size.width+.1,`${id}:${actor.id}:right`);
        assert.ok(origin.y+(body.y+body.height)*scale <= size.height+.1,`${id}:${actor.id}:bottom`);
      }
  }
  assert.equal(count,7);
});

void test('School hip contacts stay on seven painted seats for every character and both mirror directions', () => {
  let count = 0;
  for (const id of SCHOOL_ROOM_IDS) for (const action of SCHOOL_ROOMS[id].actions) {
    if (!action.seat) continue;
    count++;
    for (const actor of SCHOOL_CAST) {
      let sprite = schoolSprite(actor.id,'down',0,action.pose);
      if (action.mirror) sprite = mirrorPreviewSprite(sprite);
      const {foot,spriteScale,body} = previewPresentation(SCHOOL_ROOMS[id].scene,{x:500,y:560},sprite,action);
      assert.ok(sprite.seat);
      assert.ok(Math.abs(foot.x+(sprite.seat.x-sprite.anchorX)*spriteScale-action.seat.x)<.001);
      assert.ok(Math.abs(foot.y+(sprite.seat.y-sprite.anchorY)*spriteScale-action.seat.y)<.001);
      assert.ok(body.height>170&&body.height<510, `${id}:${actor.id}:local-perspective`);
      assert.ok(foot.y>action.seat.y,`${id}:feet-below-seat`);
      const twice = mirrorPreviewSprite(mirrorPreviewSprite(sprite));
      assert.deepEqual(twice.seat,sprite.seat);
      assert.equal(houseZoom(1,{width:390,height:430},body.height),1);
    }
  }
  assert.equal(count,7);
});
