# 第 25 条：长椅坐姿素材

- 使用内置 imagegen 工具，以现有 `illya-walk-v1.png` 为人物参考。
- 输出：`source/public/fate/art-sample/illya-sit-v1.png`，1254 × 1254 RGBA；原始透明度保留，未改动街景或行走素材。
- 实际四格尺寸为 627 × 627。前三格分别用于斜俯、沿路和平视；第四格为同次生成的备用表情，当前未使用。
- 坐姿按每张完整街景的椅面单独对齐；行走坐标保留在椅前铺石空地，起身后仍可正常寻路。

## 最终生成提示词

```text
Use case: stylized-concept.
Asset type: production transparent 2D game sprite atlas for sitting on an existing bench, not a scene.
Primary request: create a 1024 x 1024 PNG with actual alpha transparency, an exact 2 by 2 grid of four 512 x 512 cells. Each cell contains only the SAME silver-haired anime girl in a natural relaxed sitting pose. Reference image 1 is the existing walking sprite atlas: preserve her face, red eyes, purple flat-topped hat, long silver hair, purple double-breasted winter coat with silver buttons, white scarf, purple boots, slender chibi proportions and softly painted Japanese anime style. The current game has hand-painted Japanese residential streets; this is the matching character, not a new character.
Composition: put a complete seated character in the center of each cell, with generous transparent padding; never clip the hat, hair or boots. Hips supported by an INVISIBLE bench, torso upright and relaxed, thighs going forward toward camera, knees naturally bent at about 90 degrees, legs together, boots descending below knees, hands resting gently on lap. Coat fabric naturally folds over thighs; no standing pose, no crouching, no squashed standing sprite. The imaginary seat surface is horizontal. No actual chair or bench in any cell.
Views: upper left: elevated oblique camera about 40 degrees above, character faces diagonally toward the lower left of the screen. Upper right: moderately elevated camera about 20 degrees above, same seated direction toward viewer-left. Lower left: nearly eye level about 5 degrees above seat, character faces viewer slightly toward the left, both legs visibly bent naturally. Lower right: same eye-level seated front-left view with a subtle head turn toward the street. Preserve exact identity, outfit, proportions and pose anatomy across cells; only viewing angle changes.
Lighting: soft natural warm daylight, mild readable shading, no hard glossy rim, no heavy black outlines.
Constraints: pure actual transparent background, clean alpha edges, no baked checkerboard, no opaque color backdrop, no scene, no chair, no bench, no ground, no cast shadow, no text, no labels, no cell borders, no extra props, no extra people. Clearly seated silhouettes, two arms and two legs each. Hand-painted animation background compatible character rendering, not pixel art, not 3D.
```
