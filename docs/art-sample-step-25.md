# 第25条：住宅街与咖啡店美术小样

开始日期：2026-10-05；当前更新：2026-10-06。状态：用户已确认当前2D试点可作为扩展基准，融合版画风、多视角、路沿行走、门前与长椅规则已整理；3D对照保留初版。

分支：`feat/art-samples`。这两份小样的代码、素材、依赖、验证和后续修改统一保存在此分支；基于 `main` 的 `25257de`（小样之前的功能与玩法成果）继续开发，未经另行安排不合入主线。2026-10-05 已按用户要求拆分保存；下文“未commit、push”的表述记录制作当时的状态。

**当前制作规范：[融合版美术与2D街区制作规范](2d-street-art-and-construction-guide.md)。** 本文保留各轮历史与验证；未来素材、坐标、镜头、碰撞、交互与扩展顺序按新规范执行。先由用户commit和push当前成果，再逐段扩展一个连通街区，保留现有生活、AI和存档框架。

## 范围与画风

- 一处普通日式住宅、一段连续路面、一条短侧巷和街角咖啡店，以斜俯视为基准，现可小范围调整。自然日光、蓝瓦、暖色院墙、鲜活绿植与冷色树影，延续已确认的融合版。
- 建筑、院墙、步道和咖啡店一次绘制在完整场景中；人物行走时移动同一张场景的镜头，不在独立建筑图片之间切换。
- 伊莉雅使用新的非Q版四方向、每方向六帧二维人物。依据原立绘保留身份和衣着；逐帧测量身体中心、脚底和高度，运行时对齐，原始透明像素保留。
- 主游戏顶部新增「美术小样」入口。小样有键盘、点地行走、触控方向键、拖动、滚轮/按钮缩放、完整构图、回到人物、地点标记及门前查看。
- 这处画面研究独立于生活、对话、记忆、物品、时间、云端与存档。没有替换全城地图、展开新玩法、恢复旧风格或3D实验。

## 本地查看

- 页面：`http://localhost:3004/fate/art-sample`。
- WASD/方向键行走，点路面前往，拖动画面；走近住宅或咖啡店可按E查看。Esc关闭卡片或停止。
- 下方「住宅门前」「咖啡店」可实际走到两个门前；不瞬移、不进入尚未制作的小样室内。
- 「完整画面」查看整个构图；「定位人物」保留倍率。手机默认显示人物所在局部，拖动或行走可看到另一端。
- 右上相机按钮打开「沿街看看」：左看、回正、右看，以及连续角度滑杆。右键拖动或 Shift+拖动转向，Q/R微调、C回正；手机可切换「拖动：转动镜头」。普通拖动继续浏览街道。

## 素材、生成方式与提示词

使用内置 `image_gen`，未使用API/CLI备用模式。两次均为在已查看原图基础上的非破坏编辑，原有融合版和人物立绘保留。生成结果已复制到主仓库。

- 画风基准：`docs/art-direction/step-17-approved-anime-street.png`。
- 街道原图：`source/public/fate/art-sample/residential-cafe-v1.png`，1672×941。
- 人物原图：`source/public/fate/art-sample/illya-walk-v1.png`，1536×1024，6列×4行、每格256像素，实际RGBA透明。
- 人物身份输入：`source/public/fate/portraits/illya.png`；只保留人物与服饰。
- 实际页面截图：`docs/art-direction/step-25-playable-sample.png`，默认1280×720视口。
- 门前可走范围按新画面脚底位置描出；人物位置和主游戏坐标没有互相转换或写入。

### 街道最终提示词

```text
Use case: stylized-concept / playable 2D environment art.
Input image 1 is the approved street illustration to edit. Make one new, polished, cohesive street scene for SINE FINE, preserving this exact fusion of natural sunlight, Japanese anime background brushwork, and relaxed readable composition. Preserve the warm neutral plaster, blue-grey ceramic tiles, ordinary Japanese town architecture, lively green foliage, clear cream sunlight and cool blue shaded pavement. Soft painterly transitions, NOT washed-out low saturation or blur.
Composition: landscape 16:9, elevated three-quarter oblique walking-game view, about 40 degrees downward. See roofs and building facades, with a generous continuous road running diagonally from the lower-left toward the upper-right; no horizon, no ground-level first-person camera, no extreme vertical top-down. Keep a modest residential gate on the upper/left side, a naturally adjoining two-storey corner cafe on the upper/right side with understated blue-grey fabric awning, wood-and-glass entrance, a bicycle and a few plants. A continuous curb and boundary wall connect the houses and cafe, with a short connected side lane and usable entrance paving. Every facade and fence must have coherent ground contact, common perspective and shared lighting; no separated floating buildings or exposed blank gaps. The road remains unobstructed across the whole scene, wide enough for a walking character.
Real everyday Japanese residential details: small drains, discreet manhole, irregular leaf shadows, worn but clean asphalt, low garden walls, utility wires kept subtle. Building detail supports the whole composition rather than becoming miniature decorative dollhouses. Leave foreground roof/garden edges near the lower corners as framing, without blocking the middle walkable road.
Remove all existing people; do not draw any new characters. Do not add readable lettering, UI, buttons, frames, arrows, grid, map labels, magic, European academy, fantasy architecture, pixel art, 3D plastic render, exaggerated bloom, or sepia filter. One uninterrupted hand-painted scene with moderate real-town proportions, not an atlas or a collage.
```

### 人物最终提示词

```text
Use case: 2D game character sprite sheet, transparent.
Edit the character in input image 1 into a clean daylight walking sprite atlas. Preserve ONLY her identity and clothes: Illya, long silver-white hair, ruby eyes, purple rounded cylindrical hat, purple double-breasted knee-length coat, white scarf and purple boots. Remove all the original background, magical symbols and particles. Input image 2 is the street art style and sunlight reference, do not include the street itself.
Create one EXACT aligned regular atlas with 6 columns and 4 rows, exactly 24 separate complete full-body character poses, on true transparent background. Each equal-size cell has ONE character, centered horizontally, feet on the same baseline, identical height and scale, ample transparent margin on all sides. No grid lines, text, labels, numbers, props, duplicate overlapping bodies or cropped hat/feet.
Each row is a single direction, 6 successive natural walking frames:
Row 1: facing down toward the viewer, a gentle three-quarter front view.
Row 2: facing left, clear left-facing side/three-quarter view.
Row 3: facing right, clear right-facing side/three-quarter view.
Row 4: facing up away from the viewer, clear back view with hat, hair and back of coat.
Within each row the six poses form a restrained human walk cycle: neutral planted feet, left foot forward with opposite arm slightly forward, passing pose, neutral planted feet, right foot forward with opposite arm slightly forward, passing pose. Knees bend modestly, weight transfers believably, no raised elbows, high steps, sprinting, exaggerated leg spread, floating feet or puppet joints. Coat and hair sway slightly, head and body proportions stay constant. The first frame of each row must also serve as a calm resting pose.
Natural anime child proportions, approximately 5.5 heads tall, not chibi or giant-head miniature, not adult tall, not a 3D model. Painterly Japanese animation linework and softly colored shading matching input image 2, warm daylight from upper-left, cool shaded folds, violet fabric remains lively. Art quality and natural poses take priority, evenly aligned animation cells must remain distinct. Landscape atlas 3:2 aspect ratio, ideally 3072x2048 or a clean equivalent. Transparent background, no cast ground shadow baked into cells.
```

## 验证与边界

- 导航、门前连通、墙体碰撞、贴墙移动、镜头转换与步态计时已有独立规则检查；整项目322项测试通过。类型、lint与生产构建通过。
- 实际桌面预览已完成住宅—咖啡店往返、到场提示、E查看与Esc关闭；修复图标点击被当作路面点击、门前标记挡住人物及极短按键无响应的问题。
- 实测105%→151%放大、拖动只改变镜头不改变人物、短按方向键接管、390×844局部跟随到咖啡店；两张素材加载完整，页面宽度390且无横向溢出。触控方向键可用；双指手势尚未做实体手机实测。
- 实际页面控制台和本地生产服务无错误/警告。已关闭临时手机测试页，最终预览与原游戏恢复1280×720默认视口。
- 初版仅提供二维平移/缩放；下方第二轮现已加入有限转向，仍不提供建筑背面。未扩展全城衔接、昼夜变换、室内或多人物互动。
- 生成的六帧动作只是这一人物的小样，动作细腻度和画风匹配仍由实际试看判断，不宣称已完成全角色美术。
- 声音与完整日常尚未接到这段新画面；确认画面之后再按第26条联合试玩。
- 原有合并待用户commit/push；本轮未提交、推送、部署、运行游戏付费AI或开启后台代管。

## 追加：真实3D场景对照

- 页面：`http://localhost:3004/fate/art-sample-3d`；2D页顶部「3D对照」与3D页「2D小样」可来回查看。
- 同样以日式住宅、连续道路、入户步道、侧巷与咖啡店为范围。房屋、侧面/背面、屋顶曲瓦、院墙、门窗、雨槽、自行车、盆栽、电线和树木均为三维几何；咖啡店有店面开口及少量内部陈设。邻居屋檐只作前景。
- 完整场景由统一坐标、透视镜头、光照和阴影呈现，没有把独立建筑图片作为立面板拼接，也没有使用旧3D实验模型。路面图片只作为模型表面的材质；墙面与木纹是程序材质。
- 默认为约31°的斜俯视，看到路面和立面。水平可360°旋转，俯角限定30°—50°，避免完全顶视或平视；不提供失去方向的翻滚。近距离平移时，镜头沿原视线退出建筑/屋顶范围；此限制仅用于场景镜头，不能代替将来人物的碰撞规则。
- 左键拖动旋转、右键/修饰键拖动平移、滚轮缩放；按钮也可旋转、缩放和定位住宅/咖啡店。定位用平滑过渡，系统减少动态效果时直接定位。聚焦画面后，左右方向键旋转，+/-缩放，Home回整段街道。
- 自动环视默认关闭，手动拖动、旋转、缩放会立即停止。页面隐藏停止渲染，静止时只更新镜头而不重复绘制；退出页面释放几何、材质、纹理、阴影和镜头事件。
- 主游戏仍使用原有生活、交谈、记忆、物品与存档。这两处预览不推进日常、不调用游戏AI，不替换城市场景。

### 3D素材与生成记录

- 场景：`source/lib/fate-art-3d-scene.ts`；镜头与资源管理：`source/lib/fate-art-3d-runtime.ts`。采用固定布局与随机种子，刷新不会重排景物。
- 新增Three.js 0.186.1与类型0.186.0，保留npm锁文件。3D预览按需加载完整场景；第二轮2D预览复用依赖，仅加载自身的绘画深度渲染器。主游戏不加载这两份渲染器。
- 新沥青材质：`source/public/fate/art-sample/asphalt-v1.png`，1254×1254。内置image_gen全新生成，不使用参考输入或CLI/API备用模式，未覆盖其他素材。
- 原结果保留于 `C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-48fb7081-aab1-4168-b581-f9a82a865100.png`。
- 实际默认页面截图：`docs/art-direction/step-25-3d-sample.png`；180°背面截图：`docs/art-direction/step-25-3d-back.png`。这些是运行画面，不是生成效果图。
- 2D收尾检查点：`D:/projects/sinefine-backups/art-sample-2d-20261005-3d-before`；51个文件逐一校验SHA256，另存暂存/未暂存补丁和原合并状态；未进行新提交。

材质完整提示词：

```text
Create a single perfectly seamless square 3D albedo texture for ordinary Japanese residential street asphalt, designed for a polished anime-background-style 3D environment. Entire image is the flat material, orthographic overhead: subtly worn fine-grain warm blue-grey asphalt, very restrained hand-painted mottling and small irregular aggregate flecks, soft nuanced cool/warm variation, mostly mid-grey. Calm Japanese animation background paint finish with real-world-scale detail, NOT pixel art, NOT noisy photographic gravel, NOT a road scene. No baked lighting, shadows, perspective, curbs, painted road markings, cracks, manholes, objects, text, or borders. Uniform exposure, seamless edges on all four sides, square high-resolution texture. Avoid high-frequency grain that would shimmer in a game; tonal variations subtle enough to support tree shadows cast by actual 3D geometry.
```

### 3D验证与实际边界

- 327项测试、类型检查、全量lint、生产构建通过。新检查包含立体建筑范围、有限几何/实例矩阵、细节批处理、镜头退出屋顶范围及资源只释放一次；基础生活与存档测试继续通过。
- 桌面实测六次向右旋转共180°，角度从-0.544变为2.598弧度；实际背面、窗户、屋檐与投影随镜头变化。拖动会改变水平角和俯角，俯角受限。缩放实际距离28.06→23.38→28.06；手动缩放停止自动环视。
- 默认画面1280×720，页面无横向溢出；3D运行页面无控制台错误/警告。实际绘制约51.5万三角形，含阴影阶段；普通窗口操作已检查，尚未在多种实体设备上做帧率评测。
- 390×844模拟手机页面宽度/内容宽度均为390，按钮与入口可操作；首次用咖啡店近景，切换「整段街道」后镜头距离为71.94，住宅和咖啡店能同时呈现。跳转2D后的顶部入口仍无横向溢出。临时手机页已关闭，最终预览恢复默认尺寸。实体手机双指手势、右键拖动及多设备帧率尚未实测。
- 测试临时输出采用CommonJS，Three r186对此给出将来移除的提示；应用页面采用ES模块导入，页面无此提示。未通过隐藏警告来改变结果。
- **美术质量尚未验收**：3D已能真实旋转，整体绘画感、建筑细腻度、环境密度仍弱于2D融合版。它是同一方向的可操作场景初版，不宣称已达到确认过的动画背景效果；先在此小范围继续判断和修正。
- 3D人物、走路动作、NPC、可进入的室内、日常玩法、昼夜和声音尚未接入这段3D预览；全城3D仍暂缓。手机浏览器模拟布局与实际触屏手势/实体设备性能分开记录。

实现参考：[OrbitControls官方文档](https://threejs.org/docs/pages/OrbitControls.html)、[渲染器官方文档](https://threejs.org/docs/pages/WebGLRenderer.html)、[标准材质官方文档](https://threejs.org/docs/pages/MeshStandardMaterial.html)。具体通过情况以本地实际运行和以上测试记录为准。

## 第十四轮：方向按住时不再被路沿带着横移（2026-10-06）

- 用户确认问题是「按住方向键时被带着沿路边横移」。复现为碰撞自动把被阻挡的方向投影到边缘切线；在长椅旁斜路沿，持续向下会变成向左下沿边移动，不是松键后的惯性或原画变化。
- 碰撞现在只保留明显顺着边缘的输入；若需要把玩家方向转过30°以上才能贴边移动，就停在实际接触处。意图按当前画面计算，包括左右观察和上下微调，避免原画坐标与屏幕方向不一致。主动斜着沿墙走、反向离开边缘和原有点击寻路仍可用。
- 新增三档道路取景的持续顶边／松开／改向检查，覆盖20/60/120fps及四组最大观察角度。新增防横移测试在旧逻辑下失败，在修正后通过；原有斜向贴墙、门前往返、跨区换景与长椅测试继续通过。**386/386测试、lint与生产构建（含类型检查）通过**，日志在`source/.verification/curb-slide-v14-*.log`。
- 实际页面以方向按钮持续按住复测斜俯、平视和沿路取景：触边后两次读取世界坐标一致，脚底保持有效，不再自动横移。另检查主动沿边、反向离开、椅前到场与起身。实际运行截图见[路沿停步画面](art-direction/step-25-2d-curb-intent-v14.png)，操作数据在本地`source/.verification/curb-slide-v14-browser-proof.json`。本轮未重测实体键盘长按、手机触屏和所有街道边缘组合。
- 修改前备份：`D:/projects/sinefine-backups/curb-slide-20261006-v14`。只调整2D小样碰撞响应及回归检查，既有背景、人物素材、镜头过渡、门前通路、长椅、主游戏生活／AI／存档和3D对照保持原状。仍留在`feat/art-samples`本地，未commit/push。预览为`http://localhost:3004/fate/art-sample`。

## 第十三轮：树下长椅坐下与起身（2026-10-06）

- 2D试点的「树下长椅」现在可坐：远处可从地点标记打开「走过去坐下」，也可点底部「树下长椅」。先沿已有铺装走到椅前，真正到场后才坐下；附近按E或点「坐在长椅上」也可使用。
- 坐着时按E／「起身继续走」起身，方向键或新目的地会先起身再行走。途中停止、手动改向、打开其他地点或切到后台会取消尚未完成的坐下请求；已经坐下的人物保留坐姿。没有增加生活进度、需求恢复或AI请求。
- 使用内置imagegen生成独立透明坐姿；保留现有人物身份、紫色服饰与融合版环境，未改动七幅背景或行走素材。前三格分别对应斜俯、沿路和平视，臀部单独对齐每幅画里的椅面；坐着切换角度仍保持坐姿。原始素材与完整提示词见[长椅坐姿素材记录](art-direction/step-25-bench-seat-prompts.md)。
- 椅面是交互锚点，行走坐标保留在已经验证过的铺石空地。椅子、花丛与围墙继续不可穿过；起身从同一个安全点恢复寻路，未扩大碰撞范围。坐姿淡入尊重减少动态效果设置。
- **383/383测试、全量lint与生产构建（含类型检查）通过**。新增三档椅前往返、实际到场才坐下、取消不延迟坐下、椅面与铺装区分及RGBA素材尺寸检查；本地测试日志在`source/.verification/bench-seat-v13-final-tests.log`。
- 实际页面走通主街→小巷→支路，从道路打开长椅详情并步行到场坐下；坐着切平视→沿路→斜俯保持世界坐标不变。E起身／坐下、交互按钮切换姿态、方向按钮起身行走、起身后走到支路住宅门前、途中停止与手动改向取消坐下均通过。126%放大与一次R观察／C回正后仍坐在椅面，页面无错误／警告，生产服务错误日志为空。[长椅实际画面](art-direction/step-25-2d-bench-seat-v13.png)，逐项记录在本地`source/.verification/bench-seat-v13-browser-proof.json`；预览为`http://localhost:3004/fate/art-sample`。本轮未重测实体触屏和所有连续微调角度。
- 修改前备份：`D:/projects/sinefine-backups/bench-seat-20261006-v13`。仍仅在`feat/art-samples`本地修改，未commit/push；基础生活、AI、存档与3D对照保持原状。

## 第十二轮：保持道路取景，修正临界点退回俯视（2026-10-06）

- 用户确认：走到支路住宅右侧墙边前选中「平视前路」，跳变后突然成为俯视画面。本轮只检查2D试点的自动换景，保留第十轮融合版原画和第十一轮门前通行。
- 找到并用回归检查复现一处兜底缺陷：地区判定暂落到小巷、但脚底仍在道路上时，原逻辑会在巷内取景失败后直接选道路俯视图。修改前检查失败于`start/alley/eye`，实际返回`street`；这能产生用户描述的切换类型，但原截图之前的完整操作序列未取得，不宣称逐帧重现了那次操作。
- 沿路／平视兜底现在先按真实脚底所属地区寻找同档位道路取景，仍逐幅检查可见铺装，不再自动退回俯视。真正进入小巷仍正常看向巷内，出巷恢复所选道路角度；没有搬动人物或关闭碰撞。地区控制与实际选定画面同步，避免按钮仍按错误地区控制换景。
- 新增两组回归：所有地点在三种临时地区判定下保持沿路／平视并落脚于铺装；20/60/120fps下从支路住宅门前走到截图附近原画约`(805,462)`再返回，逐帧检查不退回俯视、不触发无关换景、不受阻且准确到场。
- **379/379测试、全量lint、生产构建和构建内类型检查通过。** 日志保存在本地`source/.verification/view-cut-v12-final-*.log`。实际页面验证另行记录，不把坐标回归等同于视觉验收。
- 更新后的生产页面实际走通主街→小巷→支路、支路住宅门前到场，再走到原画约`(805,462)`并持续向右手动走到约`(1124,464)`；道路始终显示`neighborhood-eye`且脚底有效。经小巷返回主街`(992,490)`后恢复`street-eye`，没有退回俯视。主动切到沿路再回平视仍可用，人物坐标保持；页面无控制台错误／警告，预览服务错误日志为空。[墙边平视实际画面](art-direction/step-25-2d-eye-continuity-v12.png)，逐项页面记录在本地`source/.verification/view-cut-v12-browser-proof.json`。预览为`http://localhost:3004/fate/art-sample`；未重测实体触屏或每一种连续微调角度。
- 修改前备份：`D:/projects/sinefine-backups/view-cut-20261006-v12`。本轮只改导航取景、2D组件和对应测试／记录，生活、AI、存档、3D对照不变；仍留在`feat/art-samples`本地，未commit/push。

## 第十一轮：平视路边与门前通行修正（2026-10-06）

- 按用户反馈检查主街咖啡店前、林荫支路路边与住宅门前。旧生产页面实测中，点击主街平视原画约`(805,450)`、支路约`(450,600)`的可见铺装均被提示为建筑或树丛；问题是旧俯视轮廓继续裁掉了其他取景中的人行道。
- 只扩展连接道路的上侧人行道，新增范围必须同时通过沿路、平视两幅原画的独立铺装边界与脚底碰撞检查。远处前景、院墙、花盆、自行车和长椅周围的障碍继续受约束；寻路不再把旧俯视边界重复施加到有效人行道上。
- 咖啡店入口附近两处投影参考点校准，消除过度压缩的局部转换；沿路稿补上自行车后轮到门前实际开放的铺装。没有搬动原有地点或通过关闭碰撞让人物到场；投影三角形仍保持可逆、不折叠。
- 新增三组回归：误挡路面点击与建筑／道具拒绝；从人行道抵达主街两处门前、支路住宅／店面及经小巷返回；20/60/120fps下路边手动行走和咖啡店近距离靠近。逐帧检查人物在当前绘画中的落脚，原有碰墙后离开、前景与出巷检查继续通过。
- **377/377测试、全量lint与生产构建通过，构建内类型检查通过。** 测试日志留在本地`source/.verification/road-edge-v11-final-tests.log`。实际页面检查记录在本节后续条目，不把坐标测试当作视觉验收。
- 更新后的生产页面已实际点击上述两处误挡路面并走到指定位置，未再出现建筑／树丛拒绝。主街从人行道抵达咖啡店门前约`(810,431)`，按E打开咖啡店预览；支路路边持续前进可到外墙边，再向右行走能离开并继续沿街移动。随后经小巷返回主街住宅门前，按E打开住宅预览，保持平视且人物脚底在铺装上。
- 支路住宅通过画面中的「支路住宅门前」标记及「走到门前」抵达平视原画约`(603,504)`，按E打开正确住宅预览；门口切到沿路再回平视，人物坐标保持不变且继续正常落脚。页面无控制台错误／警告，预览服务错误日志为空。当前门前交互仍是2D小样的地点查看，未新增室内。实际截图：[支路门前落脚](art-direction/step-25-2d-curb-door-v11.png)、[咖啡店到场与E查看](art-direction/step-25-2d-cafe-door-v11.png)。本地预览为`http://localhost:3004/fate/art-sample`；本轮未重测实体触屏或全部手动角度。
- 修改前备份：`D:/projects/sinefine-backups/road-edge-20261006-v11`。本轮只修正2D小样的通行／坐标及对应测试，保留第十轮融合版原画；基础生活、AI、存档、3D对照不变，仍留在`feat/art-samples`本地，未commit/push。

## 第十轮：地点辨识度、自然光影与树种细节（2026-10-06）

- 按用户追加要求精修现有小区域，保留融合版日式动画背景画风，区分住宅、咖啡店、小巷、支路街角店与长椅小庭。通过门窗材质、陶盆细纹和不同花木建立辨识度，没有仅靠全局调色区分地区。
- 主街住宅采用暖杉木、米白院墙与白栀子；咖啡店保留蓝灰雨篷，增加细滚边、焦糖木框、铜灯和珊瑚天竺葵。小巷有蕨类、常春藤和薄苔；支路住宅有蓝紫绣球、苔绿百叶和粉蓝釉盆，街角店有白色玛格丽特，长椅小庭有粉色皋月杜鹃。自行车、门前黑板、盆栽位置和入口铺装保留。
- 用户进一步指出光影不自然、树种单一，最终稿重画了过密的碎叶影：用较完整的冠影、连贯枝影、疏密变化和留白的受光地面呈现方向性日光，阴影保留适量冷色天空补光。主街按樟树长椭圆叶、榉树细叶和通透枝条、绿枫尖裂叶区分；支路结合银杏扇叶、庭院枫叶与远处松针层次，配合蕨、窄叶草和花灌木。
- 当前七幅完整背景均为1672×941、不透明：主街斜俯为 `residential-cafe-v5.png`，其余六幅为对应 `v4.png`。主街／支路各有斜俯、沿路和平视稿，另有小巷前路稿；每幅基于自己的原画编辑，参考同一光影和地点特征，没有用独立建筑图片拼接。
- 代码只更换三处素材引用：`fate-art-sample.ts`、`fate-art-alley.ts`、`fate-art-views.ts`。本轮没有更改人物、速度、寻路、碰撞、地点坐标、镜头或UI布局。修改前41个相关文件已备份，旧v1原画保留；未采用的本轮中间稿归档在 `D:/projects/sinefine-backups/art-detail-20261006-v10/discarded-drafts`。
- 已完成374项功能回归；最终素材接入后重新通过全量lint与生产构建（含类型检查）。另对28处门口、井盖、排水口、墙脚和长椅参考边缘做只读对照，多数最佳偏移为0—2像素；支路排水口纹样相关性较低，此对照仅帮助检查布局，不代表整幅图逐像素一致。最终仍以实际行走、换景和到场检查为准。
- 最终生产页面实测：七幅背景与人物图均完整加载；主街和支路的斜俯／沿路／平视切换保留人物坐标与落脚。保持平视走到支路，再到长椅与支路住宅门前，按E均能打开对应地点预览；随后经小巷返回主街 `(992,490)`，恢复平视且人物落在路面。页面无控制台错误／警告，服务错误日志为空。本轮没有重新测试实体触屏或每一档手动观察角度。
- 生成方式、全部最终素材路径与实际提交的完整提示词见[第十轮精修记录](art-direction/step-25-detail-identity-prompts.md)。[主街实际画面](art-direction/step-25-2d-detail-main-v10.png)、[主街平视](art-direction/step-25-2d-detail-main-eye-v10.png)、[小巷前路](art-direction/step-25-2d-detail-alley-v10.png)、[支路总览](art-direction/step-25-2d-detail-leafy-v10.png)、[支路平视](art-direction/step-25-2d-detail-leafy-eye-v10.png)。截图来自运行页面，不是另外制作的效果图。
- 仍只在 `feat/art-samples` 的2D试点内精修；全城、基础生活、AI、存档和3D对照保持原状。本轮没有commit、push或部署；画面是否达到用户期望仍待实际试看，不以技术检查代替审美评价。

## 第九轮：林荫支路前景卡住与人物消失（2026-10-06）

- 坐标回测复现了隐形边界：从平视原画约`(1350,800)`向左下走，旧俯视T形道路轮廓会在约`(1341,809)`挡住人物，虽然平视画面仍是道路。还发现部分位置允许移动、却不满足当前原画的显示条件。
- 只补充支路道路原画中实际开放的前景连接；院墙、庭院和右侧花园继续受原轮廓及各幅原画的独立边界约束。脚底范围按实际绘制的路面检查，避免把压缩透视下的脚底偏移误映射成另一处墙体。手动移动、地面点击和换景使用一致的落脚条件。
- 沿路视角提前进入小巷；支路入口与出口在双方均覆盖的位置切换，并保留进出判定距离。圆滑转弯同时检查后半段路线，跨区域寻路继续使用原有门口走廊，不跨庭院抄近路。当前画面不足以覆盖人物时，保持能够落脚的取景，按钮与提示反映实际画面。
- 优先使用已有门口连接点进行跨区寻路，必要时才检查额外绕障点；同一冷启动坐标回测中，主街到支路的首次路线计算约从8.6秒降到0.6秒。缓存有固定容量，未更改人物速度或基础生活机制。
- **374/374测试、全量lint与生产构建通过，构建内类型检查通过。** 新增20/60/120fps前景向下／左下穿过旧边界、前景换角度的落脚覆盖、不可见边缘拒绝与返回路线检查；地点往返还逐帧检查当前绘画覆盖脚底。此前出巷不回跳、贴墙离开和全量功能回归继续通过。
- 最终生产页面实际走通主街→小巷→林荫支路。手动走到平视原画约`(1352,801)`，交替按左、下键走到约`(1294,867)`，过程中人物持续可见，脚底保持在路面上。随后抵达支路住宅门前、按E打开地点预览，再经小巷返回主街终点；页面无错误／警告，服务错误日志为空。
- [前景向左下移动后的实际画面](art-direction/step-25-2d-leafy-ground-v9.png)。本地预览：`http://localhost:3004/fate/art-sample`。本轮未重新验收实体触屏或所有手动观察角度；范围仍是这段2D试点。
- 修改前备份：`D:/projects/sinefine-backups/leafy-ground-20261006-v9`。保留融合版原画，修改留在`feat/art-samples`本地；未commit/push，未改生活、AI、存档和3D对照。

## 第八轮：保持平视出巷后的落脚与换景（2026-10-06）

- 用户反馈：一直选择平视，从小巷走回主街后人物悬在咖啡店外墙上。刷新前的具体悬空位置未在新会话中重现，不能据此认定只是缓存；新增针对手动出巷和实际绘制位置的检查。
- 检查复现了另一个出口缺口：沿巷内画面向下走，人物会先超过小巷铺装底边，再按旧世界坐标阈值换景。现改为在两幅画面均可落脚的重叠路面提前切换，并保留进出滞回。
- 实际手动出巷还复现了连续按键导致镜头退回小巷：新按键沿主街画面移动，但旧进入条件把出口附近再次当成巷内。进巷现在要求更深入巷口，进出边界同时参考世界位置和画面位置，避免出口来回切景。
- 换景目标增加实际画面铺装校验；如果所选道路取景没有覆盖人物脚底，使用仍覆盖当前位置的场景，不挪动人物来配合画面。沿路和平视人物改用与点击、碰撞和地点标记相同的屏幕脚底锚点；旧取景失去落脚覆盖时，不继续把人物画在墙面上。
- **371/371测试、全量lint和生产构建通过，构建内类型检查通过。** 新增20/60/120fps下保持沿路／平视、从巷内手动出巷的脚底覆盖检查；检查隐藏巷内位置换道路取景时不改人物坐标，以及连续新按键出巷只切换一次、不回跳。
- 更新后的生产预览实际验证：始终选择平视，先步行进入小巷，再逐次按S走出；切回主街后继续按键，画面保持主街平视，脚底仍在路面上。再次进巷并使用“返回主街”也正常到达。页面无控制台错误／警告，预览服务错误日志为空；本轮未重测实体触屏或所有角度，原截图中的具体悬空姿态仍未在新会话复现。
- [手动出巷实际画面](art-direction/step-25-2d-alley-exit-v8.png)、[返回主街实际画面](art-direction/step-25-2d-return-street-v8.png)。本地预览：`http://localhost:3004/fate/art-sample`。
- 修改前备份：`D:/projects/sinefine-backups/road-view-footing-20261006-v8`。仍只修改`feat/art-samples`的2D小样，未commit/push。

## 第七轮：支路卡住与绕路修正（2026-10-06）

- 用户实际点击支路前景仍会卡住或绕大圈。此前地点往返检查没有覆盖任意路面点击；此次定位到路口铺装碰撞缝、按旧坐标选择绕路，以及跨透视接缝时按键方向被拉偏。
- 补齐T形路口两块铺装之间的窄缝，保留院墙与庭院边界。道路取景按当前画面的通路和距离寻路，窄门口仍可回退到经过碰撞验证的走廊路线。复现中的近距离路径从约851像素绕行缩为约172像素直行，与两点画面距离一致。
- 手动输入沿画面方向跨过投影接缝；斜碰墙只保留沿墙分量。碰撞修正也受本帧步幅限制，避免门前狭窄投影放大位移。点击路线按实际到达消费拐点，一帧可连续走完多个短段；遇到阻挡最多重新寻路两次，无法通过时停止并提示。
- **368/368自动测试、全量lint和生产构建通过，构建内类型检查通过。** 覆盖四幅道路取景的最大角度、直行与斜行、沿墙移动；20/60/120fps下前景近距离直行、接缝方向和到达一致，并检查短拐点连续推进、碰撞后不会误报到场。
- 最终生产页面实际走通主街→小巷→林荫支路，复核前景两次近距离点击、连续向右移动、长椅到场及E查看；向墙行走停止，随后换沿路取景重新选路可离开，再恢复平视。页面控制台无错误／警告，服务错误日志为空。本轮未重做实体触屏或所有场景的逐帧视觉验收。
- [本轮实际运行截图](art-direction/step-25-2d-road-navigation-v7.png)：人物从长椅走回支路前景后正常到达。保留融合版原画和有限角度2D取景，未改生活、AI、存档或3D对照。
- 修改前备份：`D:/projects/sinefine-backups/road-navigation-20261006-v7`。全部修改留在`feat/art-samples`本地，未commit/push。

## 第六轮：行走连续性和画面碰撞收尾（2026-10-06）

- 仅修正 `/fate/art-sample`。保留融合版原画和三种取景，未重新绘图或扩大试点，也未改动生活、AI、存档和3D对照。
- 步幅按整段投影距离计算，跨投影三角形时分小步推进；点击路线逐个转角行走，避免低帧率下跨过多个拐点抄进墙角。门口局部坐标同时校准，全部投影三角形保持无折叠。
- 四幅沿路／平视原画分别描出真实铺装边界。人物脚底检查墙基、花盆、自行车和石柱；两种道路取景共用安全行走空间，换取景不搬动人物。不能仅凭原地图坐标推断一块画面是路。
- 咖啡店门前及长椅入口补安全绕行节点。寻路预留间距在合法墙边起点逐渐增加，碰墙后仍可点击目的地离开；实际脚底碰撞全程保留。沿路／平视在巷口提前切到巷内，设置进出滞回，避免墙挡住前路及边界反复切换。
- **364/364 自动测试、类型检查、全量lint和生产构建通过。** 新检查覆盖六处起止点在三种取景下的全部往返、20fps行走和过弯、最大角度手动移动、碰墙后重新寻路，以及独立画面墙体拒绝。自动检查不代替逐帧视觉验收或实体设备性能测试。
- 最终生产预览实际验证：平视下住宅门前按E查看；+18°／+5°下反复向墙行走会停在墙前，随后点击咖啡店可离开，途中改为沿路仍完成到达。咖啡店经小巷到支路、长椅绕石柱到场并按E查看、原地沿路→平视切换和碰墙后返回主街均通过，返回恢复平视；页面无控制台错误／警告，服务日志无错误。本轮没有重新模拟实体触屏或多设备帧率。
- [本轮实际运行截图](art-direction/step-25-2d-road-collision-v6.png)：人物站在长椅前铺装空地，保留三档取景与地点入口。这仍是有限角度2D小样，非360°连续环绕。
- 本轮修改前备份：`D:/projects/sinefine-backups/road-collision-resume-20261006`。修改留在 `feat/art-samples` 本地，未commit/push。

## 第五轮：主街和支路也可沿路看、平视前路（2026-10-05）

- 继续限定在 `feat/art-samples` 的住宅街区试点。画面左上新增「斜俯看 / 沿路看 / 平视前路」，V循环切换；主街和林荫支路均可选择。进巷自动看向巷内，出巷恢复所选档位。三种取景均可行走、点击路面、到门口或长椅交互。
- 新补四幅完整融合版街景，平视包含天空、建筑立面与前方道路。四份项目素材及完整内置 image_gen 提示词见[本轮素材记录](art-direction/step-25-road-view-prompts.md)，未覆盖此前原画。
- 左右观察由±10°扩至±18°，上下微调由±3°扩至±5°；右键/Shift拖动、Q/R与滑杆均可操作。平视与沿路采用保持建筑竖线的透视观察，修正直接转动原俯视网格造成的画面倾斜；原斜俯取景继续保留。
- 共用一套人物位置、路线和目的地。每幅画校准路面、住宅门口、店面及长椅，含地面边界的投影正反变换；路面三角形无折叠。人物按远近缩放，步幅按投影距离调整。取景切换先完整遮盖再换画，保留缩放和行走目标，换取景的短暂期间暂停迈步；正在按住的方向在松键前保持原世界方向。
- 所有取景共用一个渲染器，画面资源按需建立并缓存，离开预览统一释放。缺少WebGL时保留三档原画取景、行走、拖动与缩放，禁用连续角度微调。
- **359/359自动测试、类型检查、全量lint和生产构建通过。** 新增检查覆盖全路面及门口的双向投影、墙体拒绝、屏幕方向、远近比例、最大角度、平视建筑竖线、不同帧率的完整遮罩和快速反复切换。
- 桌面实际验证：主街沿路/平视切换位置832/566不变；沿路点击地面前行；主街经小巷到支路，切到平视后走到长椅并按E查看，再返回主街恢复平视；行走途中换档未丢失目标。平视最大+18°/+5°下路面点击和W行走正常，咖啡店门前交互通过。
- 390×844模拟手机：三个档位可操作，缩放105%→126%后换档仍为126%，可拖动画面再定位人物，页面宽度与内容宽度均为390。实测左右-18°、上下+5°；最终页面无控制台错误/警告，预览服务无错误。实体触屏手势、多机性能和所有路线的逐帧视觉验收仍未完成。
- 运行截图：[支路沿路](art-direction/step-25-2d-road-along-v5.png)、[支路平视](art-direction/step-25-2d-road-eye-v5.png)。这是有遮罩衔接的多幅完整2D取景与有限角度观察，**不是连续360°环绕，也不提供建筑背面**。各视角细节一致性仍按小样继续验收；未接入主游戏美术、未改基础生活/AI/存档或3D对照，未commit/push。
- 修改前备份：`D:/projects/sinefine-backups/road-facing-before-20261005`。

## 第二轮：预设斜看与连续微调结合

- 仅修改 `feat/art-samples` 内这段2D预览。沿用同一幅场景和人物原图，原配色、光影与笔触保留；没有重新生成图片或改主线生活、对话、存档。
- 保留原视角，左/右预设为±8°；水平可连续调整到±10°，俯视高低±3°。转向有平滑过渡，系统要求减少动态时直接切换。沿街浏览、10%—350%缩放、完整画面与人物跟随继续可用。
- 采用绘画投影加连续深度网格。路面和门前保持平面，立面直线保持笔直，前景与道路产生轻微视差。人物与场景在同一深度空间绘制；点击按实际可见表面判断，建筑和树丛不作为路面。道路下沿另按可见路面补齐，避免可见沥青被过早判为不可达。
- 这是一段有限角度的2.5D绘画场景，**不是完整建模或360°环绕**。原图之外、建筑背面和新的遮挡内容没有凭空补画；极端角度及完整构图可见小样外缘。更大幅度的环绕留给后续基于2D打磨的真实3D。
- 「沿街看看」面板支持按钮、滑杆、键盘及切换拖动模式。角度操作不移动人物；方向键沿屏幕方向行走，门前定位与点击同一套坐标。Esc先关地点卡片/角度面板，再停止行走；打开地点卡片不会把工具栏滚出画面。
- 渲染能力不可用时回到原二维画面与原有行走，提示暂不支持转向。离开预览释放网格、纹理、监听与渲染器；静止时不重复绘制。
- 新增5项测试，覆盖原视角配准、转向前后地面坐标与寻路、屏幕方向和速度、连续网格和门前平面、门框/电线杆/屋檐直线。**332/332测试、全量lint、类型检查与生产构建通过**；没有调用游戏付费AI。
- 桌面实测预设/拖动连续转向、回正、侧看下点击路面、住宅与咖啡店往返、门前查看；拖动转向时人物坐标保持832/566。修复门框弯曲、门前人物上半身被店面遮住、可见路面误判与地点面板导致工具栏滚走的问题。
- 390×844模拟手机实测最大转向-10°、俯视+3°，105%→126%缩放、拖动与定位人物、咖啡店到场；人物完整站在门前。320×740下角度面板、关闭/返回入口无横向溢出，地点卡片开关后场景滚动仍为0。实体触屏双指/右键拖动和多机性能尚未实测。
- 最终生产预览无控制台错误/警告。实际页面截图：`docs/art-direction/step-25-2d-camera-v2.png`。代码及文档留在美术分支本地，未commit/push；3D场景保持上一版。

## 第三轮：走进小巷与转弯衔接（2026-10-05）

- 沿用户确认的同一幅融合版街景，把咖啡店旁可见的石板小巷接入行走范围。下方新增「走进小巷／返回主街」，画面内的小巷标记也可直接前往；仍可点击石板路、WASD或触控方向键行走。终点停在可见树影下，不虚构画面外的后街。
- 路线在巷口留出转弯弧度，只采用完全位于可走路面的圆滑段。每帧跨过短路径段时继续使用剩余行程，避免转角处顿步；围墙、花盆和店面仍不可穿越。
- 默认开启「转弯随行」：镜头略微看向前路，进入巷子时逐渐左看约6°、抬高约0.6°，返回主街时平缓回到原角度。提前给转弯后的构图留出空间，防止遇到画面边缘才突然推回镜头；转向围绕当前人物或观察中心进行。
- 手动预设、滑杆、Q/R或拖动调角度会关闭自动转向，保留玩家选择。观察角度面板可重新开启「转弯随行」。缩放、拖动、定位人物继续保留；系统减少动态效果时不自动转向。
- 修正后方院墙的纵深，避免巷内人物上半身被错误遮住；保持整幅原画、门柱和墙体的连续呈现。常规跟随按转向后的画面范围取景，主动缩小看全图仍可使用。
- 自动检查累计 **339项通过**，覆盖主街/两处门前与巷内双向通行、20/60/120帧率下无卡角或超速、转向缓动、前路预看、镜头取景和最大左右观察角下的身体遮挡。桌面完成进巷/返回、手动角度保持；390×844完成进巷、点石板路移动和方向键接管，无横向溢出。类型、全量lint与生产构建通过，最终本地生产预览无控制台错误/警告。实际画面：`docs/art-direction/step-25-2d-alley-v3.png`。
- 本轮只修改 `feat/art-samples` 的2D小样，未接入主游戏生活、AI、存档，也未修改3D场景。保留本地改动，未commit或push。

## 第四轮：小巷取景与住宅支路试点（2026-10-05）

- 按用户最新要求，先补足进入小巷后的前路，再延伸到一个小区域。范围为主街、咖啡店侧巷、巷尾林荫支路；支路可到住宅门前、街角店与树下长椅。完整3D对照和基础生活、对话、记忆、存档维持原有内容。
- 各处采用整幅连贯绘画背景，沿用已确认融合版的日式住宅、自然光影、动画笔触与舒适斜俯视。没有拆开建筑图片拼成街道。新区域仍为本地独立美术试点，尚未接入主游戏日常。
- 三处视图共用人物世界坐标与连续路线，进出巷口、巷尾时自动换取景，往返不传送或复制人物。转弯提前看路、缓动跟随继续保留；手动微调与缩放不会在过门时重置。
- 转场用短暂的柔和遮罩覆盖取景变化。两幅完整背景直接透明叠加会产生重影，已去掉这种做法。此处是2D绘画视图之间的自动切换，**不是一台镜头连续旋转到90度或自由环绕**。
- 按实际路面补齐巷尾交叉口及门前连接。寻路检查每个道路边界区间，避免较稀的采样漏掉巷口细小障碍而卡住。长椅入口绕过绿篱与石柱，树木、花盆、自行车、家具和庭院不作为可走地面。
- 侧巷与支路按已验证的路面绘制人物前后层次；浅绘画纵深只用于有限观察，不冒充完整实体建筑，避免其近似立面把路上人物错误遮住。主街保留原遮挡方式。
- 静止时不重复绘制；稳定取景只绘制当前视图，过渡才预绘相邻视图。离开预览释放三份场景网格、纹理、渲染器与监听；渲染不可用时保留原画与行走。
- 修正支路在最大斜看角度下的店面拉伸：远侧立面采用连续纵深，入口附近限制纵深变化，不从独立门前多边形拼出突变的立面。
- 自动检查当前 **351/351通过**，包括双向连通、20/60/120帧率过两处边界、门前和长椅路径、屏幕方向、取景范围、转场覆盖及店面不折返拉伸。类型、全量lint与生产构建通过。
- 最终生产预览已实测主街→小巷→支路与反向返回，人物沿路走完、正常停止；支路住宅和店面均可走到，住宅门前按E打开预览。长椅入口绕开绿篱和石柱，人物完整站在铺装区域。最大水平+10°、俯视-3°下店面保持连续，没有此前的条纹拉伸。
- 390×844模拟窄屏实测105%→151%放大、拖动查看、缩小与重新定位，再从主街走到支路；地点卡片开关和底部入口正常，页面/内容宽度均为390。实体手机触屏手势与多设备帧率尚未验收。完成后恢复默认1280×720，最终页面与生产服务无错误/警告。
- 实际运行截图：小巷前路 `docs/art-direction/step-25-2d-alley-facing-v4.png`，住宅支路 `docs/art-direction/step-25-2d-area-pilot-v4.png`。试看地址为 `http://localhost:3004/fate/art-sample`；下方「林荫支路」可以步行穿过小巷，随后「返回主街」原路返回。
- 本轮新增文件仅属于2D美术预览，未commit、push、部署或调用游戏付费AI。

### 新画面与内置生成记录

- 小巷：`source/public/fate/art-sample/cafe-alley-facing-v1.png`，1672×941。内置image_gen编辑，参考输入为主街原画 `source/public/fate/art-sample/residential-cafe-v1.png`；不使用CLI/API备用模式。
- 林荫支路：`source/public/fate/art-sample/leafy-lane-v1.png`，1672×941。内置image_gen编辑，参考输入为上述主街原画及本轮小巷画；不使用CLI/API备用模式。
- 两份原始结果均保留，分别为 `C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-4a2e6259-eb66-4005-99ca-5a58b45ceb3d.png` 与 `C:/Users/Tracy/.codex/generated_images/01a0ae75-7704-7920-899c-e44643287f20/exec-adc5d612-948e-4180-a1a7-ad3a955b679e.png`。
- 修改前检查点：`D:/projects/sinefine-backups/alley-facing-before-20261005`。生成素材是风格延伸；是否达到用户的美术满意度仍按实际试玩评价。

小巷完整提示词：

```text
Use case: stylized-concept / style-transfer
Asset type: a complete background painting for the same 2D Japanese residential game scene.
Input image 1 is the approved style AND architectural continuity reference. Create the view from just inside the narrow side alley between that Japanese house and the cafe, with the camera now looking ALONG THE ALLEY so the player can clearly see the path ahead. Preserve the same lively natural colors, luminous afternoon sunlight, cool blue-grey tree shadows, delicate Japanese anime background painting, soft clean contour edges, credible ordinary Japanese architecture and comfortable composition. Preserve the cream plaster, blue-grey roof tiles, grey concrete/block boundary wall, black/brown simple fences, cafe's warm timber details and restrained potted greenery. This is an ordinary residential lane, not a fantasy or European academy.
Camera: gently oblique overhead, approximately 38 degrees looking down, showing the paving and the sides of buildings. Spacious landscape composition 16:9. It is a 2D painted game background, not a photoreal photograph or 3D render. NO horizon or sky, NO ground-level camera, NO extreme top-down, NO fisheye, NO huge roofs hiding the road.
Layout: a clear continuous paved alley runs from the bottom center foreground toward the upper middle of the image. At the near lower-left edge is the house's low cream/grey boundary wall and a modest dark fence; at the lower-right edge is the cafe's cream side wall with quiet service window, rainpipe and a few small pots set OUTSIDE the walking surface. Its blue-grey awning and bicycle are glimpsed only at the entrance edge, keeping continuity with the original cafe. The whole foreground center must be visible walking surface, not blocked by fences or props. Farther along are layered cream residential facades, simple windows and leafy gardens to the sides. The stone path runs without interruption into a SMALL open bend near the upper-center, where a short residential back lane turns to the right and remains clearly visible. Main central floor area unobstructed, enough usable ground to walk a character several steps beyond the entrance. Ground should occupy around the middle 45 percent of the composition across its full depth, with moderate perspective rather than a vanishing-point tunnel. Back lane is a short natural extension, not a grand city plaza.
Light: same upper-left afternoon light as the reference, clear warm highlights and rich cool shaded areas, softly feathered leaf shadows across light grey stone slabs. Softness from painterly edges and light diffusion, not low saturation or blur. All surfaces belong to ONE coherent perspective and light environment.
No characters, labels, UI, text, borders, collage panels, separate building blocks or pixel art. Keep the scene as one carefully finished continuous painting. Do not copy-paste fragments from the reference: paint the connected alley-facing view with matching architecture and visual style.
```

林荫支路完整提示词：

```text
Use case: stylized concept art and game background, style transfer from two approved source scenes.
Create ONE complete, coherent 2D hand-painted Japanese animation game background, the leafy residential side lane reached after walking through the cafe alley in reference 2. Reference 1 is the main street, reference 2 is the exact adjoining alley. This is an extension of their SAME small neighborhood, with identical visual language, late-afternoon warm upper-left sunlight, cool blue-grey tree shadows, lively natural greens, cream plaster, restrained blue-grey Japanese tiled roofs, natural Japanese residential scale. Preserve the attractive light of reference 1, clean painted animation detail, and calm readable composition. Not pixel art, not photoreal, not flat schematic, not a 3D render, not fantasy academy architecture.
Camera: a comfortable oblique semi-overhead 2D game view, approximately 38 degrees above the ground; house facades are clearly visible, trees and roofs have believable depth, paved walking areas remain easily read. Landscape 16:9, ideally 1672x941 or same aspect ratio. NO sky and no distant horizon.
Layout for actual walking: a narrow stone-paved alley emerges from bottom CENTER into an open quiet T-junction near the middle. The bottom-center approach has clear unobstructed ground from x=700 to 990 in the lower quarter. A gently diagonal local street runs from LEFT to RIGHT across the middle, with continuous warm blue-grey fine asphalt and subtle white edge lines, no traffic. The continuation to the upper-right is visible, no disconnected pavement chunks or hidden dead end. Three modest Japanese homes with small gardens and gated entrances line the far side. One small ordinary corner shop or cafe-side neighborhood entrance fits naturally on the left. A tiny pocket green with ONE wooden bench borders the right sidewalk, accessible from the street with a visible little paved recess. Tree shadows link all streets and pavement naturally. Give the player interesting places to walk between, but leave a generous continuous lane and pavement, clear turns, and visible entry paths. Buildings, walls, plants, bicycle, pots and bench must stay outside the central walkable floor. No large props in the crossing.
Entire image painted as a single coherent environment with continuous ground, correct matching sun and shadows, consistent roof lines and architectural scale, rich but restrained environment detail. Soft painterly shadow edges and leaf highlights, not washed-out low saturation, not overgrown fantasy houses. Do NOT collage buildings, cutout cards, or duplicate existing reference pictures. No people, characters, UI, text, place labels, arrows, map pins, borders, checkerboard, or transparent background. This is the next connected camera view, not an overview map of a city.
```
