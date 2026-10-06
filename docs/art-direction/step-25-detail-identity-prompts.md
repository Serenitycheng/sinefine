# 第25条第十轮：融合版街区辨识度与精修提示词

2026-10-06，仅在 `feat/art-samples` 的现有住宅街区试点使用。使用内置 **image_gen** 编辑已有画稿，未使用 CLI/API 备用模式。主街、小巷、林荫支路仍共享已确认的日式动画背景画风；植物、门窗材质与局部饰纹负责区分地点，不靠全局滤镜或改变道路布局。

## 地点风貌

- 主街住宅：暖杉木、米白院墙、樟树与白栀子；木门细木纹、低调黄铜配件、陶盆叶纹。
- 主街咖啡店：蓝灰雨篷细滚边、焦糖木窗、铜灯、珊瑚色天竺葵与香草。保留门前黑板、自行车和原花盆位置。
- 小巷：蕨类、常春藤、墙缝薄苔与少量白花；巷口延续栀子/咖啡店的花木，远端蓝花提示支路，铺石中央保持开放。
- 林荫支路住宅：蓝紫绣球、苔绿百叶、暖木门与粉蓝釉陶盆；其他住宅以靛灰木色、浅石墙、银杏/枫叶及无花蕨类区分。
- 支路街角店：灰鼠尾草绿窗框、蜂蜜木色、陶盆白色玛格丽特，与主街咖啡店的珊瑚花区分。
- 长椅小庭：粉色皋月杜鹃、扇形叶片、旧木长椅与灰绿金属；入口铺装保留。

## 生产范围与保留项

- 只更新七幅完整2D背景及其素材引用；人物、行走、寻路、碰撞、地点坐标、镜头、UI布局、生活、AI、存档与3D对照不随本轮调整。
- 最终背景保存在 `source/public/fate/art-sample/`。旧v1画稿保留回退；本轮统一加花的草稿不作为最终方向，不接入游戏。
- 当前七张最终画稿均为1672×941，与逻辑画布一致。第一轮主街中间稿为1671×941，已由后续内置生成稿替换；没有另用Python或图像库修改生成图。
- 生成图片已逐张查看；额外使用只读像素边缘比对检查门口、井盖、排水口和墙脚位置。比对不能替代实际路线验收，也不等于整幅图逐像素一致。
- 修改前备份：`D:/projects/sinefine-backups/art-detail-20261006-v10`。本轮未采用的v2/v3/v4中间稿归档到其 `discarded-drafts` 子目录，不作为额外背景留在公共素材目录；原始生成结果保留在以下路径。下方“编辑输入1”记录实际生成时的位置，旧稿现可从该备份或原始输出找回。

## 最终采用：光影与树种修正

- 用户追加反馈：树影过碎、光影不自然，树种和树冠过于单一。最终版减少均匀铺满的碎影，保留有方向的冠影、连贯枝影和安静的受光地面；并按叶形、枝条与冠层密度区分树种。
- 主街：樟树长椭圆叶、榉树细锯齿叶与更通透的枝条、前景绿枫的尖裂叶；支路：长椅处扇形银杏、住宅庭院细枫叶、远处松针层次。配合蕨、常春藤、窄叶草与花灌木，保持各地点既有花色和材料。
- 以下七幅为当前接入的最终稿，均为1672×941且不透明。以上一次中间稿为编辑目标，以新主街斜俯稿作光影/树种参考，不复制参考图的建筑或视角。

### 主街斜俯光影与树种

- 当前素材：`source/public/fate/art-sample/residential-cafe-v5.png`
- 编辑输入1：`source/public/fate/art-sample/residential-cafe-v4.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-7eb415d7-8e34-459b-8589-e48ebf72ed70.png`

```text
Use case: precise-object-edit. This is the existing approved 2D residential street game painting, NOT a new scene. Keep its exact camera, framing, building footprints, roofs, walls, gates, sidewalk, street, drains, the ONE manhole, poles/wires, bicycle, chalkboard, pots, landmarks and ALL open walking space pixel aligned. Refine environment art ONLY. Full opaque landscape canvas about 1672x941, no crop/reframe.
The user finds the current lighting unnatural and the trees too uniform. Make a substantive, coherent LIGHTING AND TREE DIVERSITY pass while retaining the approved warm hand-painted Japanese anime background fusion style (cinematic but readable, refined animation linework, gentle painterly edges, vivid natural greens, cream Japanese homes and blue-grey roofs). No photorealism, 3D/plastic, pixel art, fantasy school/town, global desaturation or blur.
LIGHTING: Clear early-summer afternoon with a single directional sun consistent across roofs, facades and ground. Replace the current repetitive high-contrast golden leaf-speckle carpet with broader, coherent canopy silhouettes and irregular pools of sunlight. Leave several large quiet uninterrupted sunlit road areas; dapple only near actual tree canopies. Branches cast believable connected shadows, not scattered star/flower stamps. Shadow penumbra softens farther from leaves, sharper only by a nearby wall or hedge. Shaded road is gentle cool blue-grey with sky fill; sunlit stone cream neutral, not orange. Restrained highlight rolloff, subtle contact shade at wall feet and pots, no black holes, blooming glow, muddy flatness or conspicuous repeated pattern. Maintain depth and the established bright colorful animation background palette.
TREE VARIETY within existing canopy footprints: the left/upper residential garden tree is a mature CAMPHOR, rounded irregular crown with long glossy oval leaves, restrained dark evergreen clusters and a few visible thick branches; the cafe's existing taller tree mass is airy JAPANESE ZELKOVA, finer serrated oval leaves, upright spreading branches with visible gaps and light filtering through; foreground garden foliage has small JAPANESE MAPLE leaves with distinct five-to-seven pointed lobes and delicate layered branches, naturally green in early summer. These must look like different species and crown structures, not the same leaf stamps recolored. Modest branch/crown irregularity within the existing vegetation footprint, no new trees or trunk obstacles on paths. Smaller background tree detail quieter. Understory contrasts glossy gardenia, narrow grasses and tiny ferns, not flower clusters on every shrub.
Keep current place identities: near home rich warm cedar gate/shutters, ivory limestone/plaster, restrained brass and small white gardenias only in selected shrubs; cafe caramel oak, blue-grey awning with subtle cream stitched hem, existing copper lamp and modest coral-red geranium/herb pots. Retain their count/locations, bicycle, blank A-frame chalkboard, single manhole and clear approaches. White gardenia blossoms realistically smaller and clustered, not oversized daisies scattered everywhere. Keep all geometry and existing collision/doorway positions. No people, writing, UI, collaged separate buildings, extra furniture or new road objects.
```

### alley

- 当前素材：`source/public/fate/art-sample/cafe-alley-facing-v4.png`
- 编辑输入1：`D:/projects/sinefine-recovery/source/public/fate/art-sample/cafe-alley-facing-v3.png`
- 编辑输入2（仅参考画风、光影和树种）：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-7eb415d7-8e34-459b-8589-e48ebf72ed70.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-934a2fcb-06c0-4c8b-a64d-44c212e4080d.png`

```text
Use case: precise-object-edit. Input 1 is the existing painted game view to EDIT. Input 2 is ONLY the approved refined lighting/tree-species reference from the same neighborhood; do NOT copy its camera or layout. Keep input 1 exact camera, framing, building footprints, walls/gates, roofs, sidewalk/curbs, drain and single manhole count/position, poles/wires, bicycle, chalkboard, pots, bench, open pathways and doorway approaches. Pixel-aligned structure, same full opaque 1672x941 framing, no crop/zoom/reframe, no people or text/UI, no collaged buildings or new obstacles.
Preserve the approved warm refined Japanese anime-background fusion style: clean animation linework, gentle painterly edges, vibrant natural foliage, cream homes, blue-grey roofs. NOT photorealism, pixel, 3D/plastic, fantasy academy, monochrome low saturation, blur or bloom.
Correct the overly busy unnatural lighting: match input 2's clear early-summer directional afternoon daylight, broader connected canopy shadow masses with visible branches, irregular QUIET pools of sunlight and gentle cool-blue-grey sky-filled shade. Stop covering the whole road, walls and paving with evenly repeated golden star/flower-shaped speckles. Several broad road/paving areas should be calm and readable. Dapples concentrated under real canopies, variable penumbra softening with distance from leaves; contact shade only at existing wall feet/pots. Restrained highlights, no near-black shadow holes, orange wash or flat overcast treatment. Trees have distinct species, irregular layered branches and gaps, not the same clustered oval leaf stamp everywhere. Maintain all ground geometry and surfaces; keep road manholes/drains EXACT original count and silhouettes, no duplicated outline. Preserve each building's already differentiated finishes and plant palette; use smaller believable flowers, not flowers on every bush.
This is the sheltered ALLEY between the main home and cafe. Give the existing near home canopy a mature CAMPHOR structure (long glossy oval leaves, readable branches), existing cafe-side tree a fine airy ZELKOVA structure (small serrated leaves and irregular gaps), far corner a subtle GREEN GINKGO fan-leaf texture transitioning to the side street. Understory keeps clearly distinct segmented fern fronds, rounded aucuba-like glossy shrubs, fine ivy and narrow monkey grass; no uniform leaf carpet. Preserve sparse white gardenia at main entrance, coral cafe geranium pots, only small hints of blue hydrangea near far bend. Alley light is more sheltered, warm sunlight at openings and calm sky-filled middle shade; keep a broad continuous readable strip of paving, not identical dapples stamped from front to back. Existing gate/sidewalk/turn all unchanged.
```

### main_along

- 当前素材：`source/public/fate/art-sample/main-road-along-v4.png`
- 编辑输入1：`D:/projects/sinefine-recovery/source/public/fate/art-sample/main-road-along-v3.png`
- 编辑输入2（仅参考画风、光影和树种）：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-7eb415d7-8e34-459b-8589-e48ebf72ed70.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-6f063baa-038c-4360-94ac-f34e817c3c64.png`

```text
Use case: precise-object-edit. Input 1 is the existing painted game view to EDIT. Input 2 is ONLY the approved refined lighting/tree-species reference from the same neighborhood; do NOT copy its camera or layout. Keep input 1 exact camera, framing, building footprints, walls/gates, roofs, sidewalk/curbs, drain and single manhole count/position, poles/wires, bicycle, chalkboard, pots, bench, open pathways and doorway approaches. Pixel-aligned structure, same full opaque 1672x941 framing, no crop/zoom/reframe, no people or text/UI, no collaged buildings or new obstacles.
Preserve the approved warm refined Japanese anime-background fusion style: clean animation linework, gentle painterly edges, vibrant natural foliage, cream homes, blue-grey roofs. NOT photorealism, pixel, 3D/plastic, fantasy academy, monochrome low saturation, blur or bloom.
Correct the overly busy unnatural lighting: match input 2's clear early-summer directional afternoon daylight, broader connected canopy shadow masses with visible branches, irregular QUIET pools of sunlight and gentle cool-blue-grey sky-filled shade. Stop covering the whole road, walls and paving with evenly repeated golden star/flower-shaped speckles. Several broad road/paving areas should be calm and readable. Dapples concentrated under real canopies, variable penumbra softening with distance from leaves; contact shade only at existing wall feet/pots. Restrained highlights, no near-black shadow holes, orange wash or flat overcast treatment. Trees have distinct species, irregular layered branches and gaps, not the same clustered oval leaf stamp everywhere. Maintain all ground geometry and surfaces; keep road manholes/drains EXACT original count and silhouettes, no duplicated outline. Preserve each building's already differentiated finishes and plant palette; use smaller believable flowers, not flowers on every bush.
For this MAIN STREET view, preserve main-neighborhood identities and align species with input 2: home courtyard mature CAMPHOR with long glossy oval leaves and thick irregular branches, cafe's taller foliage airy JAPANESE ZELKOVA with fine serrated oval leaves and spreading branch structure, near foreground gardens fine JAPANESE MAPLE with recognizable five-to-seven pointed GREEN lobes and layered twigs. Keep each existing trunk/canopy in its footprint; modest foliage edge irregularity without invading walkway. Understory contrasts small gardenia glossy leaves, narrow grass and ferns. Home keeps warm cedar, ivory wall, restrained brass and SMALL WHITE GARDENIA clusters only where originally planted. Cafe retains stitched blue-grey awning, caramel oak, copper lamp, restrained CORAL GERANIUMS/herbs in its original pots. Bicycle/chalkboard and clear doorway unchanged. This is the higher ALONG-ROAD main street view; preserve its higher camera and exact curb perspective.
```

### main_eye

- 当前素材：`source/public/fate/art-sample/main-road-eye-v4.png`
- 编辑输入1：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-5eaf9849-0f69-4d08-a08c-f8a590b76778.png`
- 编辑输入2（仅参考画风、光影和树种）：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-7eb415d7-8e34-459b-8589-e48ebf72ed70.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-9117b0c1-734a-4cb3-aba9-c2decfe0852f.png`

```text
Use case: precise-object-edit. Input 1 is the existing painted game view to EDIT. Input 2 is ONLY the approved refined lighting/tree-species reference from the same neighborhood; do NOT copy its camera or layout. Keep input 1 exact camera, framing, building footprints, walls/gates, roofs, sidewalk/curbs, drain and single manhole count/position, poles/wires, bicycle, chalkboard, pots, bench, open pathways and doorway approaches. Pixel-aligned structure, same full opaque 1672x941 framing, no crop/zoom/reframe, no people or text/UI, no collaged buildings or new obstacles.
Preserve the approved warm refined Japanese anime-background fusion style: clean animation linework, gentle painterly edges, vibrant natural foliage, cream homes, blue-grey roofs. NOT photorealism, pixel, 3D/plastic, fantasy academy, monochrome low saturation, blur or bloom.
Correct the overly busy unnatural lighting: match input 2's clear early-summer directional afternoon daylight, broader connected canopy shadow masses with visible branches, irregular QUIET pools of sunlight and gentle cool-blue-grey sky-filled shade. Stop covering the whole road, walls and paving with evenly repeated golden star/flower-shaped speckles. Several broad road/paving areas should be calm and readable. Dapples concentrated under real canopies, variable penumbra softening with distance from leaves; contact shade only at existing wall feet/pots. Restrained highlights, no near-black shadow holes, orange wash or flat overcast treatment. Trees have distinct species, irregular layered branches and gaps, not the same clustered oval leaf stamp everywhere. Maintain all ground geometry and surfaces; keep road manholes/drains EXACT original count and silhouettes, no duplicated outline. Preserve each building's already differentiated finishes and plant palette; use smaller believable flowers, not flowers on every bush.
For this MAIN STREET view, preserve main-neighborhood identities and align species with input 2: home courtyard mature CAMPHOR with long glossy oval leaves and thick irregular branches, cafe's taller foliage airy JAPANESE ZELKOVA with fine serrated oval leaves and spreading branch structure, near foreground gardens fine JAPANESE MAPLE with recognizable five-to-seven pointed GREEN lobes and layered twigs. Keep each existing trunk/canopy in its footprint; modest foliage edge irregularity without invading walkway. Understory contrasts small gardenia glossy leaves, narrow grass and ferns. Home keeps warm cedar, ivory wall, restrained brass and SMALL WHITE GARDENIA clusters only where originally planted. Cafe retains stitched blue-grey awning, caramel oak, copper lamp, restrained CORAL GERANIUMS/herbs in its original pots. Bicycle/chalkboard and clear doorway unchanged. This is the EYE-LEVEL main street view; keep its distant vanishing point, vertical facades and ALL walkway locations exactly. There is ONE round manhole at x~995,y~569. Preserve it; no extra circular discs or repeated covers to its right.
```

### neighborhood

- 当前素材：`source/public/fate/art-sample/leafy-lane-v4.png`
- 编辑输入1：`D:/projects/sinefine-recovery/source/public/fate/art-sample/leafy-lane-v3.png`
- 编辑输入2（仅参考画风、光影和树种）：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-7eb415d7-8e34-459b-8589-e48ebf72ed70.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-be1c243f-9db3-4550-a8b4-47abba5bbb13.png`

```text
Use case: precise-object-edit. Input 1 is the existing painted game view to EDIT. Input 2 is ONLY the approved refined lighting/tree-species reference from the same neighborhood; do NOT copy its camera or layout. Keep input 1 exact camera, framing, building footprints, walls/gates, roofs, sidewalk/curbs, drain and single manhole count/position, poles/wires, bicycle, chalkboard, pots, bench, open pathways and doorway approaches. Pixel-aligned structure, same full opaque 1672x941 framing, no crop/zoom/reframe, no people or text/UI, no collaged buildings or new obstacles.
Preserve the approved warm refined Japanese anime-background fusion style: clean animation linework, gentle painterly edges, vibrant natural foliage, cream homes, blue-grey roofs. NOT photorealism, pixel, 3D/plastic, fantasy academy, monochrome low saturation, blur or bloom.
Correct the overly busy unnatural lighting: match input 2's clear early-summer directional afternoon daylight, broader connected canopy shadow masses with visible branches, irregular QUIET pools of sunlight and gentle cool-blue-grey sky-filled shade. Stop covering the whole road, walls and paving with evenly repeated golden star/flower-shaped speckles. Several broad road/paving areas should be calm and readable. Dapples concentrated under real canopies, variable penumbra softening with distance from leaves; contact shade only at existing wall feet/pots. Restrained highlights, no near-black shadow holes, orange wash or flat overcast treatment. Trees have distinct species, irregular layered branches and gaps, not the same clustered oval leaf stamp everywhere. Maintain all ground geometry and surfaces; keep road manholes/drains EXACT original count and silhouettes, no duplicated outline. Preserve each building's already differentiated finishes and plant palette; use smaller believable flowers, not flowers on every bush.
For the SIDE LANE preserve its own identity, not main-street white gardenias: the existing bench garden tree becomes GREEN SUMMER GINKGO with unmistakable fan-shaped leaves on spaced branching tiers, visible trunk and irregular air gaps. The existing courtyard tree behind the hydrangea home is fine JAPANESE MAPLE with green five-to-seven-lobed leaves and a few subtle bronze fresh tips, not a uniformly orange autumn tree. Existing farther evergreen tree mass has JAPANESE BLACK PINE needle-cluster texture and irregular branch layers, quieter in distance, no new trunks anywhere. Other foreground greenery combines glossy deep-green shrubs, narrow leaves and small ferns. Different species must have different leaf shape, crown density and branching, not just different colors. Keep home BLUE/VIOLET HYDRANGEA with broad serrated leaves, moss-green shutters, cedar gate and powder-blue glazed original pot; side shop sage-teal/honey wood and small WHITE MARGUERITE DAISIES in original ochre pots; bench garden modest PINK SATSUKI AZALEA with small oval leaves, aged wooden bench and sage metal. Smaller naturally grouped flowers, paved bench entrance wide open. This is the OBLIQUE OVERVIEW of the side lane junction; preserve the T junction shape and front entrance passage.
```

### leafy_along

- 当前素材：`source/public/fate/art-sample/leafy-road-along-v4.png`
- 编辑输入1：`D:/projects/sinefine-recovery/source/public/fate/art-sample/leafy-road-along-v3.png`
- 编辑输入2（仅参考画风、光影和树种）：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-7eb415d7-8e34-459b-8589-e48ebf72ed70.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-b112c98f-dd5f-4a21-ad03-1e154c7bb469.png`

```text
Use case: precise-object-edit. Input 1 is the existing painted game view to EDIT. Input 2 is ONLY the approved refined lighting/tree-species reference from the same neighborhood; do NOT copy its camera or layout. Keep input 1 exact camera, framing, building footprints, walls/gates, roofs, sidewalk/curbs, drain and single manhole count/position, poles/wires, bicycle, chalkboard, pots, bench, open pathways and doorway approaches. Pixel-aligned structure, same full opaque 1672x941 framing, no crop/zoom/reframe, no people or text/UI, no collaged buildings or new obstacles.
Preserve the approved warm refined Japanese anime-background fusion style: clean animation linework, gentle painterly edges, vibrant natural foliage, cream homes, blue-grey roofs. NOT photorealism, pixel, 3D/plastic, fantasy academy, monochrome low saturation, blur or bloom.
Correct the overly busy unnatural lighting: match input 2's clear early-summer directional afternoon daylight, broader connected canopy shadow masses with visible branches, irregular QUIET pools of sunlight and gentle cool-blue-grey sky-filled shade. Stop covering the whole road, walls and paving with evenly repeated golden star/flower-shaped speckles. Several broad road/paving areas should be calm and readable. Dapples concentrated under real canopies, variable penumbra softening with distance from leaves; contact shade only at existing wall feet/pots. Restrained highlights, no near-black shadow holes, orange wash or flat overcast treatment. Trees have distinct species, irregular layered branches and gaps, not the same clustered oval leaf stamp everywhere. Maintain all ground geometry and surfaces; keep road manholes/drains EXACT original count and silhouettes, no duplicated outline. Preserve each building's already differentiated finishes and plant palette; use smaller believable flowers, not flowers on every bush.
For the SIDE LANE preserve its own identity, not main-street white gardenias: the existing bench garden tree becomes GREEN SUMMER GINKGO with unmistakable fan-shaped leaves on spaced branching tiers, visible trunk and irregular air gaps. The existing courtyard tree behind the hydrangea home is fine JAPANESE MAPLE with green five-to-seven-lobed leaves and a few subtle bronze fresh tips, not a uniformly orange autumn tree. Existing farther evergreen tree mass has JAPANESE BLACK PINE needle-cluster texture and irregular branch layers, quieter in distance, no new trunks anywhere. Other foreground greenery combines glossy deep-green shrubs, narrow leaves and small ferns. Different species must have different leaf shape, crown density and branching, not just different colors. Keep home BLUE/VIOLET HYDRANGEA with broad serrated leaves, moss-green shutters, cedar gate and powder-blue glazed original pot; side shop sage-teal/honey wood and small WHITE MARGUERITE DAISIES in original ochre pots; bench garden modest PINK SATSUKI AZALEA with small oval leaves, aged wooden bench and sage metal. Smaller naturally grouped flowers, paved bench entrance wide open. This is the higher ALONG-ROAD side lane view; keep the exact camera, road corridor and bench entrance projection.
```

### leafy_eye

- 当前素材：`source/public/fate/art-sample/leafy-road-eye-v4.png`
- 编辑输入1：`D:/projects/sinefine-recovery/source/public/fate/art-sample/leafy-road-eye-v3.png`
- 编辑输入2（仅参考画风、光影和树种）：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-7eb415d7-8e34-459b-8589-e48ebf72ed70.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-10b73e22-27ba-4253-8733-4c1fa057c573.png`

```text
Use case: precise-object-edit. Input 1 is the existing painted game view to EDIT. Input 2 is ONLY the approved refined lighting/tree-species reference from the same neighborhood; do NOT copy its camera or layout. Keep input 1 exact camera, framing, building footprints, walls/gates, roofs, sidewalk/curbs, drain and single manhole count/position, poles/wires, bicycle, chalkboard, pots, bench, open pathways and doorway approaches. Pixel-aligned structure, same full opaque 1672x941 framing, no crop/zoom/reframe, no people or text/UI, no collaged buildings or new obstacles.
Preserve the approved warm refined Japanese anime-background fusion style: clean animation linework, gentle painterly edges, vibrant natural foliage, cream homes, blue-grey roofs. NOT photorealism, pixel, 3D/plastic, fantasy academy, monochrome low saturation, blur or bloom.
Correct the overly busy unnatural lighting: match input 2's clear early-summer directional afternoon daylight, broader connected canopy shadow masses with visible branches, irregular QUIET pools of sunlight and gentle cool-blue-grey sky-filled shade. Stop covering the whole road, walls and paving with evenly repeated golden star/flower-shaped speckles. Several broad road/paving areas should be calm and readable. Dapples concentrated under real canopies, variable penumbra softening with distance from leaves; contact shade only at existing wall feet/pots. Restrained highlights, no near-black shadow holes, orange wash or flat overcast treatment. Trees have distinct species, irregular layered branches and gaps, not the same clustered oval leaf stamp everywhere. Maintain all ground geometry and surfaces; keep road manholes/drains EXACT original count and silhouettes, no duplicated outline. Preserve each building's already differentiated finishes and plant palette; use smaller believable flowers, not flowers on every bush.
For the SIDE LANE preserve its own identity, not main-street white gardenias: the existing bench garden tree becomes GREEN SUMMER GINKGO with unmistakable fan-shaped leaves on spaced branching tiers, visible trunk and irregular air gaps. The existing courtyard tree behind the hydrangea home is fine JAPANESE MAPLE with green five-to-seven-lobed leaves and a few subtle bronze fresh tips, not a uniformly orange autumn tree. Existing farther evergreen tree mass has JAPANESE BLACK PINE needle-cluster texture and irregular branch layers, quieter in distance, no new trunks anywhere. Other foreground greenery combines glossy deep-green shrubs, narrow leaves and small ferns. Different species must have different leaf shape, crown density and branching, not just different colors. Keep home BLUE/VIOLET HYDRANGEA with broad serrated leaves, moss-green shutters, cedar gate and powder-blue glazed original pot; side shop sage-teal/honey wood and small WHITE MARGUERITE DAISIES in original ochre pots; bench garden modest PINK SATSUKI AZALEA with small oval leaves, aged wooden bench and sage metal. Smaller naturally grouped flowers, paved bench entrance wide open. This is the EYE-LEVEL side lane; keep all facade verticals, distant vanishing point, broad open foreground and clear front road. Never alter the ground corridor to add trees.
```

### 平视主街井盖修正（中间稿）

- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-5eaf9849-0f69-4d08-a08c-f8a590b76778.png`；随后作为 `main-road-eye-v4.png` 的编辑输入，未另作当前素材。

```text
Use case: precise-object-edit. Input image 1 is the final refined main street eye-level painting to KEEP; input image 2 is the original identical street, used ONLY as a count and position reference for the road manhole. Make one narrowly localized correction on input 1: keep the single original round manhole at approximately x=995,y=569, unchanged shape and exact position. Remove the extra faint overlapping manhole outlines and repeated discs to its RIGHT at approximately x=1150,y=578. Restore ONLY that right-hand small road patch to the uninterrupted warm blue-grey road texture and coherent dappled tree shadows from input 2. Do not add or move any objects, not even flowers or pots. Everything outside that tiny road patch must remain identical to input 1: white gardenias and glossy leaves at homes, cedar and brass accents, cafe coral geraniums, caramel oak, stitched blue-grey awning, all trees, sky, buildings, pavement, the single original manhole, gates, bicycle, door approaches and perspective. Preserve the approved warm hand-painted Japanese animation-background fusion style, no global color changes, no photo/3D/pixel style, no new writing or UI. Output the same full opaque 1672 x 941 framing, no crop or reframe.
```

## 第一轮地点风貌提示词（中间稿）

每一项下方为实际提交给内置工具的完整提示词。输入1为该取景的编辑目标，输入2（有时存在）只作画风/地点风貌参考；不通过拼接图片实现新建筑。

### residential （地点风貌参考中间稿，最终以主街道具修正版为准）

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/residential-cafe-v3.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-c99badfa-8ed4-47fa-9d41-d0a4fd6a00b6.png`

```text
Use case: precise-object-edit.
Asset type: polished 2D game street painting, local environmental identity pass.
Input image 1 is the edit target. Work over the exact approved 1672 x 941 painting, identical camera and framing, no reframing, zoom, mirroring or relayout. Preserve every structural silhouette, roof, doorway, wall top/base, pole, bicycle, bench, pot footprint, curb, road line, drain and the entire walkable ground in its exact pixel position. Buildings can gain distinct SURFACE finishes on existing parts, not new footprint or new architecture.
Keep the approved fusion Japanese anime-background style: warmly lit ordinary Japanese residential streets, clean hand-painted linework, gentle edges, vibrant natural botanical forms, dimensional cool tree shadows, cream walls, blue-grey tiled roofs. Do not become photorealistic, pixel art, fantasy village, European academy, 3D/plastic, low-saturation wash or bloom.
This is a substantial LOCATION CHARACTER pass within the existing painting: different places should have recognizably different plants, flower palettes and crafted facade accents, NOT identical blue/pink bouquets pasted beside every building. Retain layered delicate leaves and selective veins, near detail and quiet distance. Keep all original broad light/shadow patterns. No people, writing, UI, collage, new traffic, new physical obstacles, flower carpets or clutter over paths. Canvas remains opaque 1672 x 941.
Main street identity: a traditional warm cedar-and-ivory residential street, distinguished by WHITE GARDENIA flowers and glossy dark green elliptical leaves, tall camphor canopy with finer long leaves. Replace most blue/purple/pink hydrangea spots in this image with white gardenia, not a mixed botanical collection everywhere. Keep gardenias mostly behind the cream home courtyard wall and in a few existing low green patches.
The modest near one-storey Japanese home has rich warm cedar grain on the existing wooden gate and shutters, a lightly aged ivory plaster wall with fine limestone joints, subdued brass on its existing doorbell/mailbox fittings. Its existing gate-side pots are plain warm stoneware with a narrow engraved leaf band, white gardenia and quiet greenery. Same shapes and positions.
The two-storey cafe keeps the exact BLUE-GREY AWNING as its recognition landmark, but gains a delicate cream double stitch/stripe ONLY on the hem, warm caramel oak on its existing timber window/door frames and little copper patina on the existing lamp. Its EXISTING pots feature herbs/ferns and modest CORAL-RED GERANIUMS in terracotta; no hydrangea, no random flowers elsewhere on the cafe facade. Distinguish its flower colors from the quiet white home garden. Existing shop-window objects can become legible small ceramic cups, no added furniture outside.
Across the road, the existing foreground residences keep their roofs and silhouettes but have simpler cool-grey fence timber, neat grasses and white flowers within existing gardens, no cafe decoration. Clearly recognizable inhabited Japanese buildings, elegant restraint, not picturesque fantasy overgrowth.
```

### residential_fix 

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/residential-cafe-v4.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-cb3eb680-d4de-4c0e-aec8-49c5cb60ac16.png`

```text
Use case: precise-object-edit. Input 1 is the current refined main-street painting to KEEP. Input 2 is the original same street used ONLY to check the cafe's original sidewalk props.
Make ONE narrowly targeted correction in input 1's top-right cafe entrance area: restore the small dark blank A-frame chalkboard to the exact input 2 location near x=1370,y=295, between the cafe door and its right planter. The original pots, bicycle and doorway have to match input 2's ORIGINAL count, footprints and positions. Remove the newly introduced extra standalone fern pot currently between the cafe door and right flower pot if it occupies the chalkboard space. Keep original pots with the current coral geraniums, fine leaf/wave engraving, original shapes; retain any fern detail inside ORIGINAL pots only. The empty sidewalk and door approach remain exactly like input 2.
Do not repaint any other area. Preserve input 1's white gardenia home gardens, richer camphor leaves, cedar gate, brass fixtures, cafe warm oak, coral flowers and stitched blue-grey awning. Every building, pavement/curb, roof, canopy, manhole, shadow, wire and pole outside this tiny cafe prop correction stays IDENTICAL to input 1. Same full opaque 1672x941 canvas and pixel-aligned framing, same warm hand-painted Japanese anime-background fusion style. No people, writing, UI, collage, global color/lighting changes or new objects.
```

### alley 

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/cafe-alley-facing-v3.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-1d94043e-9144-4278-937a-ddd1f153df84.png`

```text
Use case: precise-object-edit.
Asset type: polished 2D game street painting, local environmental identity pass.
Input image 1 is the edit target. Work over the exact approved 1672 x 941 painting, identical camera and framing, no reframing, zoom, mirroring or relayout. Preserve every structural silhouette, roof, doorway, wall top/base, pole, bicycle, bench, pot footprint, curb, road line, drain and the entire walkable ground in its exact pixel position. Buildings can gain distinct SURFACE finishes on existing parts, not new footprint or new architecture.
Keep the approved fusion Japanese anime-background style: warmly lit ordinary Japanese residential streets, clean hand-painted linework, gentle edges, vibrant natural botanical forms, dimensional cool tree shadows, cream walls, blue-grey tiled roofs. Do not become photorealistic, pixel art, fantasy village, European academy, 3D/plastic, low-saturation wash or bloom.
This is a substantial LOCATION CHARACTER pass within the existing painting: different places should have recognizably different plants, flower palettes and crafted facade accents, NOT identical blue/pink bouquets pasted beside every building. Retain layered delicate leaves and selective veins, near detail and quiet distance. Keep all original broad light/shadow patterns. No people, writing, UI, collage, new traffic, new physical obstacles, flower carpets or clutter over paths. Canvas remains opaque 1672 x 941.
Alley identity: a quieter SHADED FERN AND MOSS passage connecting the warm gardenia main street to the hydrangea side street. The exact existing clear center stone path and upper bend remain completely untouched. Make this lane's planting read as distinctive feathery ferns, climbing ivy and a few tiny WHITE VIOLETS, with deeper forest-green shade in existing foliage, not repeated hydrangea bouquets on both walls.
At the near left home boundary retain creamy aged limestone and warm cedar gate/fence grain, with only a few white GARDENIA flowers near the main-street entrance in existing planting. Along the inner walls replace most blue/pink flower clusters with delicate ferns and rounded ivy leaves, fine restrained moss INSIDE existing wall/stone joints. No new vines over walking ground. Keep original sunlight and leaf shadow rhythm along all paving.
The cafe at the near RIGHT edge is the same main-street cafe: existing warm caramel oak frames, unchanged blue-grey awning with a delicate cream stitched hem, small copper patina on existing lamp. Its existing pots hold herbs/ferns and modest CORAL GERANIUMS, same original footprints. At the far bend let just a small cool BLUE hydrangea accent in the EXISTING side planting hint at the neighborhood ahead, not all along the alley.
Make the passage calm and inhabited through material craftsmanship, selective leaves and dark/light layering, not by adding clutter, medieval props or replacing geometry.
```

### neighborhood 

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/leafy-lane-v3.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-265e6605-7cbc-4608-a078-2299729468f0.png`

```text
Use case: precise-object-edit.
Asset type: polished 2D game street painting, local environmental identity pass.
Input image 1 is the edit target. Work over the exact approved 1672 x 941 painting, identical camera and framing, no reframing, zoom, mirroring or relayout. Preserve every structural silhouette, roof, doorway, wall top/base, pole, bicycle, bench, pot footprint, curb, road line, drain and the entire walkable ground in its exact pixel position. Buildings can gain distinct SURFACE finishes on existing parts, not new footprint or new architecture.
Keep the approved fusion Japanese anime-background style: warmly lit ordinary Japanese residential streets, clean hand-painted linework, gentle edges, vibrant natural botanical forms, dimensional cool tree shadows, cream walls, blue-grey tiled roofs. Do not become photorealistic, pixel art, fantasy village, European academy, 3D/plastic, low-saturation wash or bloom.
This is a substantial LOCATION CHARACTER pass within the existing painting: different places should have recognizably different plants, flower palettes and crafted facade accents, NOT identical blue/pink bouquets pasted beside every building. Retain layered delicate leaves and selective veins, near detail and quiet distance. Keep all original broad light/shadow patterns. No people, writing, UI, collage, new traffic, new physical obstacles, flower carpets or clutter over paths. Canvas remains opaque 1672 x 941.
Side street identity: a cooler green-and-blue HYDRANGEA residential lane, with a PINK SATSUKI AZALEA pocket garden at the existing bench. Give each building a specific identity while keeping structural silhouettes and all floor geometry unchanged.
The near left small shop has soft SAGE-TEAL paint on its existing wooden storefront trim (keep the awning blue-grey and exactly shaped), honey oak doors, a fine cream stitched hem and a pair of existing textured honey/ochre terracotta pots with IVORY MARGUERITE DAISIES and soft herbs. No hydrangea bouquets on every shop pot.
The first courtyard house after the shop uses the existing warm cedar/dark walnut gate, calm cream plaster and muted MOSS-GREEN shutters where existing shutters are visible. Its garden behind the wall is the main BLUE/VIOLET HYDRANGEA landmark: expressive layered broad serrated leaves and delicate blue flower clusters. The existing pot at its gate is glazed POWDER-BLUE ceramic with a restrained ivory wave band; same exact pot silhouette and footing.
Other homes farther along are differentiated by existing surfaces: one has INDIGO charcoal wood gate/window trim, cooler pale plaster and neat fan-shaped ginkgo leaves; another has warmer grey-beige weathered masonry, maple-like small lobed leaves and mostly flowerless fern planting. Their roof forms, windows, gates and original canopy footprints stay fixed.
The existing right bench garden has warm aged wood bench slats, sage-painted metal legs and a clear uncluttered entrance. Repaint its existing surrounding low shrubs as graceful PINK SATSUKI AZALEAS with separated soft five-petal blooms, dark green smaller leaves, and a few ivory blossoms. Not hydrangeas everywhere. Its existing overhead tree has delicately fanned ginkgo-like foliage within exactly the same silhouette. Only modify plants INSIDE the existing garden bounds, never on its paved entrance.
Keep sunlight, colors and light hierarchy fully consistent with the approved fusion style. Botanical color groups should read clearly: left home cool blue, near shop ivory/ochre, right bench soft pink.
```

### main_along 

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/main-road-along-v3.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-5ea27652-3814-469a-b15f-b77f08e8ca8b.png`

```text
Use case: precise-object-edit.
Asset type: polished 2D game street painting, local environmental identity pass.
Input image 1 is the edit target. Work over the exact approved 1672 x 941 painting, identical camera and framing, no reframing, zoom, mirroring or relayout. Preserve every structural silhouette, roof, doorway, wall top/base, pole, bicycle, bench, pot footprint, curb, road line, drain and the entire walkable ground in its exact pixel position. Buildings can gain distinct SURFACE finishes on existing parts, not new footprint or new architecture.
Keep the approved fusion Japanese anime-background style: warmly lit ordinary Japanese residential streets, clean hand-painted linework, gentle edges, vibrant natural botanical forms, dimensional cool tree shadows, cream walls, blue-grey tiled roofs. Do not become photorealistic, pixel art, fantasy village, European academy, 3D/plastic, low-saturation wash or bloom.
This is a substantial LOCATION CHARACTER pass within the existing painting: different places should have recognizably different plants, flower palettes and crafted facade accents, NOT identical blue/pink bouquets pasted beside every building. Retain layered delicate leaves and selective veins, near detail and quiet distance. Keep all original broad light/shadow patterns. No people, writing, UI, collage, new traffic, new physical obstacles, flower carpets or clutter over paths. Canvas remains opaque 1672 x 941.
Input image 2 is the FINAL LOCATION IDENTITY REFERENCE only, not a second scene to include. Edit only image 1; its exact geometry is authoritative.
Main street identity: a traditional warm cedar-and-ivory residential street, distinguished by WHITE GARDENIA flowers and glossy dark green elliptical leaves, tall camphor canopy with finer long leaves. Replace most blue/purple/pink hydrangea spots in this image with white gardenia, not a mixed botanical collection everywhere. Keep gardenias mostly behind the cream home courtyard wall and in a few existing low green patches.
The modest near one-storey Japanese home has rich warm cedar grain on the existing wooden gate and shutters, a lightly aged ivory plaster wall with fine limestone joints, subdued brass on its existing doorbell/mailbox fittings. Its existing gate-side pots are plain warm stoneware with a narrow engraved leaf band, white gardenia and quiet greenery. Same shapes and positions.
The two-storey cafe keeps the exact BLUE-GREY AWNING as its recognition landmark, but gains a delicate cream double stitch/stripe ONLY on the hem, warm caramel oak on its existing timber window/door frames and little copper patina on the existing lamp. Its EXISTING pots feature herbs/ferns and modest CORAL-RED GERANIUMS in terracotta; no hydrangea, no random flowers elsewhere on the cafe facade. Distinguish its flower colors from the quiet white home garden. Existing shop-window objects can become legible small ceramic cups, no added furniture outside.
Across the road, the existing foreground residences keep their roofs and silhouettes but have simpler cool-grey fence timber, neat grasses and white flowers within existing gardens, no cafe decoration. Clearly recognizable inhabited Japanese buildings, elegant restraint, not picturesque fantasy overgrowth.
View-specific invariants: Keep input 1's elevated view along the asphalt. Preserve its lower-left gate, upper-left cafe and alley, both curbs, all props and road vanishing direction. Input 2 contributes finish, flowers and material character ONLY, NEVER composition or pot/prop arrangement.
Critical prop rule: KEEP the original bicycle, chalkboard, doors and original count/shape/footprint of pots in image 1. Change their surface appearance, never add, remove, shift or replace any prop.
```

### main_eye 

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/main-road-eye-v3.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-d212f7e6-2f28-4d67-a0da-dd7d222d0371.png`

```text
Use case: precise-object-edit.
Asset type: polished 2D game street painting, local environmental identity pass.
Input image 1 is the edit target. Work over the exact approved 1672 x 941 painting, identical camera and framing, no reframing, zoom, mirroring or relayout. Preserve every structural silhouette, roof, doorway, wall top/base, pole, bicycle, bench, pot footprint, curb, road line, drain and the entire walkable ground in its exact pixel position. Buildings can gain distinct SURFACE finishes on existing parts, not new footprint or new architecture.
Keep the approved fusion Japanese anime-background style: warmly lit ordinary Japanese residential streets, clean hand-painted linework, gentle edges, vibrant natural botanical forms, dimensional cool tree shadows, cream walls, blue-grey tiled roofs. Do not become photorealistic, pixel art, fantasy village, European academy, 3D/plastic, low-saturation wash or bloom.
This is a substantial LOCATION CHARACTER pass within the existing painting: different places should have recognizably different plants, flower palettes and crafted facade accents, NOT identical blue/pink bouquets pasted beside every building. Retain layered delicate leaves and selective veins, near detail and quiet distance. Keep all original broad light/shadow patterns. No people, writing, UI, collage, new traffic, new physical obstacles, flower carpets or clutter over paths. Canvas remains opaque 1672 x 941.
Input image 2 is the FINAL LOCATION IDENTITY REFERENCE only, not a second scene to include. Edit only image 1; its exact geometry is authoritative.
Main street identity: a traditional warm cedar-and-ivory residential street, distinguished by WHITE GARDENIA flowers and glossy dark green elliptical leaves, tall camphor canopy with finer long leaves. Replace most blue/purple/pink hydrangea spots in this image with white gardenia, not a mixed botanical collection everywhere. Keep gardenias mostly behind the cream home courtyard wall and in a few existing low green patches.
The modest near one-storey Japanese home has rich warm cedar grain on the existing wooden gate and shutters, a lightly aged ivory plaster wall with fine limestone joints, subdued brass on its existing doorbell/mailbox fittings. Its existing gate-side pots are plain warm stoneware with a narrow engraved leaf band, white gardenia and quiet greenery. Same shapes and positions.
The two-storey cafe keeps the exact BLUE-GREY AWNING as its recognition landmark, but gains a delicate cream double stitch/stripe ONLY on the hem, warm caramel oak on its existing timber window/door frames and little copper patina on the existing lamp. Its EXISTING pots feature herbs/ferns and modest CORAL-RED GERANIUMS in terracotta; no hydrangea, no random flowers elsewhere on the cafe facade. Distinguish its flower colors from the quiet white home garden. Existing shop-window objects can become legible small ceramic cups, no added furniture outside.
Across the road, the existing foreground residences keep their roofs and silhouettes but have simpler cool-grey fence timber, neat grasses and white flowers within existing gardens, no cafe decoration. Clearly recognizable inhabited Japanese buildings, elegant restraint, not picturesque fantasy overgrowth.
View-specific invariants: Keep input 1's exact eye-level view, sky, horizon and broad foreground asphalt. Near left house gate, left side alley, cafe, bicycle, A-frame chalkboard and every pot must retain their original footprints. Input 2 contributes finish and plant palette ONLY. Do not inherit its prop layout. All streetside openings are clear.
Critical prop rule: KEEP the original bicycle, chalkboard, doors and original count/shape/footprint of pots in image 1. Change their surface appearance, never add, remove, shift or replace any prop.
```

### leafy_along 

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/leafy-road-along-v3.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-65ed51b3-041b-492c-bc42-94d9b87e661b.png`

```text
Use case: precise-object-edit.
Asset type: polished 2D game street painting, local environmental identity pass.
Input image 1 is the edit target. Work over the exact approved 1672 x 941 painting, identical camera and framing, no reframing, zoom, mirroring or relayout. Preserve every structural silhouette, roof, doorway, wall top/base, pole, bicycle, bench, pot footprint, curb, road line, drain and the entire walkable ground in its exact pixel position. Buildings can gain distinct SURFACE finishes on existing parts, not new footprint or new architecture.
Keep the approved fusion Japanese anime-background style: warmly lit ordinary Japanese residential streets, clean hand-painted linework, gentle edges, vibrant natural botanical forms, dimensional cool tree shadows, cream walls, blue-grey tiled roofs. Do not become photorealistic, pixel art, fantasy village, European academy, 3D/plastic, low-saturation wash or bloom.
This is a substantial LOCATION CHARACTER pass within the existing painting: different places should have recognizably different plants, flower palettes and crafted facade accents, NOT identical blue/pink bouquets pasted beside every building. Retain layered delicate leaves and selective veins, near detail and quiet distance. Keep all original broad light/shadow patterns. No people, writing, UI, collage, new traffic, new physical obstacles, flower carpets or clutter over paths. Canvas remains opaque 1672 x 941.
Input image 2 is the FINAL LOCATION IDENTITY REFERENCE only, not a second scene to include. Edit only image 1; its exact geometry is authoritative.
Side street identity: a cooler green-and-blue HYDRANGEA residential lane, with a PINK SATSUKI AZALEA pocket garden at the existing bench. Give each building a specific identity while keeping structural silhouettes and all floor geometry unchanged.
The near left small shop has soft SAGE-TEAL paint on its existing wooden storefront trim (keep the awning blue-grey and exactly shaped), honey oak doors, a fine cream stitched hem and a pair of existing textured honey/ochre terracotta pots with IVORY MARGUERITE DAISIES and soft herbs. No hydrangea bouquets on every shop pot.
The first courtyard house after the shop uses the existing warm cedar/dark walnut gate, calm cream plaster and muted MOSS-GREEN shutters where existing shutters are visible. Its garden behind the wall is the main BLUE/VIOLET HYDRANGEA landmark: expressive layered broad serrated leaves and delicate blue flower clusters. The existing pot at its gate is glazed POWDER-BLUE ceramic with a restrained ivory wave band; same exact pot silhouette and footing.
Other homes farther along are differentiated by existing surfaces: one has INDIGO charcoal wood gate/window trim, cooler pale plaster and neat fan-shaped ginkgo leaves; another has warmer grey-beige weathered masonry, maple-like small lobed leaves and mostly flowerless fern planting. Their roof forms, windows, gates and original canopy footprints stay fixed.
The existing right bench garden has warm aged wood bench slats, sage-painted metal legs and a clear uncluttered entrance. Repaint its existing surrounding low shrubs as graceful PINK SATSUKI AZALEAS with separated soft five-petal blooms, dark green smaller leaves, and a few ivory blossoms. Not hydrangeas everywhere. Its existing overhead tree has delicately fanned ginkgo-like foliage within exactly the same silhouette. Only modify plants INSIDE the existing garden bounds, never on its paved entrance.
Keep sunlight, colors and light hierarchy fully consistent with the approved fusion style. Botanical color groups should read clearly: left home cool blue, near shop ivory/ochre, right bench soft pink.
View-specific invariants: Keep input 1's exact elevated along-road view: shop near LEFT, hydrangea home above it LEFT, pink azalea bench garden RIGHT, right side-alley mouth. Match input 2's building finishes and specific plant groups without transferring composition. Keep every planter, chalkboard, bench leg, wall post and entrance in original input 1 position.
Critical prop rule: KEEP the original bicycle, chalkboard, doors and original count/shape/footprint of pots in image 1. Change their surface appearance, never add, remove, shift or replace any prop.
```

### leafy_eye 

- 中间稿备份：`D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts/leafy-road-eye-v3.png`
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-33ce49cc-656c-41f3-9d60-32c3aa019ebb.png`

```text
Use case: precise-object-edit.
Asset type: polished 2D game street painting, local environmental identity pass.
Input image 1 is the edit target. Work over the exact approved 1672 x 941 painting, identical camera and framing, no reframing, zoom, mirroring or relayout. Preserve every structural silhouette, roof, doorway, wall top/base, pole, bicycle, bench, pot footprint, curb, road line, drain and the entire walkable ground in its exact pixel position. Buildings can gain distinct SURFACE finishes on existing parts, not new footprint or new architecture.
Keep the approved fusion Japanese anime-background style: warmly lit ordinary Japanese residential streets, clean hand-painted linework, gentle edges, vibrant natural botanical forms, dimensional cool tree shadows, cream walls, blue-grey tiled roofs. Do not become photorealistic, pixel art, fantasy village, European academy, 3D/plastic, low-saturation wash or bloom.
This is a substantial LOCATION CHARACTER pass within the existing painting: different places should have recognizably different plants, flower palettes and crafted facade accents, NOT identical blue/pink bouquets pasted beside every building. Retain layered delicate leaves and selective veins, near detail and quiet distance. Keep all original broad light/shadow patterns. No people, writing, UI, collage, new traffic, new physical obstacles, flower carpets or clutter over paths. Canvas remains opaque 1672 x 941.
Input image 2 is the FINAL LOCATION IDENTITY REFERENCE only, not a second scene to include. Edit only image 1; its exact geometry is authoritative.
Side street identity: a cooler green-and-blue HYDRANGEA residential lane, with a PINK SATSUKI AZALEA pocket garden at the existing bench. Give each building a specific identity while keeping structural silhouettes and all floor geometry unchanged.
The near left small shop has soft SAGE-TEAL paint on its existing wooden storefront trim (keep the awning blue-grey and exactly shaped), honey oak doors, a fine cream stitched hem and a pair of existing textured honey/ochre terracotta pots with IVORY MARGUERITE DAISIES and soft herbs. No hydrangea bouquets on every shop pot.
The first courtyard house after the shop uses the existing warm cedar/dark walnut gate, calm cream plaster and muted MOSS-GREEN shutters where existing shutters are visible. Its garden behind the wall is the main BLUE/VIOLET HYDRANGEA landmark: expressive layered broad serrated leaves and delicate blue flower clusters. The existing pot at its gate is glazed POWDER-BLUE ceramic with a restrained ivory wave band; same exact pot silhouette and footing.
Other homes farther along are differentiated by existing surfaces: one has INDIGO charcoal wood gate/window trim, cooler pale plaster and neat fan-shaped ginkgo leaves; another has warmer grey-beige weathered masonry, maple-like small lobed leaves and mostly flowerless fern planting. Their roof forms, windows, gates and original canopy footprints stay fixed.
The existing right bench garden has warm aged wood bench slats, sage-painted metal legs and a clear uncluttered entrance. Repaint its existing surrounding low shrubs as graceful PINK SATSUKI AZALEAS with separated soft five-petal blooms, dark green smaller leaves, and a few ivory blossoms. Not hydrangeas everywhere. Its existing overhead tree has delicately fanned ginkgo-like foliage within exactly the same silhouette. Only modify plants INSIDE the existing garden bounds, never on its paved entrance.
Keep sunlight, colors and light hierarchy fully consistent with the approved fusion style. Botanical color groups should read clearly: left home cool blue, near shop ivory/ochre, right bench soft pink.
View-specific invariants: Keep input 1's exact human eye-level shot and road geometry, shop at near LEFT, hydrangea home farther LEFT, pink azalea bench recess RIGHT. Match input 2's sage-teal shop trim, powder-blue pot at the hydrangea home, ivory shop flowers, pink bench flowers and different distant house finishes. Preserve original open bench entrance, foreground-right pavement, horizon and all prop positions. Do not enlarge flowers/plants over walkway.
Critical prop rule: KEEP the original bicycle, chalkboard, doors and original count/shape/footprint of pots in image 1. Change their surface appearance, never add, remove, shift or replace any prop.
```


