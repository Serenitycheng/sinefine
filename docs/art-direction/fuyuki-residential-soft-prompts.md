# 深山住宅坂西段：实际素材与生成记录

日期：2026-10-07。使用内置 imagegen，未切换付费API或CLI。选择的最终素材已复制到仓库。

- 最终素材：[柔和版住宅坂](../../source/public/fate/city-art/miyama-residential-west-soft-v2.png)。
- 实际尺寸：1672×941，RGB，无损PNG；没有重采样放大，也没有锐化滤镜。
- 画风参考：[用户确认的融合版](step-17-approved-anime-street.png)。
- 布局参考：[由原游戏道路与门口生成的布局图](fuyuki-residential-layout.png)。
- 第一轮参考画风与布局，第二轮以第一轮结果为编辑目标，保留道路、建筑和门的位置，柔和笔触、叶片与光影。
- 生成结果没有严格逐像素遵守布局图；使用原游戏世界坐标与独立地面配准，实际校准两处门槛、花店铺装、道路横截面。不能直接拿布局参考的像素作为人物落脚点。
- 三次生成均请求3840×2160，实际均返回1672×941。第三次不带图片的新生成也没有提高尺寸，且构图偏离第一轮，因此不作为运行素材。**高清母版尚未达标**，不以修改图片尺寸或增加锐化冒充完成。

## 第一轮：完整地段

```text
Use case: stylized-concept.
Asset type: production background painting for a walkable 2.5D Japanese anime life game, SINE FINE / adapted Fuyuki residential district.
Input image 1 is the APPROVED FUSION ART STYLE reference. Keep its believable ordinary Japanese houses, hand-painted anime color, blue-gray tile roofs, warm pale plaster and comfortable natural light. The user wants it SOFTER and higher quality: softly painted edges, restrained contrast, less dense highlight speckle, less razor-sharp roof/leaf/road microtexture; keep natural lively colors, do not desaturate or blur the whole picture.
Input image 2 is a GEOMETRY AND DOOR POSITION layout guide, NOT an aesthetic reference. Render an entire contiguous neighborhood in that exact plan and oblique projection, with the road curving across the lower portion from the lower left up to the right, a lane leaving at lower left, and a school-route fork towards the lower foreground near normalized (0.58,0.75). Roads continue naturally beyond the image, no dead-end round caps, no central city plaza.
Critical coordinates normalized to the full canvas: Kiritsugu family's gate and foot threshold at (0.3233,0.8368); original small flower shop doorway at (0.4547,0.7756); Emiya Japanese compound gate at (0.7481,0.5708). The entire connecting paved routes of image 2 stay open, including the short uphill paved path into the Emiya gate. Respect these exact foot positions: house and shop facades must end ABOVE the doorway thresholds and never cover the indicated road. Keep the road width and the corners of image 2. Red dots/text/diagram shapes are guides only; remove them from the finished painting.
Scene: a modest warm Japanese family home with wooden gate and white garden wall at left, a small residential flower shop with a sage-gray cloth canopy between the two homes, and farther to the right Emiya's traditional Japanese compound with deep blue-gray roofs, timber gate, low white wall and a garden. Houses should have individual rooflines, doors and daily belongings. Fill the upper scene naturally with yards, connected walls and quiet neighboring houses. Foreground lower side may contain clipped tree branches/low hedges only, NEVER obscure the road or turn it into isolated building cutouts.
Nature: tall airy zelkova, rounded camphor canopy, one small maple, gardenia near the family gate, a restrained mix of hydrangea, seasonal cut flowers and herbs outside the flower shop. Natural species silhouettes, broad softened foliage masses with a few selective crisp accents. No identical pasted tree crowns.
Lighting: gentle early-summer daylight with one coherent sun direction, airy blue-gray reflected shade, large connected soft canopy shadows and clean restful road areas. Ordinary matte asphalt with subtle wear, NO decorative carpet-like road patterns. Visually refined and clear when displayed large, no sharpening halos.
Camera: stable oblique walkable view as image 2, not a steep roof-only top-down, not cinematic eye-level perspective. Whole coherent hand-painted anime environment, no collage, no separate asset blocks, no 3D plastic look, no fantasy academy, no pixel art.
Resolution: deliver a genuine high-detail 3840 x 2160 landscape master if available, preserving the roughly 16:9 reference canvas exactly, not a small image enlarged with sharpening. No people, no UI, no readable text, no logos or watermark.
```

## 第二轮：柔和精修（当前采用）

```text
Use case: lighting-weather / style-transfer refinement.
Edit the attached neighborhood painting. Keep every building, road curve, road fork, gate, flower shop entrance and paved foot threshold in EXACTLY the same position. Keep the approved Japanese hand-painted anime fusion style and natural color palette.
The user finds the current edge sharpness and busy speckled foliage glaring. Substantially soften the ARTISTIC TREATMENT: paint leaf clusters as larger airy masses with only a few individual leaf accents, consolidate scattered bright yellow highlights into natural softly graded light, soften roof tile and masonry edges and reduce their microcontrast, simplify road grain. Sunlight should be gentle and coherent, shadows broad and connected with blue-gray ambient fill and moderately soft edges. Leave distinct camphor / zelkova / maple silhouettes and gardenia / hydrangea / florist flowers. This is softer edge hierarchy and light, not desaturation, fog or whole-picture blur.
Make the road and gates calm and readable, remove crunchy detail and sharpening halos. Maintain selective definition around functional gate thresholds and flower shop entrance; original colors stay lively, whites warm without blown highlights. No newly added people, furniture, walls or UI, no fantasy look. Keep the SAME geometry for navigation.
Produce a genuinely high-resolution landscape master 3840 by 2160 pixels with freshly resolved painted details. Do NOT give a 1672x941 preview, and do not merely stretch a small image or apply sharpening. No readable text or watermarks.
```

## 第三轮：高清输出尝试（未采用）

```text
Create a NEW original production-size background painting at 3840x2160 pixels, landscape 16:9. This request is for a genuine large game-art master with refined detail, not a thumbnail.
Style: premium hand-painted Japanese anime daily-life background, ordinary Fuyuki-like Japanese residential street. Fusion of credible natural lighting, clean expressive anime illustration and comfortable spatial composition. Softer edge hierarchy, restrained natural contrast, no oversharpening; still rich natural greens, warm cream plaster, blue-gray roof tiles and warm cedar timber. Large airy tree shapes, soft coherent canopy shadow, subtle ground texture, atmospheric distant houses. Avoid speckled yellow highlights, dense tiny leaf edges, patterned decorative asphalt, bloom, washed-out desaturation and blanket blur.
Composition: a coherent oblique semi-overhead neighborhood at about 30 degrees, open street running from lower-left foreground diagonally to middle-right background, a small side lane towards the foreground slightly right of center. Three distinct frontages in one connected scene: modest Japanese family house and garden gate on left, small local flower shop with sage-gray awning in middle, traditional Japanese compound and wooden gate on right. Frontages on upper/back side of the road, broad unobstructed lower road surface and door-front paving for walking. Ordinary neighboring houses and yards above, foreground vegetation at edges only. Do not frame it as isolated model cutouts or a fantastical academy.
Precise full-canvas landmark positions: left family gate threshold near (0.24,0.63); flower shop threshold near (0.47,0.50); right Japanese compound gate near (0.76,0.40). Main road centerline near (0.05,0.79),(0.21,0.73),(0.40,0.63),(0.60,0.53),(0.85,0.39),(0.99,0.34). Keep gate walkways unobstructed; plants beside doors, never in the threshold. Mature airy zelkova, rounded camphor, small maple; white gardenia at family gate, purple hydrangea and seasonal bouquet planters at florist. Architectural details and plants differ across buildings while belonging to the same town. No people, no UI, no readable writing, no watermark.
Resolution requirement: 3840 pixels wide, 2160 high, actual high-resolution source artwork. Do not supply a 1672x941 preview or fake crispness from sharpening.
```
