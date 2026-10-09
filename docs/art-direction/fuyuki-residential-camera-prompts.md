# 住宅坂沿路与平视：素材生成记录

日期：2026-10-07—2026-10-08。内置 image_gen；全部以已有完整街景为参考进行编辑，没有外部生成脚本或图片拼接。

- 画风基准：用户确认的 `source/public/fate/city-art/miyama-residential-west-soft-v2.png`。
- 固定物理关系：切嗣新居窄门、中央花店、远处卫宫宅宽门，连续院墙、人行铺装、主路和右侧岔路；不能因为换镜头而复制或交换店面。
- 运行选用沿路柔和第二版与正向平视柔和第二版；旧沿路图因高度过近平视、旧平视图因从路侧斜看被替换，作为历史参考保留。
- 沿路第一／二版均为 **1671×941**，平视为 **1672×941** 原生输出。早期提示虽要求真正3840×2160以上，工具未达到；保留无损PNG，不放大冒充4K。高清母版仍待取得。
- 镜头是分别配准的完整2D场景，没有建筑背面和360度环视；不把图像透视变形当自由3D。

## 平视第二版：正向眼高取景（2026-10-08）

- 用户指出“平视前路”仍从路侧斜看。第二版把镜头放到道路中间、接近人物眼高，正对街道前方；消失点接近画面中央，地平线保持水平。保留已确认的柔和融合版画风。
- 左侧沿路顺序仍为切嗣新居窄门、花店、卫宫宅宽门；连续院墙、门前铺装和右侧岔路保留。未把原图旋转、拉伸或拼接成新视角。
- 运行选用：`source/public/fate/city-art/miyama-residential-west-eye-soft-v2.png`，内置 image_gen 输出原生 **1672×941**、无损PNG。未放大或锐化；真实4K母版仍待取得。
- 定稿原稿：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-8bfb458d-d2d4-436d-87b4-8af1d5d22f76.png`。初次正向稿仍略偏右，留在工具输出目录作参考，没有接入运行场景。
- 新图重新测量九处道路横截面、实际铺装和两户门槛；花店单独校正至店前空铺装，脚底为原画`(512.217,569.633)`，不落在旁边住宅墙上。世界坐标、可行走边界、路线与地点编号保持。旧平视图作为历史参考保留。
- [最终页面实景](fuyuki-residential-eye-forward-v2-runtime.png)包含真实人物与地点标签；验证结果见[扩展记录](../fuyuki-25d-expansion.md)。

初次重绘提示词：

```text
Use case: style-transfer
Asset type: seamless opaque widescreen 16:9 game environment, the true straight-ahead eye-level camera preset of an existing Japanese residential street.
Input images: Image 1 is the current street to repaint ONLY its camera. Image 2 is the approved soft fusion Japanese anime background style and the same street's spatial identity.
Primary request: Repaint this exact same connected street from the ROAD CENTER at HUMAN EYE HEIGHT, looking STRAIGHT FORWARD ALONG THE ROAD. The current image is sideways oblique; replace that composition. Put the street's vanishing point at the horizontal center of the frame, near mid-height. Camera eye height about 1.55 m, pitch 0 degrees, roll 0 degrees. Level horizon; vertical poles and wall posts vertical. A human standing in the center and looking straight ahead sees this. Do not aim towards the left facades or upper-right corner. Do not view from above, see broad roof planes, tilt the scene or use Dutch angles. Show two continuous curbs converging toward the central vanishing point, a broad safe asphalt foreground across the lower half, and a calm blue sky between rooftops.
Scene invariants: preserve modern Japanese residential scale, same cream walls and blue-gray tiles, near-to-far order ON THE LEFT: (1) modest Kiritsugu family house with a narrow vertical wooden gate, (2) small florist with muted sage awning, timber glass door, pale pink/white flowers and blue hydrangeas, (3) Emiya compound's broad brown gate with tile canopy. All three distinctive entrances must be visible, separate and grounded on their continuous paved sidewalk, with clear empty threshold space. Place the camera just far enough behind the nearest house that its gate is fully in frame, not clipped at the left edge. Keep the small opposite RIGHT branch junction between the florist and the distant broad gate, understated utility poles and wires, modest opposing homes and greenery. Do not duplicate shops, replace the flower shop with a cafe or swap the two house gates.
Art invariants: match the approved SOFT fusion anime background of Image 2. Warm cream wall bounce light, cool blue-gray roof tiles, quiet sage and varied natural summer greens, soft grouped foliage edges, white and pink roses, blue hydrangeas, a little maple, gentle broad chromatic tree shadows and restrained asphalt grain. Refined details at the doors and plants, calm depth in the distance. Preserve warmth and fresh color without glittery sharp yellow leaves, hard outlines, desaturation, fog or blanket blur. This is the same street and time of day, only a different camera.
One coherent complete painting, no cutout-building collage, photorealistic 3D render, fantasy academy, pixel art, giant ornate road patterns, people, characters, UI, labels, text, watermark or logo. Preserve a wide 16:9 aspect ratio. Use the largest genuine native resolution available, never an enlargement pretending to add detail.
```

将消失点进一步居中的定稿提示词：

```text
Use case: precise-object-edit
Asset type: complete 16:9 soft Japanese anime game street painting, eye-level forward view.
Image 1 is the camera edit target; Image 2 is the approved style reference. Change ONLY camera alignment in Image 1. Its street's vanishing point is still slightly right of center. Move the optical viewpoint into the exact middle of the roadway and aim straight ahead. The vanishing point must be at (50% width, 50% height); the centerline of the foreground road runs vertically from (50% width, 100% height) to that vanishing point. The horizon is level at half image height; human eye height 1.55m, 0-degree roll and 0-degree pitch, not an overhead or diagonal side view. Straight road stretching directly away from the viewer, continuous left and right curbs symmetrically converging toward the centered vanishing point.
Preserve the exact SOFT fusion animation-background style, natural warm summer lighting, cream walls, muted blue-gray roofs and sage greens of Image 2. Preserve the three distinct buildings on the LEFT, in near-to-far order: near house's narrow timber gate, small sage-awning florist with glass door and white/pink flowers/blue hydrangeas, then the broad tile-canopied Emiya home gate. All three complete thresholds must remain visible, separated and accessible by continuous paving. Preserve the small opposite right branch junction, poles, wires and diverse plants; maintain the same real Japanese residential scale and gentle tree shadows. Do not make the plants sharper or more yellow, do not desaturate or blur everything.
Keep this a single seamless painting. No additional people, buildings, signs, lettering, interfaces, logo, watermark, collage or photorealistic 3D effect. Maintain 16:9 native output, no upscaling.
```

## 沿路第二版：区分镜头高度（2026-10-07）

- 使用内置 image_gen，以旧沿路图为编辑目标、已确认斜俯图为画风参考。只改变镜头构图，保持柔和融合版的配色、夏季光线、门口顺序与连续铺装。
- 新沿路采用较高的向前斜看，能看到屋顶与院墙顶部；平视保留人物高度、立面和天空，避免两档只有名字不同。
- 选用：`source/public/fate/city-art/miyama-residential-west-along-soft-v2.png`，原生 **1671×941**，未放大、锐化或拼接。
- 工具原稿：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-debc9ddd-c420-4321-b865-24b307b16908.png`。
- 新图重新测量九处道路站点、路沿及两户门前；共用原世界坐标和碰撞，换取景不改变人物位置、路线或地点。

实际提示词：

```text
Use case: style-transfer
Asset type: complete opaque painted background for the middle camera preset of a walkable 2.5D Japanese residential street, widescreen 16:9.
Input images: Image 1 is the existing along-road painting to revise. Image 2 is the accepted higher oblique painting, used only to maintain the exact same soft fusion anime background art direction and architectural identity.
Primary request: Repaint Image 1 from a distinctly HIGHER intermediate forward-looking camera. Change ONLY the camera geometry and composition. Preserve this accepted art style, color relationships, time of day, soft lighting, Japanese architecture, flowers and tree variety.
Camera: camera is about 6 meters above the street, looking downward about 30 degrees while looking diagonally along its length. This must clearly look more elevated than a human eye-level view: show substantial roof surfaces, wall tops, courtyard ground and both continuous curbs. It must also remain less overhead than Image 2. Keep the road receding into the upper-right distance, with a clear near-to-far scale change. The horizon is outside the picture or only at the extreme top edge; do NOT give the sky a large band like Image 1.
Scene continuity: same connected residential slope, same building order along its left side: near wooden home gate between pale cream wall posts; small green-awning florist midway; a more distant broad wooden gate with a tiled canopy. Preserve all three entrances as visibly open paved approaches, not covered by plants or objects. Keep the curved right-hand lane connection and unobstructed continuous asphalt in the foreground and along the whole street. Small roof and garden silhouettes on the right may frame the view but cannot interrupt the walking surface.
Style invariants: softly painted Japanese anime background, luminous but gently diffused early-summer daylight, pale warm cream walls, cool blue-gray ceramic roofs, quiet sage and varied natural green foliage, white and pink roses, blue hydrangeas, gentle translucent broad tree shadows, restrained asphalt texture, atmospheric depth, refined readable detail. Match the reference's soft edges; do not desaturate it, do not sharpen outlines, do not add hard glittery yellow leaf highlights.
Composition: one seamless complete street painting; no detached buildings, cutout collage, panels or overlays. Both home gate thresholds and the florist paving must be visible and usable. Keep all scene objects correctly grounded.
No people, characters, game UI, text, labels, logos or watermark. No photorealistic rendering, pixel art, toy-town proportions, fantasy academy architecture, harsh sunlight, depth-of-field blur or artificial image sharpening.
```

## 沿路初稿

仅保留工具生成原稿：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-fc0502ac-5f70-4c9c-b5a4-3988ace3553c.png`。

实际提示词：

```text
Use case: stylized-concept. Asset type: complete continuous 2.5D game street background, camera variant of the attached approved painting.
Input image 1 is the approved art style AND exact same physical street. Redraw this same residential block from a new camera, preserving identities and relative order, not a new unrelated street.
Primary request: an "along the road" lower oblique view of the same Fuyuki Miyama residential slope west segment. Camera is at the western/near end looking east along the street, about 24 degrees above ground, not a bird's-eye view and not a frontal wide facade elevation. The asphalt road leads from broad lower left/center foreground towards the upper right distance. A continuous paved sidewalk follows the left side. All three featured entrances must be clearly visible and accessible from that sidewalk: near left Kiritsugu family's modest cream Japanese house, weathered cream wall and simple narrow brown vertical timber gate; further along a small florist with muted sage canvas awning, timber glazed door and white/pale pink roses, blue hydrangeas and pots; next the Emiya compound with a distinct broad brown slatted gate under a blue-gray tile canopy, cream wall and camphor tree. Keep this order exactly. Do not turn the florist into a cafe. Preserve the minor side-road junction opposite/between the florist and the Emiya gate, and restrained gray utility poles and overhead wires. Opposite side has modest homes and greenery, no buildings blocking the usable foreground pavement. Show all three doors and a continuous navigable strip, not a tiny far-away gate behind foliage.
Style: preserve approved soft Japanese animation background painting, delicately painted architectural forms, quiet natural modern Japanese residential atmosphere, warm cream walls, sage foliage, muted blue-gray roof tiles, gentle warm summer sunlight, softly grouped broad leaf shadows, calm chromatic sky fill. Fine detail at doors/flower pots, quieter background and road texture. A few camphor/zelkova silhouettes, a small maple and flowering shrubs with individual shapes, no repetitive tree clone rows. Soft edge hierarchy without blanket blur, without dull desaturation or mist. Keep crisp enough detail to read the paving edges, wall bases and gates in gameplay.
Composition: single coherent wide 16:9 frame, full landscape background, open road occupying lower half, retain foreground margins for a small player and controls. No characters, text, logos, interfaces, watermark, panel collage, cutout buildings, magical academy architecture, pixel art, photorealistic 3D render, excessive yellow sparkles, over-sharpened leaves, decorative repeating road pattern. Render the largest genuine native resolution available; aim at 3840x2160 with true fine detail, no simple enlargement.
```

## 平视初稿

仅保留工具生成原稿：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-597a01b4-f47c-4cf7-9f04-3d7343788097.png`。

实际提示词：

```text
Use case: stylized-concept. Asset type: full continuous 2.5D game background, eye-level camera of an existing approved residential street.
Input image 1 is the approved SOFT style reference and exact street; input image 2 shows the same required building order in a lower camera.
Primary request: redraw this very same Fuyuki Miyama residential slope from an eye-level camera (about 1.55m above the road, approximately 8 degrees downward). This must differ noticeably from the reference's oblique view: see the front and side faces of houses, a visible calm blue sky, road receding in depth; do not see broad roof tops. Single coherent perspective scene, no artificial tilting/stretching of the input image.
Physical continuity invariants: on the LEFT side, near-to-far in this exact order, (1) Kiritsugu family modest cream Japanese house with narrow vertical timber gate, cream masonry wall, white flowering shrub and gray pole near the west end; (2) small florist with muted sage awning, timber glass door, white/pale pink flowers and blue hydrangea pots; (3) Emiya compound's distinctly broad brown gate with gray-blue tile canopy, cream wall and camphor tree. Keep all THREE identifiable doors visible, separate and accessible with continuous empty sidewalk before their thresholds. Retain the small side-road junction on the opposite right side between the flower shop and the Emiya gate. Road fills the lower half and extends out the near edge, while eastward route continues towards upper-right distance; leave enough pavement around all three doors for an animated child to stand without crossing wall bases. Modest houses/greenery on the right, with a clear curb. Nothing blocks the usable road foreground.
Accepted art style: soft hand-painted Japanese animation background, cream wall warm bounce light, clear but restrained foliage greens, slate-blue tiles, muted sage awning, gentle chromatic shaded road. Group leaf highlights into calm broad forms; do NOT paint hundreds of brilliant yellow glitter dots. Large, lightly dappled tree shadows with soft edges, low-contrast asphalt grain, quiet sky fill. Tree canopy, roof and wall edges have a soft hierarchy, yet gates/curbs and flower pots stay readable. Natural variety of camphor/zelkova, a small Japanese maple, white flowering shrub and hydrangeas. Preserve the soft quality of input 1, NOT extra saturation or sharpening from input 2. Do not desaturate the entire scene or blanket-blur it.
Wide 16:9 complete game environment. No characters, text, signs with words, interface, logos, watermark, collage/cutout building chunks, fantasy school, pixel art, photorealistic 3D materials, ornate road patterns or giant decorative flower displays. Largest genuine native resolution available, target3840x2160 true detail, no enlargement pretending to be detail.
```

## 沿路柔和定稿

第一版（历史参考）：`source/public/fate/city-art/miyama-residential-west-along-soft-v1.png`。运行改用下面的第二版。

实际提示词：

```text
Use case: style-transfer, precise softening edit of an existing game background.
Input image 1 is the EDIT TARGET along-road camera. Input image 2 is the user-approved SOFT STYLE target.
Keep image 1's camera, perspective, road/sidewalk outlines, all three exact gates/doors, masonry wall boundaries, pole positions, florist awning and entrance, flower pots, side-road and utility wires PIXEL-ALIGNED. Do not move, resize, add or remove any architecture, props, entrances or paved surfaces; gameplay uses their current locations.
Change only brush/lighting treatment to match image 2: reduce the tiny sharp yellow-green leaf highlight fragments and black outline contrast; group foliage into broader soft painted masses. Make roof tile grooves and wall joints less hard and the road's micrograin calmer. Retain warm afternoon light and natural fresh greens, with broad gentle chromatic tree shadows and soft skylight; no blanket blur, hazy veil, desaturation, relighting or geometry changes. White and pale pink flowers, blue hydrangeas retain readable shapes without sparkles. Continue the soft Japanese animation background fusion style. Gates, wall bases, curb and doorstep contact remain well-defined. No people, text, overlay, watermark. Preserve aspect ratio and source image dimensions; high genuine detail without sharpen filters.
```

## 平视柔和定稿

第一版（历史参考）：`source/public/fate/city-art/miyama-residential-west-eye-soft-v1.png`。运行改用正向平视第二版。

实际提示词：

```text
Use case: style-transfer. Input 1 is the exact edit target, eye-level Fuyuki residential game background; input 2 is the accepted soft oblique look; input 3 is the softened along-road companion.
Change only the brush/light surface treatment of input 1 to match the subtle softness of input 2 and input 3. Preserve pixel-aligned road and curb outlines, three separate entrances and their frames, wall bases, utility poles, florist awning and flower pots, and right side-road junction. No geometry or camera changes.
Reduce sharp yellow-green leaf glitter and overly black roof/leaf grooves; paint foliage in broad readable natural groups. Make the wall joints and road grain low contrast, tree shadows broad, lightly dappled and soft. Retain natural fresh summer greens, warm cream walls, quiet blue-gray slate roof, sage florist awning and blue/pink/white flowers. True soft Japanese animation background painting with readable contact edges. Do not desaturate the whole scene, blanket-blur it, add mist, flatten door details or change the light direction. No text/people/logos/overlays/watermark. Keep native source resolution and full aspect ratio; no resizing pretending to add detail.
```
