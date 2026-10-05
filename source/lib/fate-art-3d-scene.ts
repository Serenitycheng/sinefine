import * as T from 'three';
import { STREET_STUDY, studyRandom } from './fate-art-3d-layout';

type Materials = Record<string, T.MeshStandardMaterial>;
type Leaf = { p: T.Vector3; size: number; rotation: T.Euler; shade: number };
type SceneTextures = { asphalt?: T.Texture };

/** Fully volumetric scenery, built anew for this study, not legacy game models. */
export function createStreetStudy(textures: SceneTextures = {}) {
  const scene = new T.Scene();
  scene.background = new T.Color('#c3dce7');
  scene.fog = new T.Fog('#c3dce7', 58, 125);
  const random = studyRandom(1025);
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const ownedTextures = new Set<T.Texture>();
  if (textures.asphalt) ownedTextures.add(textures.asphalt);
  const geometry = <G extends T.BufferGeometry>(value: G) => {
    geometries.add(value);
    return value;
  };
  const material = (
    color: string,
    extra: T.MeshStandardMaterialParameters = {},
  ) => {
    const value = new T.MeshStandardMaterial({
      color,
      roughness: 0.88,
      ...extra,
    });
    materials.add(value);
    return value;
  };
  const m: Materials = {
    plaster: material('#e6ddc5'),
    cafeWall: material('#e4d0ab'),
    stone: material('#c6c4b4'),
    curb: material('#ddd6bd'),
    pavement: material('#c8c1aa'),
    road: material('#e7e5dc', {
      ...(textures.asphalt ? { map: textures.asphalt } : {}),
      roughness: 1,
    }),
    earth: material('#8e9870'),
    lawn: material('#909761'),
    wood: material('#706049'),
    woodLight: material('#9d8565'),
    woodDark: material('#4d5148'),
    blue: material('#687f95', { roughness: 0.74 }),
    roof: material('#72879d', { roughness: 0.82, side: T.DoubleSide }),
    roofEdge: material('#4a6278'),
    metal: material('#697a72', { roughness: 0.64, metalness: 0.25 }),
    darkMetal: material('#46564f', { roughness: 0.68, metalness: 0.3 }),
    glass: material('#819da0', { roughness: 0.27, metalness: 0.06 }),
    windowGlow: material('#dfd6a7', {
      emissive: '#b6a15c',
      emissiveIntensity: 0.18,
    }),
    transparentGlass: material('#bfd8db', {
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      roughness: 0.16,
    }),
    terracotta: material('#b18d6c'),
    soil: material('#4b5641'),
    paper: material('#e3d9bf'),
    line: material('#e6e2d1'),
    leaves: material('#ffffff', { side: T.DoubleSide, roughness: 1 }),
    flowers: material('#e3dcae'),
  };

  // Subtle plaster irregularity is a procedural material, not painted lighting.
  const pixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      const variation =
        Math.sin(x * 0.17) * Math.cos(y * 0.13) * 3 + random() * 5;
      pixels[i] = 250 - variation;
      pixels[i + 1] = 247 - variation;
      pixels[i + 2] = 236 - variation;
      pixels[i + 3] = 255;
    }
  }
  const plaster = new T.DataTexture(pixels, 128, 128);
  plaster.colorSpace = T.SRGBColorSpace;
  plaster.wrapS = plaster.wrapT = T.RepeatWrapping;
  plaster.repeat.set(3, 3);
  plaster.magFilter = T.LinearFilter;
  plaster.minFilter = T.LinearMipmapLinearFilter;
  plaster.generateMipmaps = true;
  plaster.needsUpdate = true;
  ownedTextures.add(plaster);
  m.plaster.map = m.cafeWall.map = m.stone.map = plaster;

  const woodPixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      const grain =
        Math.sin(x * 0.9 + Math.sin(y * 0.06) * 1.3) * 13 + random() * 8;
      woodPixels[i] = 230 + grain;
      woodPixels[i + 1] = 217 + grain;
      woodPixels[i + 2] = 189 + grain;
      woodPixels[i + 3] = 255;
    }
  }
  const woodGrain = new T.DataTexture(woodPixels, 128, 128);
  woodGrain.colorSpace = T.SRGBColorSpace;
  woodGrain.wrapS = woodGrain.wrapT = T.RepeatWrapping;
  woodGrain.magFilter = T.LinearFilter;
  woodGrain.minFilter = T.LinearMipmapLinearFilter;
  woodGrain.generateMipmaps = true;
  woodGrain.needsUpdate = true;
  m.wood.map = m.woodLight.map = woodGrain;
  ownedTextures.add(woodGrain);

  const boxGeometry = geometry(new T.BoxGeometry(1, 1, 1));
  const cylinderGeometry = geometry(new T.CylinderGeometry(1, 1, 1, 12));
  const leafRecords: Leaf[] = [];
  const canopyRecords: {
    point: T.Vector3;
    scale: T.Vector3;
    rotation: number;
  }[] = [];
  const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
  function mesh(
    parent: T.Object3D,
    geo: T.BufferGeometry,
    mat: T.Material,
    p: T.Vector3,
    s = v(1, 1, 1),
  ) {
    const value = new T.Mesh(geo, mat);
    value.position.copy(p);
    value.scale.copy(s);
    value.castShadow = true;
    value.receiveShadow = true;
    parent.add(value);
    return value;
  }
  function box(
    parent: T.Object3D,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    return mesh(parent, boxGeometry, mat, v(x, y, z), v(w, h, d));
  }
  function cylinder(
    parent: T.Object3D,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    r: number,
    height: number,
  ) {
    return mesh(parent, cylinderGeometry, mat, v(x, y, z), v(r, height, r));
  }
  function rod(
    parent: T.Object3D,
    mat: T.Material,
    from: T.Vector3,
    to: T.Vector3,
    radius: number,
  ) {
    const direction = to.clone().sub(from);
    const value = mesh(
      parent,
      cylinderGeometry,
      mat,
      from.clone().add(to).multiplyScalar(0.5),
      v(radius, direction.length(), radius),
    );
    value.quaternion.setFromUnitVectors(v(0, 1, 0), direction.normalize());
    return value;
  }
  function group(name: string, x = 0, z = 0, parent: T.Object3D = scene) {
    const value = new T.Group();
    value.name = name;
    value.position.set(x, 0, z);
    parent.add(value);
    return value;
  }

  const ground = group('continuous-ground');
  box(ground, m.earth, 0, -0.3, -1, 300, 0.5, 300).castShadow = false;
  box(ground, m.road, 0, 0, 0, 268, 0.09, STREET_STUDY.roadWidth).castShadow =
    false;
  for (const side of [-1, 1]) {
    const z = side * (STREET_STUDY.roadWidth / 2 + 0.65);
    box(ground, m.pavement, 0, 0.085, z, 268, 0.16, 1.16).castShadow = false;
    box(ground, m.line, 0, 0.055, side * 2.65, 268, 0.016, 0.07).castShadow =
      false;
    for (let x = -31; x < 32; x += 0.85) {
      box(ground, m.curb, x, 0.115, side * 2.97, 0.834, 0.16, 0.2);
      box(ground, m.stone, x, 0.171, z, 0.016, 0.012, 1.0).castShadow = false;
    }
  }
  // A genuine connected side lane between the two lots.
  box(ground, m.pavement, 1.5, 0.11, -8.3, 2.2, 0.16, 10.5).castShadow = false;
  for (let z = -3.8; z > -13; z -= 0.65) {
    box(ground, m.curb, 1.5, 0.2, z, 2.13, 0.045, 0.6).castShadow = false;
  }
  for (const x of [-12, -1, 4, 12]) {
    box(ground, m.darkMetal, x, 0.176, -3.35, 0.8, 0.025, 0.37);
    for (let i = 0; i < 9; i++)
      box(
        ground,
        m.stone,
        x - 0.34 + i * 0.083,
        0.194,
        -3.35,
        0.025,
        0.017,
        0.3,
      );
  }
  const manhole = cylinder(ground, m.metal, -1.8, 0.057, 0.4, 0.42, 0.022);
  manhole.name = 'street-manhole';
  const ring = mesh(
    ground,
    geometry(new T.TorusGeometry(0.38, 0.011, 5, 32)),
    m.darkMetal,
    v(-1.8, 0.073, 0.4),
  );
  ring.rotation.x = Math.PI / 2;
  for (let i = -3; i <= 3; i++)
    box(
      ground,
      m.darkMetal,
      -1.8,
      0.074,
      0.4 + i * 0.084,
      0.62 - Math.abs(i) * 0.04,
      0.012,
      0.011,
    );

  // Curved kawara profiles: individual real roof tiles, instanced per roof.
  const tilePositions: number[] = [];
  const tileUV: number[] = [];
  const tileIndices: number[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col <= 10; col++) {
      const x = col / 10;
      tilePositions.push(x, 0.03 + Math.cos(x * Math.PI * 2) * 0.042, row);
      tileUV.push(x, row);
      if (row === 0 && col < 10) {
        tileIndices.push(col, col + 11, col + 1, col + 1, col + 11, col + 12);
      }
    }
  }
  const tileGeometry = geometry(new T.BufferGeometry());
  tileGeometry.setAttribute(
    'position',
    new T.Float32BufferAttribute(tilePositions, 3),
  );
  tileGeometry.setAttribute('uv', new T.Float32BufferAttribute(tileUV, 2));
  tileGeometry.setIndex(tileIndices);
  tileGeometry.computeVertexNormals();
  function roof(
    parent: T.Object3D,
    width: number,
    depth: number,
    base: number,
    rise: number,
  ) {
    const span = depth / 2;
    const slope = Math.atan2(rise, span);
    const slopeLength = Math.hypot(span, rise);
    const columns = Math.ceil(width / 0.31);
    const rows = Math.ceil(slopeLength / 0.34);
    const tiles = new T.InstancedMesh(tileGeometry, m.roof, columns * rows * 2);
    tiles.castShadow = tiles.receiveShadow = true;
    tiles.name = 'curved-ceramic-roof';
    const dummy = new T.Object3D();
    let index = 0;
    const roofShade = new T.Color();
    for (const sign of [-1, 1]) {
      const surface = box(
        parent,
        m.roofEdge,
        0,
        base + rise / 2 - 0.07,
        (sign * span) / 2,
        width,
        0.12,
        slopeLength,
      );
      surface.rotation.x = sign * slope;
      for (let row = 0; row < rows; row++) {
        const t = (row + 1) / rows;
        for (let col = 0; col < columns; col++) {
          dummy.position.set(
            sign > 0
              ? -width / 2 + (col * width) / columns
              : width / 2 - (col * width) / columns,
            base + rise * t + 0.035,
            sign * span * (1 - t),
          );
          dummy.rotation.set(sign * slope, 0, 0);
          // Tile local +z runs downhill; put origin at the uphill row edge.
          if (sign < 0) dummy.rotation.y = Math.PI;
          dummy.scale.set(
            (width / columns) * 1.035,
            1,
            (slopeLength / rows) * 1.06,
          );
          dummy.updateMatrix();
          tiles.setMatrixAt(index, dummy.matrix);
          roofShade.setHSL(
            0.6,
            0.12 + random() * 0.035,
            0.78 + random() * 0.14,
            T.SRGBColorSpace,
          );
          tiles.setColorAt(index++, roofShade);
        }
      }
      box(
        parent,
        m.woodDark,
        0,
        base - 0.13,
        sign * (span + 0.035),
        width + 0.07,
        0.2,
        0.12,
      );
      const gutter = cylinder(
        parent,
        m.metal,
        0,
        base - 0.19,
        sign * (span + 0.13),
        0.055,
        width,
      );
      gutter.rotation.z = Math.PI / 2;
    }
    parent.add(tiles);
    for (const sign of [-1, 1]) {
      for (let row = 1; row < rows; row++) {
        const t = row / rows;
        rod(
          parent,
          m.roofEdge,
          v(-width / 2, base + rise * t + 0.022, sign * span * (1 - t)),
          v(width / 2, base + rise * t + 0.022, sign * span * (1 - t)),
          0.009,
        );
      }
    }
    const ridge = cylinder(
      parent,
      m.roof,
      0,
      base + rise + 0.12,
      0,
      0.13,
      width + 0.11,
    );
    ridge.rotation.z = Math.PI / 2;
    for (const sign of [-1, 1]) {
      rod(
        parent,
        m.roof,
        v((sign * width) / 2, base + rise + 0.04, 0),
        v((sign * width) / 2, base, span),
        0.08,
      );
      rod(
        parent,
        m.roof,
        v((sign * width) / 2, base + rise + 0.04, 0),
        v((sign * width) / 2, base, -span),
        0.08,
      );
    }
  }
  function gables(
    parent: T.Object3D,
    width: number,
    depth: number,
    base: number,
    rise: number,
    mat: T.Material,
  ) {
    const points: number[] = [];
    for (const x of [-width / 2, width / 2])
      points.push(x, base, -depth / 2, x, base + rise, 0, x, base, depth / 2);
    const geo = geometry(new T.BufferGeometry());
    geo.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    geo.setIndex([0, 2, 1, 3, 4, 5]);
    geo.computeVertexNormals();
    mesh(parent, geo, mat, v(0, 0, 0));
  }
  function window(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    shutters = false,
  ) {
    box(parent, m.woodDark, x, y, z, width + 0.18, height + 0.17, 0.13);
    box(parent, m.glass, x, y, z + 0.085, width, height, 0.035);
    box(parent, m.woodLight, x, y, z + 0.112, 0.07, height, 0.035);
    box(
      parent,
      m.woodLight,
      x,
      y - height / 2 - 0.08,
      z + 0.19,
      width + 0.24,
      0.1,
      0.25,
    );
    box(
      parent,
      m.paper,
      x,
      y + height * 0.15,
      z + 0.115,
      width - 0.1,
      0.025,
      0.012,
    );
    // Curtain folds behind the frame, with a cool glass reflection.
    for (let i = 0; i < 8; i++)
      box(
        parent,
        i % 2 ? m.glass : m.paper,
        x - width / 2 + 0.11 + (i * width) / 10,
        y,
        z + 0.099,
        0.035,
        height * 0.9,
        0.017,
      );
    if (shutters) {
      for (const sign of [-1, 1]) {
        box(
          parent,
          m.woodLight,
          x + sign * (width / 2 + 0.33),
          y,
          z + 0.05,
          0.46,
          height + 0.06,
          0.08,
        );
        for (let i = 0; i < 10; i++)
          box(
            parent,
            m.wood,
            x + sign * (width / 2 + 0.33),
            y - height / 2 + (i * height) / 10,
            z + 0.1,
            0.4,
            0.025,
            0.025,
          );
      }
    }
  }
  function foliage(
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    count: number,
    size: number,
  ) {
    for (let i = 0; i < count; i++) {
      const phi = random() * Math.PI * 2;
      const cosTheta = random() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const radius = Math.cbrt(0.2 + random() * 0.8);
      leafRecords.push({
        p: v(
          x + Math.cos(phi) * sinTheta * rx * radius,
          y + cosTheta * ry * radius,
          z + Math.sin(phi) * sinTheta * rz * radius,
        ),
        size: size * (0.7 + random() * 0.6),
        rotation: new T.Euler(random() * 2.7, random() * 6.28, random() * 6.28),
        shade: random(),
      });
    }
  }
  function tree(x: number, z: number, height = 5.7, scale = 1) {
    const trunk = group('garden-tree', x, z);
    const fork = height * 0.51;
    rod(trunk, m.wood, v(0, 0.16, 0), v(0.15, fork, 0), 0.12 * scale);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4;
      const dx = Math.cos(angle) * (0.6 + random() * 0.75) * scale;
      const dz = Math.sin(angle) * (0.5 + random() * 0.75) * scale;
      const top = height - random() * 1.1 * scale;
      rod(
        trunk,
        m.woodLight,
        v(0.12, fork, 0),
        v(dx, top - 0.5, dz),
        0.047 * scale,
      );
      foliage(
        x + dx,
        top,
        z + dz,
        1.0 * scale,
        0.82 * scale,
        1.0 * scale,
        350,
        0.23 * scale,
      );
      canopyRecords.push({
        point: v(x + dx, top, z + dz),
        scale: v(0.73 * scale, 0.63 * scale, 0.77 * scale),
        rotation: angle,
      });
    }
  }
  function pot(x: number, z: number, size = 0.28, height = 0.65) {
    const geo = geometry(
      new T.CylinderGeometry(size, size * 0.68, size * 1.4, 12),
    );
    mesh(scene, geo, m.terracotta, v(x, 0.18 + size * 0.7, z));
    cylinder(scene, m.terracotta, x, 0.18 + size * 1.35, z, size * 1.04, 0.06);
    cylinder(scene, m.soil, x, 0.18 + size * 1.39, z, size * 0.9, 0.014);
    const centerY = size * 1.5 + height * 0.7;
    rod(scene, m.woodDark, v(x, 0.3, z), v(x + 0.02, centerY, z), 0.016);
    foliage(x, centerY, z, size * 1.3, height * 0.64, size * 1.3, 90, 0.12);
  }

  const h = STREET_STUDY.house;
  const home = group('residential-house', h.x, h.z);
  home.userData.place = 'house';
  box(home, m.stone, 0, 0.38, 0, h.width + 0.1, 0.5, h.depth + 0.1);
  box(home, m.plaster, 0, h.height / 2 + 0.2, 0, h.width, h.height, h.depth);
  box(
    home,
    m.woodDark,
    0,
    3.0,
    h.depth / 2 + 0.032,
    h.width + 0.02,
    0.16,
    0.08,
  );
  gables(home, h.width, h.depth, h.height + 0.2, 1.7, m.plaster);
  roof(home, h.width + 0.8, h.depth + 1.0, h.height + 0.2, 1.85);
  // All four elevations have actual geometry; orbiting never exposes a billboard.
  for (const front of [-1, 1]) {
    const facade = group('house-elevation', 0, 0, home);
    if (front < 0) facade.rotation.y = Math.PI;
    window(facade, -2.4, 2.0, h.depth / 2 + 0.03, 1.65, 1.7, true);
    window(facade, 2.4, 2.0, h.depth / 2 + 0.03, 1.45, 1.7, true);
    box(facade, m.woodDark, 0, 1.65, h.depth / 2 + 0.08, 1.45, 2.8, 0.16);
    box(facade, m.wood, 0, 1.63, h.depth / 2 + 0.18, 1.33, 2.68, 0.07);
    for (let i = -5; i <= 5; i++)
      box(
        facade,
        m.woodLight,
        i * 0.105,
        1.67,
        h.depth / 2 + 0.23,
        0.038,
        2.25,
        0.035,
      );
    const porch = box(
      facade,
      m.roofEdge,
      0,
      3.23,
      h.depth / 2 + 0.5,
      2.25,
      0.12,
      1.0,
    );
    porch.rotation.x = 0.13;
    cylinder(
      facade,
      m.metal,
      h.width / 2 - 0.06,
      2.13,
      h.depth / 2 + 0.2,
      0.055,
      4.0,
    );
  }
  for (const sign of [-1, 1]) {
    const side = group('house-side', (sign * h.width) / 2, 0, home);
    side.rotation.y = (sign * Math.PI) / 2;
    window(side, 0, 2.1, 0.05, 1.9, 1.5, true);
  }
  const frontWallZ = -4.13;
  // The gate is a real opening in the continuous boundary, not an overlay.
  for (const [x, width] of [
    [-9.58, 3.45],
    [-3.74, 3.17],
  ]) {
    box(scene, m.stone, x, 0.85, frontWallZ, width, 1.35, 0.23);
    box(scene, m.curb, x, 1.57, frontWallZ, width + 0.06, 0.12, 0.32);
    for (let y = 0.4; y < 1.5; y += 0.27)
      box(
        scene,
        m.pavement,
        x,
        y,
        frontWallZ + 0.12,
        width - 0.03,
        0.015,
        0.012,
      );
  }
  for (const x of [-7.55, -5.65]) {
    box(scene, m.stone, x, 1.05, frontWallZ, 0.4, 1.75, 0.45);
    box(scene, m.curb, x, 1.96, frontWallZ, 0.48, 0.12, 0.52);
  }
  box(scene, m.woodDark, -6.6, 1.08, frontWallZ, 1.7, 1.72, 0.12);
  for (let i = 0; i < 16; i++)
    box(
      scene,
      m.woodLight,
      -7.38 + i * 0.103,
      1.08,
      frontWallZ + 0.075,
      0.047,
      1.61,
      0.035,
    );
  for (let i = 0; i < 6; i++)
    box(
      scene,
      m.woodLight,
      -6.6,
      0.45 + i * 0.25,
      frontWallZ + 0.09,
      1.65,
      0.045,
      0.04,
    );
  box(scene, m.metal, -5.66, 1.3, frontWallZ + 0.26, 0.22, 0.14, 0.09);
  box(scene, m.paper, -5.66, 1.4, frontWallZ + 0.255, 0.12, 0.07, 0.016);
  box(ground, m.pavement, -6.6, 0.18, -5.1, 1.85, 0.12, 2.1);
  box(ground, m.pavement, -6.6, 0.185, -3.75, 1.85, 0.12, 0.7);
  box(scene, m.lawn, -9.4, 0.19, -5.2, 3.15, 0.07, 1.6);
  box(scene, m.lawn, -3.8, 0.19, -5.2, 2.6, 0.07, 1.6);
  for (const x of [-11.1, -2.0])
    box(scene, m.stone, x, 0.83, -8.1, 0.22, 1.3, 7.85);
  box(scene, m.stone, -6.6, 0.8, -12, 9.3, 1.3, 0.22);
  tree(-12.9, -6.8, 4.8, 0.7);
  tree(-0.5, -10.7, 5.0, 0.65);
  tree(-9.7, -14.8, 6, 1.2);
  pot(-7.85, -3.92, 0.2, 0.65);
  pot(-5.2, -3.83, 0.25, 0.8);
  for (let x = -10.65; x < -8.2; x += 0.6)
    foliage(x, 0.92, -4.63, 0.52, 0.57, 0.47, 150, 0.14);
  for (let x = -4.7; x < -2.2; x += 0.6)
    foliage(x, 1.1, -4.75, 0.54, 0.7, 0.48, 150, 0.14);

  const c = STREET_STUDY.cafe;
  const cafe = group('corner-cafe', c.x, c.z);
  cafe.userData.place = 'cafe';
  const front = c.depth / 2;
  box(cafe, m.stone, 0, 0.28, 0, c.width + 0.15, 0.35, c.depth + 0.15);
  // Upper storey + side/rear walls, leaving real storefront openings below.
  box(cafe, m.cafeWall, 0, 4.7, 0, c.width, 2.8, c.depth);
  for (const sign of [-1, 1])
    box(
      cafe,
      m.cafeWall,
      sign * (c.width / 2 - 0.16),
      1.72,
      0,
      0.32,
      2.75,
      c.depth,
    );
  box(cafe, m.cafeWall, 0, 1.72, -front + 0.15, c.width, 2.75, 0.3);
  box(cafe, m.woodDark, 0, 3.28, front + 0.02, c.width + 0.08, 0.2, 0.2);
  gables(cafe, c.width, c.depth, c.height, 1.35, m.cafeWall);
  roof(cafe, c.width + 0.65, c.depth + 0.8, c.height, 1.6);
  for (const z of [front + 0.035, -front - 0.035]) {
    const elevation = group('cafe-elevation', 0, z, cafe);
    if (z < 0) elevation.rotation.y = Math.PI;
    window(elevation, -1.58, 4.75, 0, 1.52, 1.75, true);
    window(elevation, 1.53, 4.75, 0, 1.52, 1.75, true);
  }
  for (const sign of [-1, 1]) {
    const side = group('cafe-side', (sign * c.width) / 2, 0, cafe);
    side.rotation.y = (sign * Math.PI) / 2;
    window(side, -0.75, 4.75, 0.015, 1.2, 1.55);
    window(side, 1.0, 1.85, 0.015, 1.2, 1.6);
  }
  // Storefront: glazing, mullions, working depth and small readable interior.
  for (const x of [-3.03, -0.7, 0.85, 3.04])
    box(cafe, m.woodDark, x, 1.76, front + 0.09, 0.12, 2.9, 0.18);
  for (const [x, w] of [
    [-1.86, 2.18],
    [2.0, 2.17],
  ]) {
    box(
      cafe,
      m.transparentGlass,
      x,
      1.76,
      front + 0.075,
      w,
      2.55,
      0.028,
    ).castShadow = false;
    box(cafe, m.wood, x, 0.43, front + 0.14, w, 0.3, 0.12);
    box(cafe, m.woodLight, x, 1.5, front + 0.12, w, 0.055, 0.055);
    box(cafe, m.woodLight, x, 2.9, front + 0.12, w, 0.065, 0.055);
    box(cafe, m.woodLight, x, 1.85, front + 0.12, 0.045, 2.35, 0.05);
  }
  box(cafe, m.wood, 0.08, 1.72, front + 0.13, 1.4, 2.75, 0.11);
  box(
    cafe,
    m.transparentGlass,
    0.08,
    1.93,
    front + 0.2,
    1.15,
    1.9,
    0.015,
  ).castShadow = false;
  for (const x of [-0.55, 0.7])
    box(cafe, m.woodLight, x, 1.72, front + 0.24, 0.07, 2.6, 0.05);
  box(cafe, m.woodLight, 0.08, 0.77, front + 0.25, 1.25, 0.08, 0.05);
  rod(
    cafe,
    m.metal,
    v(0.51, 1.3, front + 0.3),
    v(0.51, 1.6, front + 0.3),
    0.026,
  );
  box(cafe, m.wood, 0, 0.98, -1.45, 4.6, 1.5, 0.7);
  box(cafe, m.woodLight, 0, 1.8, -1.45, 4.8, 0.13, 0.86);
  for (let row = 0; row < 3; row++) {
    box(cafe, m.woodLight, 0, 1.2 + row * 0.68, -2.62, 4.8, 0.08, 0.34);
    for (let i = 0; i < 13; i++)
      cylinder(
        cafe,
        i % 3 ? m.paper : m.terracotta,
        -2.1 + i * 0.33,
        1.38 + row * 0.68,
        -2.58,
        0.065,
        0.3 + random() * 0.12,
      );
  }
  box(
    cafe,
    m.pavement,
    0,
    0.26,
    0,
    c.width - 0.4,
    0.07,
    c.depth - 0.3,
  ).castShadow = false;
  for (const x of [-2.3, 2.4])
    cylinder(cafe, m.windowGlow, x, 2.57, 1.8, 0.17, 0.22);
  // Blue cloth canopy with an actual curved scalloped valance.
  const awning = box(
    cafe,
    m.blue,
    0,
    3.24,
    front + 0.62,
    c.width + 0.16,
    0.075,
    1.28,
  );
  awning.rotation.x = 0.19;
  rod(
    cafe,
    m.metal,
    v(-3.3, 3.03, front + 1.25),
    v(3.3, 3.03, front + 1.25),
    0.031,
  );
  const scallopShape = new T.Shape();
  scallopShape.moveTo(-0.23, 0.14);
  scallopShape.lineTo(0.23, 0.14);
  scallopShape.lineTo(0.23, -0.08);
  scallopShape.quadraticCurveTo(0, -0.22, -0.23, -0.08);
  scallopShape.closePath();
  const scallopGeometry = geometry(
    new T.ExtrudeGeometry(scallopShape, {
      depth: 0.025,
      bevelEnabled: false,
      curveSegments: 8,
    }),
  );
  for (let i = 0; i < 14; i++)
    mesh(
      cafe,
      scallopGeometry,
      m.blue,
      v(-3.12 + i * 0.48, 2.96, front + 1.25),
    );
  for (const sign of [-1, 1])
    rod(
      cafe,
      m.metal,
      v(sign * 3.08, 2.2, front + 0.1),
      v(sign * 3.08, 3.04, front + 1.2),
      0.025,
    );
  for (const x of [c.x - 3, c.x + 2.85]) pot(x, -3.21, 0.25, 1.1);
  pot(c.x + 2.3, -3.47, 0.18, 0.66);
  pot(c.x - 2.6, -3.26, 0.17, 0.55);
  box(scene, m.stone, 3.1, 0.7, -8.0, 0.24, 1.08, 8.3);
  tree(3.2, -5.0, 5.3, 0.7);
  tree(13.7, -8.7, 6.5, 0.95);
  tree(7.0, -14.2, 6.4, 0.9);
  // Wood wainscoting and warm interior joinery keep the shop from reading as a box.
  for (let i = 0; i < 24; i++) {
    box(
      cafe,
      i % 3 ? m.wood : m.woodLight,
      -3.14 + i * 0.27,
      0.55,
      front + 0.17,
      0.255,
      0.48,
      0.07,
    );
  }
  box(cafe, m.woodLight, 0, 0.82, front + 0.19, 6.45, 0.075, 0.11);
  for (const x of [-2.6, 2.6]) {
    rod(
      cafe,
      m.darkMetal,
      v(x, 2.72, front + 0.14),
      v(x, 2.72, front + 0.45),
      0.026,
    );
    cylinder(cafe, m.darkMetal, x, 2.52, front + 0.45, 0.12, 0.3);
    cylinder(cafe, m.windowGlow, x, 2.53, front + 0.45, 0.08, 0.22);
  }
  // A small front garden edge matches the framing in the approved 2D composition.
  const foreground = group('neighbouring-roof-edge', 13, 10.8);
  box(foreground, m.plaster, 0, 1.85, 0, 8.5, 3.35, 6.5);
  gables(foreground, 8.5, 6.5, 3.53, 1.6, m.plaster);
  roof(foreground, 9.15, 7.15, 3.53, 1.7);
  const rearWindow = group('neighbour-window', 0, -3.29, foreground);
  rearWindow.rotation.y = Math.PI;
  window(rearWindow, 0, 2.0, 0.05, 1.5, 1.6, true);
  for (const [x, w] of [
    [-10.5, 12],
    [10.5, 12],
  ]) {
    box(scene, m.stone, x, 0.77, 4.45, w, 1.18, 0.25);
    box(scene, m.curb, x, 1.41, 4.45, w + 0.05, 0.1, 0.34);
    for (let y = 0.36; y < 1.35; y += 0.27)
      box(scene, m.pavement, x, y, 4.3, w, 0.013, 0.016);
  }
  for (let x = -16; x <= 16; x += 2.2) {
    if (Math.abs(x) > 4.1) foliage(x, 1.35, 5.2, 1.12, 0.8, 0.8, 230, 0.17);
    foliage(x, 1.8, -14.5, 1.6, 1.35, 1.7, 250, 0.24);
  }

  // Cafe chalkboard, planter and bicycle, all shared in the same ground space.
  const board = group('cafe-chalkboard', 10.2, -3.18);
  const sign = box(board, m.woodLight, 0, 0.62, 0, 0.52, 0.9, 0.06);
  sign.rotation.x = -0.12;
  const face = box(board, m.darkMetal, 0, 0.63, 0.045, 0.44, 0.76, 0.013);
  face.rotation.x = -0.12;
  for (const x of [-0.27, 0.27])
    rod(board, m.wood, v(x, 0.19, -0.22), v(x, 1.08, 0), 0.025);
  for (let i = 0; i < 4; i++)
    box(
      board,
      m.paper,
      -0.025,
      0.8 - i * 0.12,
      0.057,
      0.27 - i * 0.035,
      0.012,
      0.004,
    );
  const bike = group('parked-bicycle', 5.3, -3.22);
  bike.rotation.y = -0.16;
  const wheelGeometry = geometry(new T.TorusGeometry(0.34, 0.028, 8, 32));
  const rimGeometry = geometry(new T.TorusGeometry(0.305, 0.012, 5, 32));
  for (const x of [-0.57, 0.57]) {
    mesh(bike, wheelGeometry, m.woodDark, v(x, 0.53, 0));
    mesh(bike, rimGeometry, m.metal, v(x, 0.53, 0));
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      rod(
        bike,
        m.metal,
        v(x, 0.53, 0),
        v(x + Math.cos(angle) * 0.3, 0.53 + Math.sin(angle) * 0.3, 0),
        0.004,
      );
    }
  }
  const bikePoints = [
    v(-0.57, 0.53, 0),
    v(0, 0.53, 0),
    v(-0.18, 1.0, 0),
    v(0.38, 1.0, 0),
    v(0.57, 0.53, 0),
  ];
  for (const [a, b] of [
    [0, 1],
    [0, 2],
    [1, 2],
    [1, 3],
    [2, 3],
    [3, 4],
  ])
    rod(bike, m.blue, bikePoints[a], bikePoints[b], 0.017);
  rod(bike, m.metal, v(-0.18, 0.95, 0), v(-0.23, 1.12, 0), 0.017);
  box(bike, m.woodDark, -0.23, 1.13, 0, 0.25, 0.055, 0.13);
  rod(bike, m.metal, v(0.38, 1.0, 0), v(0.35, 1.22, 0), 0.017);
  rod(bike, m.metal, v(0.35, 1.22, -0.19), v(0.35, 1.22, 0.19), 0.015);
  for (let i = 0; i < 7; i++)
    box(bike, m.metal, 0.53, 1.0, -0.18 + i * 0.06, 0.25, 0.012, 0.007);
  for (const x of [0.42, 0.68])
    rod(bike, m.metal, v(x, 0.98, -0.19), v(x, 1.17, -0.22), 0.008);

  // Peripheral greenery frames an ordinary neighbourhood, no isolated dollhouse platform.
  for (const [x, z, height, scale] of [
    [-16, -7, 6.3, 1.2],
    [17, -7, 6.8, 1.3],
    [-13, 8, 6.4, 1.1],
    [4, 7.3, 5.8, 1.0],
    [19, 8, 6.6, 1.3],
    [-18, -15, 7.3, 1.3],
  ])
    tree(x, z, height, scale);
  for (let x = -17; x < 18; x += 2.6) {
    foliage(x, 0.76, 5.0, 1.35, 0.63, 0.9, 170, 0.23);
    if (x < -12 || x > 12) foliage(x, 1.0, -5, 1.35, 0.8, 1.1, 170, 0.24);
  }
  for (const [x, z] of [
    [-13.5, -3.45],
    [12.8, -3.48],
  ]) {
    const pole = group('utility-pole', x, z);
    cylinder(pole, m.stone, 0, 4.2, 0, 0.145, 8.0);
    cylinder(pole, m.metal, 0, 0.68, 0, 0.153, 0.98);
    box(pole, m.metal, 0, 7.38, 0, 0.8, 0.12, 0.1);
    for (const dx of [-0.32, 0.32])
      cylinder(pole, m.paper, dx, 7.55, 0, 0.07, 0.19);
  }
  for (const z of [-3.45, -3.13]) {
    const curve = new T.QuadraticBezierCurve3(
      v(-13.5, 7.6, z),
      v(0, 6.8, z),
      v(12.8, 7.6, z),
    );
    mesh(
      scene,
      geometry(new T.TubeGeometry(curve, 32, 0.015, 5, false)),
      m.darkMetal,
      v(0, 0, 0),
    ).castShadow = false;
  }

  // Thousands of varied leaf silhouettes, batched in one draw rather than triangle bushes.
  const leafShape = new T.Shape();
  leafShape.moveTo(0, -0.55);
  leafShape.bezierCurveTo(-0.38, -0.1, -0.34, 0.3, 0, 0.57);
  leafShape.bezierCurveTo(0.34, 0.3, 0.38, -0.1, 0, -0.55);
  const leafGeometry = geometry(new T.ShapeGeometry(leafShape, 3));
  const foliageMesh = new T.InstancedMesh(
    leafGeometry,
    m.leaves,
    leafRecords.length,
  );
  const leafDummy = new T.Object3D();
  const color = new T.Color();
  leafRecords.forEach((leaf, i) => {
    leafDummy.position.copy(leaf.p);
    leafDummy.rotation.copy(leaf.rotation);
    leafDummy.scale.set(leaf.size * 0.75, leaf.size, leaf.size);
    leafDummy.updateMatrix();
    foliageMesh.setMatrixAt(i, leafDummy.matrix);
    color.setHSL(
      0.205 + leaf.shade * 0.055,
      0.38 + leaf.shade * 0.2,
      0.33 + leaf.shade * 0.16,
      T.SRGBColorSpace,
    );
    foliageMesh.setColorAt(i, color);
  });
  foliageMesh.name = 'hand-shaped-leaves';
  foliageMesh.castShadow = foliageMesh.receiveShadow = true;
  scene.add(foliageMesh);

  // Organic shaded cores give the leaves volume without sparse cutout-card bushes.
  const canopyGeometry = geometry(new T.SphereGeometry(1, 16, 10));
  const canopyPositions = canopyGeometry.getAttribute('position');
  const canopyColors: number[] = [];
  const lowerGreen = new T.Color('#456b32');
  const upperGreen = new T.Color('#91ad57');
  for (let i = 0; i < canopyPositions.count; i++) {
    const point = new T.Vector3().fromBufferAttribute(canopyPositions, i);
    const waviness =
      1 + Math.sin(point.x * 12 + point.y * 4) * Math.sin(point.z * 9) * 0.035;
    const green = lowerGreen.clone().lerp(upperGreen, (point.y + 1) * 0.5);
    canopyPositions.setXYZ(
      i,
      point.x * waviness,
      point.y * waviness,
      point.z * waviness,
    );
    canopyColors.push(green.r, green.g, green.b);
  }
  canopyGeometry.setAttribute(
    'color',
    new T.Float32BufferAttribute(canopyColors, 3),
  );
  canopyGeometry.computeVertexNormals();
  const canopyMaterial = material('#ffffff', {
    vertexColors: true,
    roughness: 1,
  });
  const canopyMesh = new T.InstancedMesh(
    canopyGeometry,
    canopyMaterial,
    canopyRecords.length,
  );
  canopyRecords.forEach((canopy, i) => {
    leafDummy.position.copy(canopy.point);
    leafDummy.scale.copy(canopy.scale);
    leafDummy.rotation.set(0, canopy.rotation, 0);
    leafDummy.updateMatrix();
    canopyMesh.setMatrixAt(i, leafDummy.matrix);
  });
  canopyMesh.name = 'shaded-foliage-volumes';
  canopyMesh.castShadow = canopyMesh.receiveShadow = true;
  scene.add(canopyMesh);

  scene.add(new T.HemisphereLight('#b4cdeb', '#889079', 1.5));
  const sunlight = new T.DirectionalLight('#fff5db', 3.0);
  sunlight.position.set(...STREET_STUDY.sun);
  sunlight.target.position.set(0, 0, -5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -28;
  sunlight.shadow.camera.right = 28;
  sunlight.shadow.camera.top = 25;
  sunlight.shadow.camera.bottom = -23;
  sunlight.shadow.camera.near = 0.5;
  sunlight.shadow.camera.far = 85;
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.bias = -0.00015;
  sunlight.shadow.radius = 2;
  scene.add(sunlight, sunlight.target);
  scene.updateMatrixWorld(true);
  // Consolidate shared details into instances. Keep major walls and roofs intact.
  const batches = new Map<string, T.Mesh[]>();
  scene.traverse((object) => {
    if (!(object instanceof T.Mesh) || object instanceof T.InstancedMesh)
      return;
    if (object.geometry !== boxGeometry && object.geometry !== cylinderGeometry)
      return;
    if (
      object.geometry === boxGeometry &&
      Math.max(object.scale.x, object.scale.y, object.scale.z) > 4
    )
      return;
    const mat = object.material;
    if (Array.isArray(mat)) return;
    const key = `${object.geometry.uuid}/${mat.uuid}/${object.castShadow}/${object.receiveShadow}`;
    const values = batches.get(key) ?? [];
    values.push(object);
    batches.set(key, values);
  });
  for (const originals of batches.values()) {
    if (originals.length < 5) continue;
    const first = originals[0];
    const batch = new T.InstancedMesh(
      first.geometry,
      first.material,
      originals.length,
    );
    batch.name = 'batched-street-detail';
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    originals.forEach((original, i) => {
      batch.setMatrixAt(i, original.matrixWorld);
      original.removeFromParent();
    });
    batch.computeBoundingSphere();
    scene.add(batch);
  }
  scene.updateMatrixWorld(true);
  let disposed = false;
  return {
    scene,
    resources: { geometries, materials, textures: ownedTextures },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.traverse((object) => {
        if (object instanceof T.InstancedMesh) object.dispose();
      });
      sunlight.shadow.dispose();
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      ownedTextures.forEach((value) => value.dispose());
      scene.clear();
    },
  };
}
