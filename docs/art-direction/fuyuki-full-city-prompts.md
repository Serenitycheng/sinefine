# 冬木市剩余街道：完整原画与提示词

日期：2026-10-08。内置 `image_gen` 生成；各输出复制进版本管理，原始生成文件保留。

- 本轮新增21个场景的三档完整街景，共63张；与原住宅坂西段、旧街北段的6张合为69张。
- 新输出均为原生1672×941 PNG。没有将缩略图放大冒充4K；3840×2160母版仍未达到。
- 三档分别独立绘制环境：斜俯、抬高沿路、人眼高度平视。运行使用各自实测地面和门口配准，不旋转拉伸同一图或拆建筑拼贴。
- 斜俯参考已确认的柔和融合版住宅坂／旧街；沿路和平视以本场景斜俯与已确认的正向平视作参考。远坂／间桐庭前补充实际住宅入口要求。参考图均在生成或查看后才用于后续编辑。
- 树种、花材、建筑身份是制作约束；生成不完全遵循物种或细节时，以实际选图为准，后续细修不能只修改描述。
- 道路按原19条中心线及住宅通路登记；图像是游戏美术解释，不是Fate官方精确比例地图。

下面逐项保存实际最终提示词。旧6张的提示词另见住宅坂、旧街素材记录。

## bridge-approach / along

运行文件：`source/public/fate/city-art/bridge-approach-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 冬木大桥西引道. Western Miyama approach to Fuyuki bridge: transition from low cream Japanese houses and a small corner store to a wider open bridge avenue, roadside plane trees, a few willow branches near the river, pale concrete barrier becoming low bridge railing at far end. Modest slope, clear asphalt and broad paved walkways, far bridge structure and river light visible. No houses in river.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## bridge-approach / eye

运行文件：`source/public/fate/city-art/bridge-approach-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 冬木大桥西引道. Western Miyama approach to Fuyuki bridge: transition from low cream Japanese houses and a small corner store to a wider open bridge avenue, roadside plane trees, a few willow branches near the river, pale concrete barrier becoming low bridge railing at far end. Modest slope, clear asphalt and broad paved walkways, far bridge structure and river light visible. No houses in river.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## bridge-approach / overview

运行文件：`source/public/fate/city-art/bridge-approach-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 冬木大桥西引道. Scene: Western Miyama approach to Fuyuki bridge: transition from low cream Japanese houses and a small corner store to a wider open bridge avenue, roadside plane trees, a few willow branches near the river, pale concrete barrier becoming low bridge railing at far end. Modest slope, clear asphalt and broad paved walkways, far bridge structure and river light visible. No houses in river.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## bridge-east / along

运行文件：`source/public/fate/city-art/bridge-east-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 冬木大桥东引道. Eastern Shinto bridge approach opens from low river parapets into a modern Japanese neighborhood, broad concrete footway, riverside pocket park open entry on left, low wood benches behind the path, young willows and white iris, a few distant apartment buildings and a practical streetlight. Bridge railing near end continues Fuyuki large bridge; main avenue ahead. Clear continuous pavement, no fence across path.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## bridge-east / eye

运行文件：`source/public/fate/city-art/bridge-east-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 冬木大桥东引道. Eastern Shinto bridge approach opens from low river parapets into a modern Japanese neighborhood, broad concrete footway, riverside pocket park open entry on left, low wood benches behind the path, young willows and white iris, a few distant apartment buildings and a practical streetlight. Bridge railing near end continues Fuyuki large bridge; main avenue ahead. Clear continuous pavement, no fence across path.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## bridge-east / overview

运行文件：`source/public/fate/city-art/bridge-east-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 冬木大桥东引道. Scene: Eastern Shinto bridge approach opens from low river parapets into a modern Japanese neighborhood, broad concrete footway, riverside pocket park open entry on left, low wood benches behind the path, young willows and white iris, a few distant apartment buildings and a practical streetlight. Bridge railing near end continues Fuyuki large bridge; main avenue ahead. Clear continuous pavement, no fence across path.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## central-park / along

运行文件：`source/public/fate/city-art/central-park-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 中央公园外沿. A road along a local Fuyuki park edge in Shinto, low apartment frontage on one side, mature zelkova and green maple park canopy on the other, low stone edge, wide open paved park access and a wood bench pocket on left without blocking the road. Restrained blue hydrangea and white hosta flowers, broad shade and sun patches; connects church hillside and main road. No enclosed fantasy garden.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## central-park / eye

运行文件：`source/public/fate/city-art/central-park-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 中央公园外沿. A road along a local Fuyuki park edge in Shinto, low apartment frontage on one side, mature zelkova and green maple park canopy on the other, low stone edge, wide open paved park access and a wood bench pocket on left without blocking the road. Restrained blue hydrangea and white hosta flowers, broad shade and sun patches; connects church hillside and main road. No enclosed fantasy garden.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## central-park / overview

运行文件：`source/public/fate/city-art/central-park-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 中央公园外沿. Scene: A road along a local Fuyuki park edge in Shinto, low apartment frontage on one side, mature zelkova and green maple park canopy on the other, low stone edge, wide open paved park access and a wood bench pocket on left without blocking the road. Restrained blue hydrangea and white hosta flowers, broad shade and sun patches; connects church hillside and main road. No enclosed fantasy garden.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## church-slope / along

运行文件：`source/public/fate/city-art/church-slope-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 教会丘陵路. Hillside street in eastern Fuyuki Shinto approaching a restrained Western stone church, pointed but plain windows, modest belfry without extravagant spires, stone wall and accessible wooden gate/forecourt on left, cedar and evergreen holly, white lilies in a limited bed. Sloping asphalt continuous road, church at mid distance left, everyday neighboring houses lower down. No magical cathedral complex.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## church-slope / eye

运行文件：`source/public/fate/city-art/church-slope-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 教会丘陵路. Hillside street in eastern Fuyuki Shinto approaching a restrained Western stone church, pointed but plain windows, modest belfry without extravagant spires, stone wall and accessible wooden gate/forecourt on left, cedar and evergreen holly, white lilies in a limited bed. Sloping asphalt continuous road, church at mid distance left, everyday neighboring houses lower down. No magical cathedral complex.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## church-slope / overview

运行文件：`source/public/fate/city-art/church-slope-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 教会丘陵路. Scene: Hillside street in eastern Fuyuki Shinto approaching a restrained Western stone church, pointed but plain windows, modest belfry without extravagant spires, stone wall and accessible wooden gate/forecourt on left, cedar and evergreen holly, white lilies in a limited bed. Sloping asphalt continuous road, church at mid distance left, everyday neighboring houses lower down. No magical cathedral complex.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## estate-lane / along

运行文件：`source/public/fate/city-art/estate-lane-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 洋馆丘陵小路. Miyama mansion hill lane: sober early twentieth-century Japanese Western-style brick and cream stucco facades set back behind wrought iron and pale stone garden walls, differentiated red brick classical Tohsaka estate direction and dark timber/stucco Matou estate direction. Calm green maples, climbing pale roses and a distant cedar. Accessible paved garden entries on the left, dignified lived-in residences, no tall turrets, no magic academy, no toy houses. Continue toward shopping street at far end.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## estate-lane / eye

运行文件：`source/public/fate/city-art/estate-lane-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 洋馆丘陵小路. Miyama mansion hill lane: sober early twentieth-century Japanese Western-style brick and cream stucco facades set back behind wrought iron and pale stone garden walls, differentiated red brick classical Tohsaka estate direction and dark timber/stucco Matou estate direction. Calm green maples, climbing pale roses and a distant cedar. Accessible paved garden entries on the left, dignified lived-in residences, no tall turrets, no magic academy, no toy houses. Continue toward shopping street at far end.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## estate-lane / overview

运行文件：`source/public/fate/city-art/estate-lane-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 洋馆丘陵小路. Scene: Miyama mansion hill lane: sober early twentieth-century Japanese Western-style brick and cream stucco facades set back behind wrought iron and pale stone garden walls, differentiated red brick classical Tohsaka estate direction and dark timber/stucco Matou estate direction. Calm green maples, climbing pale roses and a distant cedar. Accessible paved garden entries on the left, dignified lived-in residences, no tall turrets, no magic academy, no toy houses. Continue toward shopping street at far end.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## fuyuki-bridge / along

运行文件：`source/public/fate/city-art/fuyuki-bridge-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 冬木大桥. The Fuyuki large arch bridge crossing the Mion river, a long continuous two-lane asphalt deck and broad footways, sober light concrete railings, restrained blue-grey steel arch rhythm, open blue river on both sides and Miyama/Shinto skyline in distance. Believable Japanese urban bridge, soft summer sunlight, no golden palace, no excessive flowers, no isolated bridge floating in grass.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## fuyuki-bridge / eye

运行文件：`source/public/fate/city-art/fuyuki-bridge-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 冬木大桥. The Fuyuki large arch bridge crossing the Mion river, a long continuous two-lane asphalt deck and broad footways, sober light concrete railings, restrained blue-grey steel arch rhythm, open blue river on both sides and Miyama/Shinto skyline in distance. Believable Japanese urban bridge, soft summer sunlight, no golden palace, no excessive flowers, no isolated bridge floating in grass.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## fuyuki-bridge / overview

运行文件：`source/public/fate/city-art/fuyuki-bridge-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 冬木大桥. Scene: The Fuyuki large arch bridge crossing the Mion river, a long continuous two-lane asphalt deck and broad footways, sober light concrete railings, restrained blue-grey steel arch rhythm, open blue river on both sides and Miyama/Shinto skyline in distance. Believable Japanese urban bridge, soft summer sunlight, no golden palace, no excessive flowers, no isolated bridge floating in grass.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## matou-approach / along

运行文件：`source/public/fate/city-art/matou-approach-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 间桐宅 · 庭前通路. Approach to Matou family's sober older Western-style house, cream plaster over dark timber, grey slate roof, a tall but plain stone garden boundary, evergreen holly and laurel, sparse white camellia and ivy in shade, continuous broad stone walkway with one gentle bend leading to a wooden double entrance at far left endpoint. Slightly cooler garden shade within the same warm summer day, no horror mansion, no gothic magic academy, no spires.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
For this PRIVATE FORECOURT the playable stone walk ENDS at the open front door of the cream-stucco dark-timber house, at middle-left. Keep a broad unobstructed paved approach from bottom center up to this threshold. Do not substitute an endless public street or a closed garden wall. Show only this estate forecourt and connecting street mouth near the bottom.
```

## matou-approach / eye

运行文件：`source/public/fate/city-art/matou-approach-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 间桐宅 · 庭前通路. Approach to Matou family's sober older Western-style house, cream plaster over dark timber, grey slate roof, a tall but plain stone garden boundary, evergreen holly and laurel, sparse white camellia and ivy in shade, continuous broad stone walkway with one gentle bend leading to a wooden double entrance at far left endpoint. Slightly cooler garden shade within the same warm summer day, no horror mansion, no gothic magic academy, no spires.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
For this PRIVATE FORECOURT the playable stone walk ENDS at the open front door of the cream-stucco dark-timber house, at middle-left. Keep a broad unobstructed paved approach from bottom center up to this threshold. Do not substitute an endless public street or a closed garden wall. Show only this estate forecourt and connecting street mouth near the bottom.
```

## matou-approach / overview

运行文件：`source/public/fate/city-art/matou-approach-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 间桐宅 · 庭前通路. Scene: Approach to Matou family's sober older Western-style house, cream plaster over dark timber, grey slate roof, a tall but plain stone garden boundary, evergreen holly and laurel, sparse white camellia and ivy in shade, continuous broad stone walkway with one gentle bend leading to a wooden double entrance at far left endpoint. Slightly cooler garden shade within the same warm summer day, no horror mansion, no gothic magic academy, no spires.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## mount-miyama / along

运行文件：`source/public/fate/city-art/mount-miyama-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山商店街. Old Miyama shopping street with individual everyday Japanese storefronts: a bakery with warm wood display, cream linen awning and unobstructed left door apron; grocery with crates tucked entirely behind walkway, a little household shop, subdued hand-lettered sign shapes without readable text. Plane and maple trees, occasional coral geranium and rosemary planters. Mansion hill meets street near, south bridge route far. No pasted independent buildings.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## mount-miyama / eye

运行文件：`source/public/fate/city-art/mount-miyama-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山商店街. Old Miyama shopping street with individual everyday Japanese storefronts: a bakery with warm wood display, cream linen awning and unobstructed left door apron; grocery with crates tucked entirely behind walkway, a little household shop, subdued hand-lettered sign shapes without readable text. Plane and maple trees, occasional coral geranium and rosemary planters. Mansion hill meets street near, south bridge route far. No pasted independent buildings.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## mount-miyama / overview

运行文件：`source/public/fate/city-art/mount-miyama-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 深山商店街. Scene: Old Miyama shopping street with individual everyday Japanese storefronts: a bakery with warm wood display, cream linen awning and unobstructed left door apron; grocery with crates tucked entirely behind walkway, a little household shop, subdued hand-lettered sign shapes without readable text. Plane and maple trees, occasional coral geranium and rosemary planters. Mansion hill meets street near, south bridge route far. No pasted independent buildings.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## old-south / along

运行文件：`source/public/fate/city-art/old-south-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山旧街 · 南段. A quieter continuation of the approved old northern lane: weathered cedar row houses, uneven pale stone foundations, ceramic roof ridges, a tiny repairer's frontage, fern banks, green Japanese maples and a few blue hydrangeas. Near junction continues the bookshop neighborhood; the far fork leads to the western residential lane and mansion hill. Do not repeat the bookshop or the same family gates.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## old-south / eye

运行文件：`source/public/fate/city-art/old-south-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山旧街 · 南段. A quieter continuation of the approved old northern lane: weathered cedar row houses, uneven pale stone foundations, ceramic roof ridges, a tiny repairer's frontage, fern banks, green Japanese maples and a few blue hydrangeas. Near junction continues the bookshop neighborhood; the far fork leads to the western residential lane and mansion hill. Do not repeat the bookshop or the same family gates.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## old-south / overview

运行文件：`source/public/fate/city-art/old-south-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 深山旧街 · 南段. Scene: A quieter continuation of the approved old northern lane: weathered cedar row houses, uneven pale stone foundations, ceramic roof ridges, a tiny repairer's frontage, fern banks, green Japanese maples and a few blue hydrangeas. Near junction continues the bookshop neighborhood; the far fork leads to the western residential lane and mansion hill. Do not repeat the bookshop or the same family gates.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## residential-east / along

运行文件：`source/public/fate/city-art/residential-east-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山住宅坂 · 东段. Scene: everyday Japanese family street, Fujimura's larger traditional family compound mid-distance screen-right, broad wooden gate, blue-grey tiled roofs, pale stone garden walls, a small camphor canopy and cream gardenia near the shared western junction; east section has crepe myrtle with restrained pale lilac flowers and a green maple. A quiet school slope branches away in the far background; another lane leads toward the shopping street at the far end. Give each house credible different joinery, windows, gate, planting, no repeated copies.

Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## residential-east / eye

运行文件：`source/public/fate/city-art/residential-east-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山住宅坂 · 东段. Scene: everyday Japanese family street, Fujimura's larger traditional family compound mid-distance screen-right, broad wooden gate, blue-grey tiled roofs, pale stone garden walls, a small camphor canopy and cream gardenia near the shared western junction; east section has crepe myrtle with restrained pale lilac flowers and a green maple. A quiet school slope branches away in the far background; another lane leads toward the shopping street at the far end. Give each house credible different joinery, windows, gate, planting, no repeated copies.

Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## residential-east / overview

运行文件：`source/public/fate/city-art/residential-east-overview-v1.png`。

```text
Use case: stylized-concept
Asset type: one complete wide 16:9 2.5D game environment painting, no people and no UI.
Primary request: expand the approved soft Japanese anime-background Fuyuki neighborhood into the eastern continuation of the residential slope. Reference image 1 is STYLE and adjacent-street continuity; reference image 2 is STYLE only.
Scene: everyday Japanese family street, Fujimura's larger traditional family compound mid-distance screen-right, broad wooden gate, blue-grey tiled roofs, pale stone garden walls, a small camphor canopy and cream gardenia near the shared western junction; east section has crepe myrtle with restrained pale lilac flowers and a green maple. A quiet school slope branches away in the far background; another lane leads toward the shopping street at the far end. Give each house credible different joinery, windows, gate, planting, no repeated copies.
Camera: elevated oblique overview, enough side-wall depth but not straight top-down. The continuous asphalt lane enters lower-left around (80,840) on a 1672x941 composition, moves to (450,730), (820,620), (1180,530), and exits upper-right around (1510,400), with a natural shallow S-bend. Keep a clear broad continuous walkable lane and paved door apron at the Fujimura gate. A full scene with pavement and garden walls, never detached building blocks.
Style: closely match the approved fusion reference: natural warm early-summer afternoon light, Japanese anime environmental painting, comfortable fresh greens and cool blue grey shadows, softer edges and broad canopy masses, natural connected cast shadows, calm material detail; avoid hard sharpened leaves or busy floor ornament.
Constraints: ordinary real Japanese neighborhood, consistent afternoon sun from upper-left, matching cream walls/blue grey tiles at the near western junction. No fantasy castle, no magic academy, no pixel art, no plastic 3D render. No labels, text, watermarks, characters. Request detailed 3840x2160 landscape master if available; maintain wide 16:9 composition. This is one complete environment, no image panels or collage.
```

## riverside / along

运行文件：`source/public/fate/city-art/riverside-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都河岸步道. Long riverside promenade on the east bank of Mion, water along screen-right beyond a low safe parapet, continuous asphalt walking/bicycle path and light stone shoulders, spaced willows and airy reeds, white iris and a few blue-purple agapanthus. Residential skyline far, a river park landing with benches and open paving on left, bridge connection mouths clear. No flower carpet, no suburban houses in water.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## riverside / eye

运行文件：`source/public/fate/city-art/riverside-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都河岸步道. Long riverside promenade on the east bank of Mion, water along screen-right beyond a low safe parapet, continuous asphalt walking/bicycle path and light stone shoulders, spaced willows and airy reeds, white iris and a few blue-purple agapanthus. Residential skyline far, a river park landing with benches and open paving on left, bridge connection mouths clear. No flower carpet, no suburban houses in water.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## riverside / overview

运行文件：`source/public/fate/city-art/riverside-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 新都河岸步道. Scene: Long riverside promenade on the east bank of Mion, water along screen-right beyond a low safe parapet, continuous asphalt walking/bicycle path and light stone shoulders, spaced willows and airy reeds, white iris and a few blue-purple agapanthus. Residential skyline far, a river park landing with benches and open paving on left, bridge connection mouths clear. No flower carpet, no suburban houses in water.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## school-junction / along

运行文件：`source/public/fate/city-art/school-junction-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山中心交叉口. Small irregular Miyama neighborhood junction linking school hill, residential street, mansion hill and bridge approach. Four low Japanese corner buildings, a plain neighborhood bulletin board, mature spreading zelkova, restrained pink azalea bank. Show clear connected asphalt and two visible paved branch mouths, not a traffic grid. No fantasy shop.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## school-junction / eye

运行文件：`source/public/fate/city-art/school-junction-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山中心交叉口. Small irregular Miyama neighborhood junction linking school hill, residential street, mansion hill and bridge approach. Four low Japanese corner buildings, a plain neighborhood bulletin board, mature spreading zelkova, restrained pink azalea bank. Show clear connected asphalt and two visible paved branch mouths, not a traffic grid. No fantasy shop.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## school-junction / overview

运行文件：`source/public/fate/city-art/school-junction-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 深山中心交叉口. Scene: Small irregular Miyama neighborhood junction linking school hill, residential street, mansion hill and bridge approach. Four low Japanese corner buildings, a plain neighborhood bulletin board, mature spreading zelkova, restrained pink azalea bank. Show clear connected asphalt and two visible paved branch mouths, not a traffic grid. No fantasy shop.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## school-slope / along

运行文件：`source/public/fate/city-art/school-slope-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 学园通学坡道. A Japanese school-bound hillside street, muted cream boundary wall and leafy school compound at the far end, simple flat-roof public school with tall windows and sober gate, open paved gate forecourt on left side. Tall camphor shade and cherry summer green, small clumps of agapanthus in side planting. Residential lane junction near; school entrance at the far end. Ordinary school, no magical academy.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## school-slope / eye

运行文件：`source/public/fate/city-art/school-slope-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 学园通学坡道. A Japanese school-bound hillside street, muted cream boundary wall and leafy school compound at the far end, simple flat-roof public school with tall windows and sober gate, open paved gate forecourt on left side. Tall camphor shade and cherry summer green, small clumps of agapanthus in side planting. Residential lane junction near; school entrance at the far end. Ordinary school, no magical academy.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## school-slope / overview

运行文件：`source/public/fate/city-art/school-slope-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 学园通学坡道. Scene: A Japanese school-bound hillside street, muted cream boundary wall and leafy school compound at the far end, simple flat-roof public school with tall windows and sober gate, open paved gate forecourt on left side. Tall camphor shade and cherry summer green, small clumps of agapanthus in side planting. Residential lane junction near; school entrance at the far end. Ordinary school, no magical academy.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## shinto-main / along

运行文件：`source/public/fate/city-art/shinto-main-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都主街. Wide main avenue of Shinto Fuyuki with ordinary Japanese late twentieth-century modern mixed-use blocks, varied three/four storey cream/grey facades, wood-glass local businesses at ground level, restrained shop signs without readable text, sidewalk separated by curb, ginkgo rows with fan-shaped foliage and red salvia in limited beds. Modern daily city atmosphere, no European magic town, no skyscraper canyon.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## shinto-main / eye

运行文件：`source/public/fate/city-art/shinto-main-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都主街. Wide main avenue of Shinto Fuyuki with ordinary Japanese late twentieth-century modern mixed-use blocks, varied three/four storey cream/grey facades, wood-glass local businesses at ground level, restrained shop signs without readable text, sidewalk separated by curb, ginkgo rows with fan-shaped foliage and red salvia in limited beds. Modern daily city atmosphere, no European magic town, no skyscraper canyon.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## shinto-main / overview

运行文件：`source/public/fate/city-art/shinto-main-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 新都主街. Scene: Wide main avenue of Shinto Fuyuki with ordinary Japanese late twentieth-century modern mixed-use blocks, varied three/four storey cream/grey facades, wood-glass local businesses at ground level, restrained shop signs without readable text, sidewalk separated by curb, ginkgo rows with fan-shaped foliage and red salvia in limited beds. Modern daily city atmosphere, no European magic town, no skyscraper canyon.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## shinto-north / along

运行文件：`source/public/fate/city-art/shinto-north-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都北街. Shinto north street closer to residential ridge: two/three-storey concrete and timber Japanese houses with distinct roof lines, low garden walls and modern gates, a small neighborhood convenience frontage, birch and ginkgo contrast in crowns, modest orange marigold clusters and green shrubs. Near river footway junction, far hill/church junction. Gently bending continuous asphalt, normal Japanese city.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## shinto-north / eye

运行文件：`source/public/fate/city-art/shinto-north-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都北街. Shinto north street closer to residential ridge: two/three-storey concrete and timber Japanese houses with distinct roof lines, low garden walls and modern gates, a small neighborhood convenience frontage, birch and ginkgo contrast in crowns, modest orange marigold clusters and green shrubs. Near river footway junction, far hill/church junction. Gently bending continuous asphalt, normal Japanese city.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## shinto-north / overview

运行文件：`source/public/fate/city-art/shinto-north-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 新都北街. Scene: Shinto north street closer to residential ridge: two/three-storey concrete and timber Japanese houses with distinct roof lines, low garden walls and modern gates, a small neighborhood convenience frontage, birch and ginkgo contrast in crowns, modest orange marigold clusters and green shrubs. Near river footway junction, far hill/church junction. Gently bending continuous asphalt, normal Japanese city.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## shinto-residential / along

运行文件：`source/public/fate/city-art/shinto-residential-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都住宅街. Modern Shinto residential side street: low apartment buildings with individual balconies and a few plain family homes, warm grey concrete walls, glass entry doors, bicycle storage recessed off pavement, sycamore canopy, restrained pale pink hydrangea and white daisies. Connected station street far and main avenue near; open paved building entries, practical Japanese neighborhood, no fantasy chalet.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## shinto-residential / eye

运行文件：`source/public/fate/city-art/shinto-residential-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都住宅街. Modern Shinto residential side street: low apartment buildings with individual balconies and a few plain family homes, warm grey concrete walls, glass entry doors, bicycle storage recessed off pavement, sycamore canopy, restrained pale pink hydrangea and white daisies. Connected station street far and main avenue near; open paved building entries, practical Japanese neighborhood, no fantasy chalet.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## shinto-residential / overview

运行文件：`source/public/fate/city-art/shinto-residential-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 新都住宅街. Scene: Modern Shinto residential side street: low apartment buildings with individual balconies and a few plain family homes, warm grey concrete walls, glass entry doors, bicycle storage recessed off pavement, sycamore canopy, restrained pale pink hydrangea and white daisies. Connected station street far and main avenue near; open paved building entries, practical Japanese neighborhood, no fantasy chalet.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## south-bridge / along

运行文件：`source/public/fate/city-art/south-bridge-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 南桥 · 日常分支. Small southern local road bridge of the game's original daily-life branch, simple reinforced-concrete deck with low green-grey metal rails, open river views, distant city blocks and willow bank, a broad unbroken sidewalk. Visually distinct from the large arch bridge: no big steel arches, low quiet utilitarian crossing. Same early summer sun and Japanese anime backdrop style.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## south-bridge / eye

运行文件：`source/public/fate/city-art/south-bridge-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 南桥 · 日常分支. Small southern local road bridge of the game's original daily-life branch, simple reinforced-concrete deck with low green-grey metal rails, open river views, distant city blocks and willow bank, a broad unbroken sidewalk. Visually distinct from the large arch bridge: no big steel arches, low quiet utilitarian crossing. Same early summer sun and Japanese anime backdrop style.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## south-bridge / overview

运行文件：`source/public/fate/city-art/south-bridge-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 南桥 · 日常分支. Scene: Small southern local road bridge of the game's original daily-life branch, simple reinforced-concrete deck with low green-grey metal rails, open river views, distant city blocks and willow bank, a broad unbroken sidewalk. Visually distinct from the large arch bridge: no big steel arches, low quiet utilitarian crossing. Same early summer sun and Japanese anime backdrop style.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## station-avenue / along

运行文件：`source/public/fate/city-art/station-avenue-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都站前街. Shinto station avenue: modest Japanese suburban station-front neighborhood, practical station canopy in far distance, one corner cafe with muted teal cloth awning and wooden-glass entrance at middle left with a broad paved apron, a sober apartment/hotel frontage for Kayneth nearby, distinct windows and stone entry, medium-height cream buildings. Ginkgo and street-side blue agapanthus, no mansion identical to Miyama. Clear asphalt road and continuous footway.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## station-avenue / eye

运行文件：`source/public/fate/city-art/station-avenue-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 新都站前街. Shinto station avenue: modest Japanese suburban station-front neighborhood, practical station canopy in far distance, one corner cafe with muted teal cloth awning and wooden-glass entrance at middle left with a broad paved apron, a sober apartment/hotel frontage for Kayneth nearby, distinct windows and stone entry, medium-height cream buildings. Ginkgo and street-side blue agapanthus, no mansion identical to Miyama. Clear asphalt road and continuous footway.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## station-avenue / overview

运行文件：`source/public/fate/city-art/station-avenue-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 新都站前街. Scene: Shinto station avenue: modest Japanese suburban station-front neighborhood, practical station canopy in far distance, one corner cafe with muted teal cloth awning and wooden-glass entrance at middle left with a broad paved apron, a sober apartment/hotel frontage for Kayneth nearby, distinct windows and stone entry, medium-height cream buildings. Ginkgo and street-side blue agapanthus, no mansion identical to Miyama. Clear asphalt road and continuous footway.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## temple-path / along

运行文件：`source/public/fate/city-art/temple-path-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 圆藏山参道. Approach to Ryudou temple through mature pines and Japanese cedars, a continuous broad stone-paved sloping path with shallow traversable steps, mossy stone retaining walls and broad landing. Simple traditional Buddhist timber gate and grey tiled roof in middle/far left, open approach landing, woodland continues uphill. Ferns, moss, a few shaded hosta flowers. Real Japanese temple architecture, no magic academy, no Chinese fantasy pagoda, no castle. Paving remains broad and unbroken for gameplay.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## temple-path / eye

运行文件：`source/public/fate/city-art/temple-path-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 圆藏山参道. Approach to Ryudou temple through mature pines and Japanese cedars, a continuous broad stone-paved sloping path with shallow traversable steps, mossy stone retaining walls and broad landing. Simple traditional Buddhist timber gate and grey tiled roof in middle/far left, open approach landing, woodland continues uphill. Ferns, moss, a few shaded hosta flowers. Real Japanese temple architecture, no magic academy, no Chinese fantasy pagoda, no castle. Paving remains broad and unbroken for gameplay.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## temple-path / overview

运行文件：`source/public/fate/city-art/temple-path-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 圆藏山参道. Scene: Approach to Ryudou temple through mature pines and Japanese cedars, a continuous broad stone-paved sloping path with shallow traversable steps, mossy stone retaining walls and broad landing. Simple traditional Buddhist timber gate and grey tiled roof in middle/far left, open approach landing, woodland continues uphill. Ferns, moss, a few shaded hosta flowers. Real Japanese temple architecture, no magic academy, no Chinese fantasy pagoda, no castle. Paving remains broad and unbroken for gameplay.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## tohsaka-approach / along

运行文件：`source/public/fate/city-art/tohsaka-approach-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 远坂宅 · 庭前通路. An accessible private garden approach to Tohsaka's sober red-brick Japanese Western-style residence, a continuous generous light stone path through green maple and climbing pale rose borders, wrought iron gate set open, dignified two-storey red-brick residence and cream trim at far left endpoint, one bend and broad landing at wooden entrance. No circular turrets, no magic school, no toy castle. Keep foreground and main walkway unobstructed.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
For this PRIVATE FORECOURT the playable stone walk ENDS at the open front door of the red-brick cream-trim house, at middle-left. Keep a broad unobstructed paved approach from bottom center up to this threshold. Do not substitute an endless public street or a closed garden wall. Show only this estate forecourt and connecting street mouth near the bottom.
```

## tohsaka-approach / eye

运行文件：`source/public/fate/city-art/tohsaka-approach-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 远坂宅 · 庭前通路. An accessible private garden approach to Tohsaka's sober red-brick Japanese Western-style residence, a continuous generous light stone path through green maple and climbing pale rose borders, wrought iron gate set open, dignified two-storey red-brick residence and cream trim at far left endpoint, one bend and broad landing at wooden entrance. No circular turrets, no magic school, no toy castle. Keep foreground and main walkway unobstructed.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
For this PRIVATE FORECOURT the playable stone walk ENDS at the open front door of the red-brick cream-trim house, at middle-left. Keep a broad unobstructed paved approach from bottom center up to this threshold. Do not substitute an endless public street or a closed garden wall. Show only this estate forecourt and connecting street mouth near the bottom.
```

## tohsaka-approach / overview

运行文件：`source/public/fate/city-art/tohsaka-approach-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 远坂宅 · 庭前通路. Scene: An accessible private garden approach to Tohsaka's sober red-brick Japanese Western-style residence, a continuous generous light stone path through green maple and climbing pale rose borders, wrought iron gate set open, dignified two-storey red-brick residence and cream trim at far left endpoint, one bend and broad landing at wooden entrance. No circular turrets, no magic school, no toy castle. Keep foreground and main walkway unobstructed.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```

## west-residential / along

运行文件：`source/public/fate/city-art/west-residential-along-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山西住宅巷. Narrow lived-in western Miyama neighborhood, Natalia's modest off-white rental cottage behind an unpretentious wooden entry, iron mail box, stone retaining walls, camellia and loquat trees, white bellflowers and ferns. Paved open walkway to Natalia's door from the left roadside; old lane junction near and mansion junction far. An older quiet residential lane, no palace.
Camera: raised along-street view from about one storey (4-6 meters), clearly higher than human eye height but much lower than overview. See more near floor and some roof planes; continuous road heads from bottom center toward upper-middle/right, gentle perspective. Clearly different from both overhead and human-eye views. Named gate/shop apron remains LEFT with unobstructed pavement to the threshold.
```

## west-residential / eye

运行文件：`source/public/fate/city-art/west-residential-eye-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
The first reference is the existing OVERVIEW painting of THIS SAME street. Repaint the same street as a different complete camera view; preserve its architecture, building order, roof materials, characteristic plants, sun direction and door/forecourt. The second reference provides approved animation background softness.
Street identity: 深山西住宅巷. Narrow lived-in western Miyama neighborhood, Natalia's modest off-white rental cottage behind an unpretentious wooden entry, iron mail box, stone retaining walls, camellia and loquat trees, white bellflowers and ferns. Paved open walkway to Natalia's door from the left roadside; old lane junction near and mansion junction far. An older quiet residential lane, no palace.
Camera: truly centered human eye height (about 1.5 meters), looking directly forward down the street. Level horizon, upright verticals, symmetrical optical center near x836, horizon around y430 on 1672x941 frame. Do NOT draw an elevated, diagonal or top-down angle. Broad visible road from bottom edges leading toward the central vanishing point, clear sidewalk, gates and shop aprons on LEFT. The named entrance should be accessible in middle LEFT, not hidden behind a closed foreground wall. No people.
```

## west-residential / overview

运行文件：`source/public/fate/city-art/west-residential-overview-v1.png`。

```text
Use case: stylized-concept. Asset type: a single complete wide 16:9 2.5D playable street painting, no characters or UI. The attached images are approved STYLE references only; the new street must have its own coherent architecture and plants. Preserve the fusion of natural Japanese early-summer lighting, Japanese anime background brushwork and a comfortable clear path. Soft edges and broad tree crown masses, warm cream/wood surfaces and cool blue grey shadows, fresh greens, believable scale and connected cast shadows from upper-left. No sharpening, repeating leaf confetti, ornate floor carpet, fantasy academy, toy blocks, plastic 3D, pixel art, labels, readable text, people, watermarks or multi-panel contact sheet. This is one connected environment, never a collage of detached building cutouts. Request detailed landscape 3840x2160 master if supported, otherwise the best native wide landscape.
Street identity: 深山西住宅巷. Scene: Narrow lived-in western Miyama neighborhood, Natalia's modest off-white rental cottage behind an unpretentious wooden entry, iron mail box, stone retaining walls, camellia and loquat trees, white bellflowers and ferns. Paved open walkway to Natalia's door from the left roadside; old lane junction near and mansion junction far. An older quiet residential lane, no palace.
Camera: high elevated oblique view with clear house-side depth, not vertical top-down; keep the full broad pavement visible. The main continuous lane runs diagonally from near bottom-left around (80,850), through (500,720), (950,570), and to upper-right around (1510,380) on a 1672x941 composition, gently bending and showing connected branch mouths. If a named door/gate is present, its open paved apron lies on the upper-left side of the lane and leads visibly from curb to threshold. Show the same sun and material at adjacent ends. No UI or characters.
```
