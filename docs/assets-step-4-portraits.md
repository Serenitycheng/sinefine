# 第 4 条：新增角色立绘制作记录

- 日期：2026-09-26。
- 范围：7 位角色、8 张立绘；不含行走素材，不替换项目已有资产。
- 工具模式：内置 `image_gen.imagegen`，`generate`，每个目标独立调用一次；未使用 CLI/API 回退。
- 风格参考：先通过 `view_image` 检查 `source/public/fate/portraits/diarmuid.png` 和 `rin.png`，将精细动漫线稿、层次阴影与全身构图写入提示词；参考图未作为编辑目标。
- 画幅：8 张均为 1024×1536、2:3 竖图；人物完整全身，宁静冬木日常环境，无文字/水印。
- 检查：逐张查看内置工具返回的完整图片，确认人物身份、服装、构图与特殊分支约束后复制到项目目录。保留工具原始输出。

## 吉尔伽美什 · 黄金铠甲

- 最终路径：`source/public/fate/portraits/gilgamesh-gold.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-f6fbd26a-0cc1-479e-8ef6-c61b9de2d85a.png`。
- 目视检查：金发红眼、黄金铠甲、完整双足；冬木河畔夕景。

最终提示词：

```text
Use case: stylized-concept. Asset type: a finished character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of Gilgamesh, the adult male Archer from Fate/Zero, as a recognizable faithful anime character, alone. Scene/backdrop: a peaceful Fuyuki riverside promenade at late afternoon, distant bridge and trees subtly painted, no battle. Subject: athletic adult man, short swept-up spiky golden-blond hair, vivid red eyes, regal confident slightly amused expression; ornate gleaming gold plate armor with broad gold pauldrons, segmented breastplate and gauntlets, sculpted gold leg armor, a red cloth accent at the waist, recognizably Gilgamesh's canonical golden armor. Relaxed dignified standing pose, arms resting naturally, no weapon attack. Style/medium: highly polished detailed Japanese anime key visual, precise elegant ink lines, clean expressive face, refined cel shading blended with luminous painterly texture, richly detailed metallic reflections, matching the fine full-body anime illustration finish of the project's Rin and Diarmuid portraits. Composition/framing: vertical 2:3 image, approximately 1024 by 1536 pixels, full body from hair to both boots visible with small margins, one centered character occupying about 80 percent of image height. Lighting/mood: warm quiet sunset rim light, peaceful everyday-life atmosphere. Constraints: exactly one character; canonical proportions and recognizable outfit; no text, no letters, no logos, no watermark, no collage, no borders, no extra limbs.
```

## 美杜莎

- 最终路径：`source/public/fate/portraits/medusa.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-6afeed33-3d5b-4832-b11a-70cf02bb6b9a.png`。
- 目视检查：紫色长发、眼罩、黑紫服装、完整双足；住宅庭院。

最终提示词：

```text
Use case: stylized-concept. Asset type: finished character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of Medusa, the adult woman Rider from Fate/stay night, alone and recognizably faithful to her canonical appearance. Scene/backdrop: a quiet tree-lined Fuyuki residential garden path near a traditional house, softly painted greenery and late-afternoon light, peaceful daily-life environment. Subject: a tall graceful adult woman with very long straight lavender-purple hair reaching below her knees, recognizable long side locks and straight fringe, a smooth purple-and-black magical blindfold covering her eyes, composed gentle expression; her iconic fitted black sleeveless high-neck dress with purple strap and trim details, long black detached gloves, and tall black thigh-high boots, canonical proportions and clothing. Relaxed standing pose, hands resting naturally in front; no attack, no weapon action. Style/medium: highly polished detailed Japanese anime key visual, elegant precise ink lines, expressive facial drawing, refined cel shading blended with luminous painterly texture, detailed flowing hair and fabric highlights, consistent with the project's fine full-body Rin and Diarmuid illustrations. Composition/framing: vertical 2:3, approximately 1024 by 1536 pixels, full body including both boots, small margins around hair and feet, one centered character occupies about 80 percent of height. Lighting/mood: soft warm light and dappled greenery, calm and reserved. Constraints: only one adult character, faithful recognizable Medusa, tasteful neutral everyday stance, no text, no watermark, no logos, no borders, no collage, no extra limbs.
```

## 远坂时臣

- 最终路径：`source/public/fate/portraits/tokiomi.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-c93f789d-4c9d-412c-8d9d-51a2c17687d7.png`。
- 目视检查：棕发蓝眼、胡须、红色正装及手杖；宅邸花园。

最终提示词：

```text
Use case: stylized-concept. Asset type: finished character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of Tokiomi Tohsaka from Fate/Zero, recognizable faithful adult male character, alone. Scene/backdrop: the quiet landscaped garden outside an elegant Western-style Fuyuki residence, stone path and subdued roses in soft afternoon light, peaceful daily-life setting. Subject: dignified middle-aged adult man with neatly swept-back dark brown hair, blue eyes, finely groomed narrow moustache and short pointed goatee; his iconic formal deep burgundy-red three-piece suit with a long red jacket, matching waistcoat, white shirt, dark tie or cravat with a small turquoise jewel, neat dark shoes. Upright refined standing pose, one hand resting on a slender wooden walking cane with a small decorative gemstone handle, other arm relaxed; calm courteous but assured expression. Accurate Tokiomi face and hairstyle, no younger replacement. Style/medium: highly polished detailed Japanese anime key visual, precise elegant line art, refined cel shading mixed with luminous painterly textures, intricate cloth folds and clean facial detail, matching the fine full-body Rin and Diarmuid portrait finish in the project. Composition/framing: vertical 2:3 image, approximately 1024 by 1536 pixels, full body from hair to both shoes, small margins, exactly one centered person at about 80 percent image height. Lighting/mood: warm serene daylight, restrained aristocratic elegance. Constraints: no text, no letters, no labels, no logos, no watermark, no collage, no borders, no extra characters or limbs, no combat.
```

## 言峰绮礼

- 最终路径：`source/public/fate/portraits/kirei.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-8e88d377-ca45-4386-81c5-65054f8a5fef.png`。
- 目视检查：棕色中长发、成熟面孔、黑色神父服及十字架；教堂庭院。

最终提示词：

```text
Use case: stylized-concept. Asset type: finished character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of Kirei Kotomine from Fate/stay night / Fate/Zero, recognizable faithful adult male priest character, alone. Scene/backdrop: quiet stone courtyard outside the small Fuyuki church, closed wooden church doors and subdued trees, serene late-afternoon light, no battle or violence. Subject: tall well-built mature adult man with brown eyes, thick dark-brown hair falling around his ears and neck with uneven bangs, a stern angular face and a restrained unreadable expression; iconic ankle-length black clerical cassock with high collar, understated pale collar detail, a simple gold cross pendant at the chest, straight black trousers and black shoes. Relaxed upright standing pose, arms naturally at his sides or one hand lightly holding a small closed plain book with no readable marks; no weapons. Style/medium: highly polished detailed Japanese anime key visual, elegant precise line art, refined cel shading mixed with luminous painterly texture, clean face rendering, deep layered black cloth shading, matching the fine full-body anime portrait finish of the project's Rin and Diarmuid images. Composition/framing: vertical 2:3, approximately 1024 by 1536 pixels, full body from hair to both shoes with small margins, one centered person occupying about 80 percent of height. Lighting/mood: soft afternoon rim light and calm shadow, composed and watchful. Constraints: accurately Kirei, mature face; no text, no letters, no logos, no watermark, no collage, no border, no extra characters or limbs.
```

## 间桐雁夜

- 最终路径：`source/public/fate/portraits/kariya.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-8674c409-2856-4a71-bdc9-417e881a1b0b.png`。
- 目视检查：健康脸部与双眼、白灰发、深色连帽衫；无虫子、伤疤、腐坏；公园。

最终提示词：

```text
Use case: stylized-concept. Asset type: finished character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of Kariya Matou from Fate/Zero in the project's explicitly chosen hopeful healthy alternate life, alone. Scene/backdrop: a quiet sunlit Fuyuki neighborhood park path with leafy trees and a distant wooden bench, peaceful ordinary afternoon. Subject: recognizable Kariya Matou, a lean adult man around his early thirties with short slightly unkempt soft white-gray hair, clear gentle gray-violet eyes, pale but healthy even skin, a fully healthy intact face on BOTH sides, alert relaxed posture and a small hopeful smile. He wears his recognizable simple dark navy hoodie jacket, plain light shirt, dark casual trousers and low dark shoes. Both eyes open and healthy, no disfigurement. Hands relaxed naturally at his sides, one hand in a jacket pocket; neutral everyday-life stance. This project branch has NO worms and NO bodily decay: absolutely no worms, insects, scarring, damaged eye, diseased skin, veins, gore or horror elements. Style/medium: highly polished detailed Japanese anime key visual, refined precise line work, expressive clean face, gentle cel shading mixed with luminous painterly texture and delicate hair/fabric detail, matching the fine full-body anime finish of the project's Rin and Diarmuid portraits. Composition/framing: vertical 2:3, approximately 1024 by 1536 pixels, full body with both shoes visible and small margins, exactly one centered adult character occupying about 80 percent of height. Lighting/mood: clear hopeful warm daylight, calm and humane. Constraints: no text, no labels, no logos, no watermark, no borders, no collage, no extra limbs or extra characters.
```

## EMIYA

- 最终路径：`source/public/fate/portraits/emiya.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-225405bd-7aaa-4e7f-8c2a-aadd19091622.png`。
- 目视检查：成年白发褐肤男性、黑色护甲与红衣，区别于少年士郎；住宅庭院。

最终提示词：

```text
Use case: stylized-concept. Asset type: finished character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of EMIYA, the adult male Archer from Fate/stay night Unlimited Blade Works, alone and distinctly recognizable; he is not the younger red-haired Shirou. Scene/backdrop: quiet Fuyuki traditional residential courtyard by a wooden house and leafy garden, subtle everyday cooking-life warmth without depicting a kitchen task, peaceful late afternoon. Subject: muscular tall adult man with tan brown skin, short swept-back spiky white hair, sharp steel-gray eyes, strong angular face and a faint restrained ironic smile. Iconic Archer outfit: cropped red open-front long-sleeved jacket, black fitted armored sleeveless torso with silver-white crisscross detailing over the chest, red split coat tails tied around the waist, fitted black trousers with white segmented protective accents, black boots. Relaxed grounded standing pose, one hand loosely resting on his hip and the other relaxed, no weapons, no combat. Style/medium: highly polished detailed Japanese anime key visual, precise elegant line art, refined cel shading blended with luminous painterly texture, sharp face and detailed fabric and armor highlights, consistent with the fine full-body anime finish of the project's Rin and Diarmuid portraits. Composition/framing: vertical 2:3, approximately 1024 by 1536 pixels, full body from white hair to both boots visible, small margins, exactly one centered character occupying about 80 percent of the height. Lighting/mood: warm quiet daylight, composed practical adult presence. Constraints: preserve recognizable canonical EMIYA coloring and costume, no younger Shirou, no text, no letters, no logos, no watermark, no border, no collage, no extra characters or limbs.
```

## 娜塔莉亚

- 最终路径：`source/public/fate/portraits/natalia.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-9a9f6005-f74b-425e-9116-22c346971e3b.png`。
- 目视检查：成年深褐肤色深棕发女性，黑色实用服装；没有误画成切嗣或伊莉雅。

最终提示词：

```text
Use case: stylized-concept. Asset type: finished character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of Natalia Kaminski from Fate/Zero, the adult female mercenary and adoptive mother / mentor of Kiritsugu, alone. Accurate subject identity is essential: Natalia is a mature confident woman with dark tan-brown skin, short-to-medium tousled deep dark-brown hair with a slightly longer nape, sharp pale gray eyes, an angular feminine face and an easy wry self-assured expression. She must not resemble Kiritsugu, a male character, Illya, or a pale silver-haired girl. Outfit: her recognizable practical dark charcoal-black fitted sleeveless high-neck top, dark utility trousers, sturdy black boots, fingerless dark gloves, simple dark belt; fit capable adult build, relaxed natural anatomy. Pose: relaxed full-body standing, one hand resting casually at the hip and the other by her side, no weapons, no cigarette required. Scene/backdrop: a quiet Fuyuki neighborhood lane near a small workshop and leafy trees, peaceful warm afternoon; she is alive and free to live ordinary daily life in this project's hopeful branch. Style/medium: highly polished detailed Japanese anime key visual, precise elegant ink lines, clean expressive mature face, refined cel shading blended with luminous painterly texture, detailed practical fabric and soft skin lighting, matching the fine full-body anime portrait finish of the project's Rin and Diarmuid. Composition/framing: vertical 2:3 image, approximately 1024 by 1536 pixels, full body including both boots and small margins, exactly one centered adult woman occupying about 80 percent of height. Constraints: unmistakably Natalia Kaminski; dark tan skin and dark-brown hair, fully clothed, dignified calm everyday stance, no child, no man, no extra people, no text, no logos, no watermark, no borders, no collage, no extra limbs.
```

## 吉尔伽美什 · 黑色服装

- 最终路径：`source/public/fate/portraits/gilgamesh-suit.png`。
- 模式：内置 image_gen，独立 generate 调用，未修改已有图片。
- 原始输出：`C:\Users\Tracy\.codex\generated_images\01a0db97-3ac3-72f2-8970-395ed085f3ef\exec-d03471d8-7161-4fe5-95dd-e4aab77bf869.png`。
- 目视检查：金发红眼、黑色现代服装，完整双足；冬木河畔夕景。

最终提示词：

```text
Use case: stylized-concept. Asset type: finished alternate character portrait illustration for the Sinefine Fate daily-life game. Primary request: create one new image of Gilgamesh, the adult male Archer from Fate/Zero, wearing recognizable black modern civilian clothing, alone; this is his alternate everyday portrait, not golden armor. Scene/backdrop: a peaceful Fuyuki riverside or refined shopping-street promenade, softly painted modern Japanese buildings and trees under golden late-afternoon light, no readable signs. Subject: handsome athletic adult man with short golden-blond hair swept upward in distinct spiky locks, vivid crimson-red eyes, sharp refined face, confident regal amused expression, simple gold drop earrings. Outfit: tailored black high-collar fitted modern jacket worn partly open over a dark black top, sleek black trousers, polished black shoes, a subtle plain gold accessory; recognizably Gilgamesh in elegant black civilian attire, no armor. Relaxed dignified standing pose, one hand casually in his trouser pocket, the other relaxed by his side. Style/medium: highly polished detailed Japanese anime key visual, precise elegant line art, clean expressive face, refined cel shading mixed with luminous painterly texture, rich nuanced black fabric shading and golden hair highlights, matching the fine full-body illustration finish of the project's Rin and Diarmuid portraits. Composition/framing: vertical 2:3 image, approximately 1024 by 1536 pixels, complete body including both shoes, small margins above hair and below feet, exactly one centered character occupying about 80 percent of image height. Lighting/mood: warm serene rim light, regal ease in everyday Fuyuki. Constraints: blonde hair and red eyes; black modern outfit; no battle, no armor, no weapon, no text, no letters, no logos, no watermark, no border, no collage, no extra people or limbs.
```
