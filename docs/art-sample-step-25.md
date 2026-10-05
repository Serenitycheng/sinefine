# 第25条：住宅街与咖啡店美术小样

日期：2026-10-05。状态：2D可行走预览与3D可旋转场景均有独立初版；画风、人物动作和美术质量仍待用户实际评价。

分支：`feat/art-samples`。这两份小样的代码、素材、依赖、验证和后续修改统一保存在此分支；基于 `main` 的 `25257de`（小样之前的功能与玩法成果）继续开发，未经另行安排不合入主线。2026-10-05 已按用户要求拆分保存；下文“未commit、push”的表述记录制作当时的状态。

## 范围与画风

- 一处普通日式住宅、一段连续路面、一条短侧巷和街角咖啡店，固定斜俯视。自然日光、蓝瓦、暖色院墙、鲜活绿植与冷色树影，延续已确认的融合版。
- 建筑、院墙、步道和咖啡店一次绘制在完整场景中；人物行走时移动同一张场景的镜头，不在独立建筑图片之间切换。
- 伊莉雅使用新的非Q版四方向、每方向六帧二维人物。依据原立绘保留身份和衣着；逐帧测量身体中心、脚底和高度，运行时对齐，原始透明像素保留。
- 主游戏顶部新增「美术小样」入口。小样有键盘、点地行走、触控方向键、拖动、滚轮/按钮缩放、完整构图、回到人物、地点标记及门前查看。
- 这处画面研究独立于生活、对话、记忆、物品、时间、云端与存档。没有替换全城地图、展开新玩法、恢复旧风格或3D实验。

## 本地查看

- 页面：`http://localhost:3004/fate/art-sample`。
- WASD/方向键行走，点路面前往，拖动画面；走近住宅或咖啡店可按E查看。Esc关闭卡片或停止。
- 下方「住宅门前」「咖啡店」可实际走到两个门前；不瞬移、不进入尚未制作的小样室内。
- 「完整画面」查看整个构图；「定位人物」保留倍率。手机默认显示人物所在局部，拖动或行走可看到另一端。

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
- 画面是绘制场景的二维平移/缩放，不提供旋转或建筑背面；未扩展全城衔接、昼夜变换、室内或多人物互动。
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
- 新增Three.js 0.186.1与类型0.186.0，保留npm锁文件。仅3D预览按需加载渲染器，主游戏与2D预览不会因此加载3D场景。
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
