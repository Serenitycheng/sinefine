# 深山旧街北段：柔和融合版三档原画记录

日期：2026-10-08。分支：`feat/art-samples`。生成工具：内置 `image_gen`，没有使用 API 或图像拼接。

## 选用素材和范围

- 斜俯：[miyama-old-north-overview-v1.png](../../source/public/fate/city-art/miyama-old-north-overview-v1.png)。
- 沿路：[miyama-old-north-along-v1.png](../../source/public/fate/city-art/miyama-old-north-along-v1.png)。
- 正向平视：[miyama-old-north-eye-v1.png](../../source/public/fate/city-art/miyama-old-north-eye-v1.png)。
- 三张均为工具原生 **1672×941 无损 PNG**，未经放大或锐化。提示词要求尽可能高的原生分辨率，但实际未取得3840×2160母版，不能标记为4K完成。
- 覆盖游戏原道路 `old-lanes` 前四个顶点，从住宅坂共有路口 `(470,390)` 到旧街弯道 `(270,780)`；韦伯实际门前 `(215,643)` 保持不动，原创书店门前 `(350,582)`。书店不是原作官方地点。
- 每张是同一街段的完整环境，独立绘制道路、两处入口、石墙、植栽与远景；没有拆建筑拼贴，没有把斜俯原图拉伸成平视。

参考图在调用前已查看。斜俯以已确认的住宅坂柔和版为画风参考；沿路同时参考新斜俯的建筑关系；平视参考新斜俯与住宅坂正向平视第二版。初次平视输出的消失点偏右，未进入运行素材；再次重绘为正向道路中央取景。

## 斜俯：实际提示词

参考：`source/public/fate/city-art/miyama-residential-west-soft-v2.png`。

```text
Use case: stylized-concept, style-reference. Asset type: one complete opaque widescreen 16:9 background for a walkable 2.5D Japanese game, native highest genuine resolution. The reference is ONLY the already approved soft fusion Japanese anime background art direction, summer light, proportions and local residential architecture. Create the adjoining Fuyuki Miyama OLD STREET NORTH, not a copy of the reference's florist street. A complete coherent environment, not separate building cutouts. Layout: one narrow gently bending asphalt lane with paved stone-edged sidewalks, comes in from the lower LEFT foreground (the residential-slope junction), curves mildly through the middle and continues to the upper RIGHT distance. All reachable floor and two doorways visible. Near-to-far on the LEFT: a small old timber BOOKSHOP with faded slate-blue awning, low book display recessed entirely inside its open storefront, timber glazed sliding door with empty paved apron; then one modest two-storey weathered timber Japanese RENTAL HOUSE for Waver with slate-blue tile roof, cream plaster upper walls, dark wood lower facade, rectangular timber entrance, a short L-shaped cobblestone access path separating it from street with low stone wall and open gate. Do not make a fantasy academy or mansion. Waver's house is about two thirds along the lane, set back on the left, its open access path and doorway must be readable. A quiet right-side stone wall with broad open sidewalk and a different small ordinary tiled house. Preserve a little of the shared cream wall corner and modest gray utility pole with narrow yellow/black sleeve at the near residential junction. Zelkova with airy branching rather than identical round camphor trees, a small green Japanese maple, low ferns and moss along stone bases, restrained white bellflowers by the bookshop and pale blue hydrangea only by the rental house. Clear empty pavement around both doors and along both curbs; no pots, bike, furniture or tree trunk blocking paths. Sunlit areas warm cream and soft neutral asphalt, chromatic blue-gray shade, quiet summer greens. Soft grouped leaf shadows, warm wall bounce and natural sky fill, consistent with reference. Broad painted forms, refined entrance details, low-contrast road grain, no sharp glittery foliage, ornate asphalt pattern, yellow sparkles, all-over fog, desaturation or blur. CAMERA: high oblique about 35 degrees downward, clear roof surfaces and wall faces, same readable game viewpoint as reference. One coherent 16:9 landscape, no people, characters, interface, labels, lettering, logos, watermark, pixel art, photorealistic 3D render or collage. Target largest native 3840x2160 detail if available, no upscaling.
```

## 沿路：实际提示词

参考顺序：本轮斜俯原画、已确认的住宅坂柔和斜俯原画。

```text
Use case: style-transfer. Repaint Image 1's exact same OLD STREET as the INTERMEDIATE ALONG-ROAD camera of a 2.5D game. Image 2 is only the approved soft Japanese animation background style reference. Preserve Image 1's location identity and near-to-far order: LEFT bookshop with faded slate-blue canvas awning and inset timber book displays, then modest two-storey cream-and-weathered-timber rental house with an open timber gate and short L-shaped stone-paved access to its brown entrance, then more distant ordinary cream walls and blue-gray roofs. RIGHT low stone wall, ferns, ordinary house, distinct airy zelkova/green maple silhouettes. The near residential junction has the same gray utility pole, narrow yellow-black sleeve and pale wall corner. Keep both doors and the path to the rental visible and distinct. Road is a gently bending narrow asphalt lane and stone-edged sidewalks, same small set of white bellflowers, blue hydrangea only by rental. Natural modern Japanese residential neighborhood, no fantasy mansion. Change only camera/composition: about 5m above road, about 25 degrees downward and looking forward along the lane from its residential junction. Distinctly lower and more immersive than overhead Image 1, but noticeably higher than human eye height: show some roof and wall tops, road receding in perspective with a broad walkable foreground, whole bookshop entrance and rental gate not cropped or hidden. Single coherent frame, continuous paving before both doors, no props block pathways. Match approved warm summer bounce light, natural sky fill, soft broad tree shadows and restrained fresh greens/slate roofs/cream plaster. Calm foliage masses and low contrast road texture, clear gates and curb bases. No sharp yellow glitter leaves, decorative road carpet, heavy black lines, photorealistic textures, blanket blur, haze or desaturation. Whole complete opaque 16:9 native landscape background, not a stretched/rotated input or building collage. No people, characters, labels, UI, text, logos or watermark. Highest genuine native detail, target 3840x2160 if available without upscaling.
```

## 平视：最终选用的实际修正提示词

参考：初次生成的完整平视图。初版未选用；本次校正整幅透视，不做图片倾斜／剪切变形。

```text
Use case: precise-object-edit. This is a game scene whose HUMAN EYE-LEVEL FORWARD preset must be unmistakably STRAIGHT AHEAD. Repaint only camera alignment/composition of this same complete old Japanese street: its present vanishing point at roughly 63% width is wrong. Put optical camera in the middle of roadway, zero roll, zero yaw relative to straight foreground road, at 1.55m eye height. Vanishing point MUST be at exactly (50% width,50% height), horizontal horizon. Center of foreground roadway at (50% width,100% height), left and right curbs converge symmetrically toward the frame's central vanishing point. This is an ordinary person looking STRAIGHT ahead; NOT oblique sidewalk view, diagonal street, low drone or overhead. Road stays centered throughout, the very slight bend happens only in far background. Preserve the accepted soft fusion Japanese anime background rendering, gentle natural summer light, cream/slate/wood/fresh green relationships, broad chromatic shadows and quiet texture, no sharpening. Keep same places and relative near-to-far order: LEFT near gray utility pole with narrow yellow-black stripe, faded slate-blue awning timber bookshop with readable separate glazed door and recessed book displays; then modest two-storey timber rental home, low natural stone wall, open simple gate and empty paved access ending at actual timber doorway. Both doors fully in frame and connected to a clear continuous sidewalk. RIGHT small tiled Japanese homes and low stone walls, airy zelkova, quiet maple, ferns, restrained flowers. No added objects, people, labels, text, UI, watermark or collage. Redraw the full perspective coherently, do not shear/stretch an existing bitmap. Native widescreen 16:9, highest genuine native detail without enlargement.
```

## 配准与后续使用

- 原道路和共有路口：`source/lib/fate-city-art-scenes.ts`。
- 每张实际铺装、路沿、门槛：`source/lib/fate-city-old-ground.ts`。
- 共享地面映射与投影往返：`source/lib/fate-city-art-registration.ts`。
- 路径、碰撞与体型归一计速：`source/lib/fate-city-art-navigation.ts`。
- 场景过渡、预加载与交互：`source/components/fate-city-art.tsx`。
- 地图只高亮实际覆盖的北段，南段及娜塔莉亚住宅不标记为已绘制。
- 实际运行、验证与剩余边界见[冬木2.5D扩展](../fuyuki-25d-expansion.md)。继续以原地图为依据，不把生成图中的构图距离当成原作比例。
