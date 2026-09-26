# 第 4 条：新增角色行走素材

- 日期：2026-09-26。
- 工具模式：内置 `image_gen.imagegen`；每位角色独立生成一次，以既有行走素材作风格参考。未使用 CLI/API 回退，未对输出做程序化图像修改。
- 参考图：先查看 `source/public/fate/street/lancers-walk.png`，随后每次调用通过 `referenced_image_paths` 传入其绝对路径。
- 实际输出：每张 2172×724、RGBA PNG、透明背景，横向 4 帧；每帧 543×724，宽高比 0.75。页面按实际尺寸接入，不按提示词中的期望画幅强行裁切。
- 验证：逐张查看生成图；读取 PNG 尺寸、alpha 通道和帧区域；浏览器验证头像、街道展示和角色移动。
- 保存位置：`D:/projects/sinefine-recovery/source/public/fate/street/`。工具原始输出保留。
- 相关资料：[立绘提示词](assets-step-4-portraits.md)、[功能验收](verification-step-4.md)。

## 吉尔伽美什

- 项目文件：[gilgamesh-walk.png](../source/public/fate/street/gilgamesh-walk.png)。
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-1bda1ccc-bcc0-4115-a212-caa7a629ecb1.png`。
- 最终提示词：

```text
Create a production-ready transparent PNG sprite sheet for SINE FINE. New subject: Gilgamesh from Fate/Zero, golden spiky hair, red eyes, recognizable ornate golden armor, red waist cloth, adult king, confident composed expression, unarmed everyday walk. Match the attached reference only for crisp anime chibi drawing style, three-head-tall proportions, rendering, consistent scale and sprite-sheet spacing; do NOT reproduce its two characters. EXACT LAYOUT: one horizontal row of exactly FOUR equal square cells, ideally canvas 2048 wide x 512 high. Each cell contains the same Gilgamesh in a full-body side/front three-quarter view facing RIGHT: frame 0 neutral idle feet resting; frame 1 left step; frame 2 passing mid-step; frame 3 right step. Four separate nonoverlapping figures, centered at 12.5%,37.5%,62.5%,87.5% canvas width, head near 10% height and soles near 93% height in every cell. Identical face, hair, armor, lighting, camera, feet baseline across all frames, clear alternating leg and arm movement. Plenty of transparent empty space between the figures. True alpha transparency everywhere outside each figure; no background, no floor, no checkerboard pixels, no shadows, no grid, no words, no watermark, no weapons, no cropped hair/feet.
```

## 美杜莎

- 项目文件：[medusa-walk.png](../source/public/fate/street/medusa-walk.png)。
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-a3986df3-619c-48aa-80c7-83b9c9d40c04.png`。
- 最终提示词：

```text
Create a transparent PNG game sprite sheet of MEDUSA (Rider from Fate/stay night) for SINE FINE. Match supplied reference's crisp anime chibi style, three-head-tall cute adult proportions, polished linework and scale, but depict ONLY Medusa. She has extremely long straight violet hair, recognizable purple eye mask, black sleeveless short dress with violet trim, long black gloves and dark thigh-high boots. Calm reserved adult character, modest pose, no weapon. EXACT LAYOUT: ONE row of FOUR equal cells across a 3:1 wide canvas. Same full-body character centered at horizontal 12.5%,37.5%,62.5%,87.5%; every figure fully inside its quarter, all facing RIGHT at same side/front three-quarter angle. Frames: neutral idle, left foot forward, passing pose, right foot forward; visibly different walking legs/arms but identical head size/hair/clothes. Soles aligned at 92% canvas height, hair/top near 9%; generous transparent spacing. Real alpha transparent background, no ground, no cast shadow, no labels, no grid, no text, no watermarks, no other characters. Long hair must fit inside each frame and not cross cell borders.
```

## 远坂时臣

- 项目文件：[tokiomi-walk.png](../source/public/fate/street/tokiomi-walk.png)。
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-bf97ff7c-8fbb-42b1-93ac-81afeae6bb19.png`。
- 最终提示词：

```text
Use case: stylized-concept. Game asset: transparent four-frame sprite strip for SINE FINE. Depict ONLY Tokiomi Tohsaka from Fate/Zero: refined middle-aged man, swept-back dark brown hair, neatly trimmed goatee, burgundy formal three-piece suit jacket and trousers, white shirt and cravat, dark polished shoes. Gentle composed dignified expression, no weapon. Match attached reference in crisp anime chibi style, three-head-tall body proportions, rich cel shading, clean linework. LAYOUT: horizontal 3:1 canvas divided invisibly into FOUR equal vertical cells in ONE ROW; four full-body poses of exactly the same man. Centered at x=12.5/37.5/62.5/87.5 percent, facing RIGHT at same three-quarter angle. First idle pose; next three are left step, passing stride, right step. Feet baseline 92% height, tops near9%, constant scale and identity. Real transparent alpha outside character silhouettes, no cast shadow, no floor, no room, no grid, no labels/text/watermark. Enough space between figures and all hair, coat and feet inside their own quarter. Different leg/arm positions for real walking animation, no cropped parts.
```

## 言峰绮礼

- 项目文件：[kirei-walk.png](../source/public/fate/street/kirei-walk.png)。
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-4542a3ac-c8d7-4605-9d07-3cd6ca039791.png`。
- 最终提示词：

```text
Create a production transparent PNG sprite sheet for SINE FINE. New character ONLY: Kirei Kotomine from Fate/Zero and Fate/stay night, adult tall priest with short tousled dark brown hair, heavy calm dark eyes, reserved unreadable face. His canonical long black priest cassock/coat with small white clerical collar, simple cross necklace, black trousers and black shoes; no weapons. Style reference is the attached image only for anime chibi proportions (three heads tall), polished clean detailed linework and cel shading. Horizontal 3:1 wide canvas, exactly ONE ROW of FOUR equal cells. Four full-body poses of the same priest, all facing RIGHT in a matching three-quarter view: idle feet together, left stride, passing stride, right stride. Each stands centered at 12.5/37.5/62.5/87.5 percent canvas width. Same head size/face/costume, head at9%, soles baseline92%, sufficient spacing, all limbs fully inside respective quarter. Noticeable alternating feet and gentle arm swing. True alpha transparency around silhouettes, no background, no floor, no checkerboard, no shadow, no grid, no words/watermark, no other people.
```

## 间桐雁夜

- 项目文件：[kariya-walk.png](../source/public/fate/street/kariya-walk.png)。
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-65a0a803-551f-4bfd-a48a-df1c10e32117.png`。
- 最终提示词：

```text
Make one transparent PNG FOUR-frame game sprite strip of Kariya Matou from Fate/Zero, in a healthy hopeful alternative-life version: youthful adult man with short pale silver-white slightly tousled hair, light grey eyes, healthy even skin, gentle determined expression; absolutely NO injuries, bugs, worms, scars, diseased or decayed skin. Casual dark forest-green hooded jacket over a plain light shirt, dark trousers, brown casual shoes. Match attached reference's refined anime chibi rendering, three-head-tall proportions, neat linework and colored cel shading. ONE horizontal row, FOUR equal cells on a 3:1 canvas. Exactly four full-body copies of this one man, all facing RIGHT three-quarter side view, identical scale and clothes. Centers at12.5%,37.5%,62.5%,87.5% width; top near9% height, soles92%. Poses: first idle, second left foot step, third passing step, fourth right foot step. Real walking changes to arms/legs, same face/hair. Every silhouette fully inside its quarter with generous empty space. Actual transparent alpha background, no floor/shadow/checkerboard/grid/text/watermark, no weapons, no extra people.
```

## EMIYA

- 项目文件：[emiya-walk.png](../source/public/fate/street/emiya-walk.png)。
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-9ad735e8-0cb4-4c6d-bd6e-e08cca4ed1d9.png`。
- 最终提示词：

```text
Create a transparent PNG 4-frame game walking sprite strip of EMIYA, Archer from Fate/stay night, for SINE FINE. Clearly distinct from young Shirou: mature adult man, tan skin, short swept-back spiky white hair, steel-grey eyes, slightly sardonic calm expression. Iconic red open sleeveless long coat with short red shoulder jacket, black fitted armored suit underneath with silver crisscross chest lines, black trousers and boots. No swords or bow. Match provided reference's anime chibi three-head-tall proportions and polished clean cel shading. ONE row of FOUR equal cells on a horizontal 3:1 canvas, no borders. Four full-body copies of the same Archer, all facing RIGHT three-quarter view, centered at12.5/37.5/62.5/87.5% width. Head tops near9%, feet baseline92%, constant identity/scale/outfit. Poses neutral idle, left-foot forward, passing stride, right-foot forward, visibly different walking positions. Each body and coat stays fully within its quarter, generous transparent spacing, no cropped hair/feet. Actual alpha transparent background; no floor, no shadow, no checkerboard, no text, no labels, no watermark, no other characters.
```

## 娜塔莉亚

- 项目文件：[natalia-walk.png](../source/public/fate/street/natalia-walk.png)。
- 原始输出：`C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-88034d60-68a0-49d1-822d-decef7bfe900.png`。
- 最终提示词：

```text
Create a transparent PNG four-frame game walking sprite strip for SINE FINE. Depict ONLY Natalia Kaminski from Fate/Zero: mature adult woman with warm tan/olive skin, shoulder-length slightly wavy dark brown hair parted to one side, dark eyes, confident relaxed capable expression. Practical olive-green fitted utility field jacket over a plain black shirt, dark blue jeans, brown ankle boots, simple belt. She is Kiritsugu's adult foster mother and mentor, never a teenage girl; no weapon, no cigarette. Match provided style reference in crisp detailed anime chibi rendering, three-head-tall proportions, clean cel shading, grown-woman face. ONE ROW with FOUR equal cells in a wide3:1 canvas. Four full-body poses of exactly the same woman at x12.5/37.5/62.5/87.5%, facing RIGHT at constant side-front three-quarter angle. Idle feet together, left stride, passing stride, right stride; visible alternate legs/arms, consistent outfit/hair/body proportions. Tops near9% height, soles at92%, full figures inside their quarters, generous empty space. Actual alpha-transparent background with no ground/shadow/grid/checkerboard/text/watermark. Do not copy the male characters from the reference; use it only for game-art style and frame geometry.
```
