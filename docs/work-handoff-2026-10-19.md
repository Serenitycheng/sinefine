# Sinefine·无终之庭｜新 Work 交接

更新：2026-10-19。依据当前工作区、现有验证记录及已完成操作整理；不需要导入旧聊天或历史截图。**先读本文件，旧交接中的历史部署、PID、测试数量不能当作当前状态。**

## 1. 目录与必读规则

- 仓库：`D:/projects/sinefine`；应用：`D:/projects/sinefine/source`。
- Git：`https://github.com/Serenitycheng/sinefine.git`；当前分支 `feat/art-samples`，HEAD `3aa1a6a`。继续前重新核对实际状态。
- 必读：根 `AGENTS.md`、`source/AGENTS.md`、`docs/low-traffic-development.md`；再按任务读取 `docs/development-handoff.md` 顶部当前阶段。
- 编辑 Next/React 前，按 `source/AGENTS.md` 阅读已安装版本的 `source/node_modules/next/dist/docs/` 对应指南。

## 2. 当前任务与停点

**上一批五项已完成**：人物／家具比例、交互短动作、物件特写、镜头与全屏界面、环境声音。伊莉雅站立显示比原约高 43%，仍低于主要成年角色；这是显示校准，不是原作身高数值。具体见 `docs/embodiment-polish-2026-10-19.md`。

**收尾轮次已于 2026-10-19 继续完成**：正式阅读／保存／刷新／回街及花店→远坂的连续流程已补验，水槽柜边与窄屏交互正常。全屏 API 缺失／拒绝时新增沉浸模式，并验证退出、跨房与回街；标准全屏保留。详见 [本轮收尾记录](finish-playtest-2026-10-19.md)。

- 独立来源 `http://sinefine-finish-20261019.localhost:3009/fate/street`，未使用用户主存档来源。
- 伊莉雅房间 E 阅读、保存与刷新恢复身份／read 姿势／坐标 `(676.462,261.971)`／125% 倍率，起身原路回街；沿街前往花店，双室和水槽／陶盆分别交互，再沿街前往远坂书房。
- 390×844 窄屏窗边 E 查看与保存／刷新恢复 `(568.875,335.352)` 通过，无横向溢出。最终构建验证沉浸模式 390×844 尺寸、静置收起／Tab 唤回／Esc 与按钮退出、跨房／回街、标准全屏进出，页面错误为零。
- 本轮 738/738 回归通过；全屏替代修复后代码检查、类型检查、生产构建通过。居民让行有自动回归覆盖，未冒充密集人群浏览器试玩。
- 下一步交用户试玩比例、动作和真机触摸，按具体反馈修正；不重做已合格素材。3009 隔离预览已恢复，进程以实际状态为准。当前详细状态以 `docs/development-handoff.md` 顶部和收尾记录为准；下方原交接快照仅作历史证据。
## 3. 必须保留的决定与功能

- 保留柔和融合版画风、现有 React/CSS 与 2.5D 技术路线：背景原画＋世界地面配准＋人物动作＋本地碰撞／寻路。不能把当前场景说成可自由旋转的完整 3D。
- 保持角色身份；进花店等建筑不能把伊莉雅换成樱。走近物件显示就近提示，E／点提示应有反馈；房间门口直接走入即可通行。
- 保留全屏、横屏画布比例、缩放与柔和跟随；默认新室内 125%，已有保存倍率保留。声音默认关闭、仅本机合成，无音频下载。
- 保留住处／地点 ID、原地图与存档世界坐标、本地／云存档、家庭生活、需求与日常安排、交谈、记忆、邀约和小帮忙等基础机制，不扩建库存／经营系统。
- 娜塔莉亚与切嗣同住；韦伯住宅采用成年形象。藤村家、肯尼斯、娜塔莉亚旧居继续跳过扩建。
- 保护全部未提交工作、原素材及恢复档案。不 reset／clean，不擅自覆盖或清理；**用户自行 commit／push／发布，代理不暂存、不提交、不推送、不部署。** 不改代理或系统设置，不自动做真实云 AI／数据库测试。

## 4. 改动文件、验证与边界

写本文前 Git 状态：**44 个已跟踪文件修改、50 个未跟踪文件、暂存区为空**，均为累计待交付工作；本文另新增一个文档。未提交内容并不只属于刚启动的收尾轮次。完整清单以 `git status --short` 为准。

关键入口与累计改动（以下路径相对仓库根）：

- 场景与正式接入：`source/components/fate-city-art.tsx`、`fate-city-interior.tsx`、`fate-house-game.tsx`、`fate-emiya-house.tsx`、`street-walk.tsx` 及对应 CSS；`street-life-panel.tsx`、`street-life-reminder.tsx` 等界面文件也有待提交修改。
- 比例／动作：`source/lib/fate-actor-proportions.ts`、`fate-house-sprites.ts`、`fate-house-walk.ts`、`fate-preview-presentation.ts`、`fate-preview-house.ts`；`source/components/fate-interaction-motion.tsx`／`.module.css`、`source/lib/fate-interaction-motion.ts`；卫宫与各宅原有数据文件另有累计修改。
- 碰撞／交互：`source/lib/fate-interior-{access,contacts,geometry,interaction,occlusion,traffic}.ts`、`fate-interior-contact-data.json`、`fate-city-interior-{navigation,scenes}.ts`；`fate-emiya-access.ts`、人物 frame-clips JSON 等。
- 特写：`source/lib/fate-interior-{detail.ts,closeup-data.json}`、`source/components/fate-interior-detail.tsx`／`.module.css`。62 区域、177 操作各有取景登记。
- 镜头／窗口／声音：`source/lib/fate-room-camera.ts`、`fate-game-viewport.ts`、`fate-audio.ts`、`fate-city-art-camera.ts`、`fate-emiya-camera.ts`；`source/components/use-{room-camera,play-chrome,fate-audio}.ts`、`fate-game-frame.*`、`fate-fullscreen-button.tsx`、`fate-play-chrome.module.css`、`fate-sound-button.tsx`。
- 加载：`source/lib/fate-art-loader.ts`、`fate-interior-loading.ts`、`fate-street-sprite-cell.ts`。人物解码后与影子一起显示，动作按需加载，相邻背景限量预热。
- 测试：`source/tests/fate-embodiment.test.ts`、`fate-experience.test.ts`、`fate-game-viewport.test.ts`、`fate-interior-*.test.ts`、`fate-city-preview-visit.test.ts` 及已有住宅／加载测试的修改。
- 文档：`docs/development-handoff.md` 及 Git 状态中的各阶段独立记录。本批未修改原 `source/public/fate/` 素材。

**已验证**：

- 上一批最终源码：**738/738 测试通过**，受影响代码检查、类型检查、生产构建通过；交接时 `git diff --check` 通过。
- 上一批浏览器实走：花店入口、双室往返、看花、包装台重复 E、坐起、全屏收起／Tab 唤回、声音开关；独立记录中卫宫士郎实际到书房并 E 阅读，身份与动作正确。
- 证据：`source/.verification/embodiment-20261019/{tests,build,lint,typecheck,server}.log`。此次仅交接，未重跑这些检查，也未发布线上。
- 新收尾快照：`source/.verification/playtest-20261019/{worktree-before.patch,status-before.txt,worktree-at-handoff.patch}`，均被忽略，不提交。

**已知边界／待验证**：

- 手部动作仍是原人物裁片局部动画与已有姿势，未做到精确手扶物；新比例仍需用户实际观感确认，转身／起停和逐脚支撑可继续打磨。
- 全地图几何与自动检查已覆盖，但不等于 62 区域每个动作均在浏览器手动验收；密集会车、像素级柜边仍需重点试玩。
- 此轮正式保存／刷新／回街流程已补完；真实手机、外置音频、正式网络冷加载未验证。窄视窗模拟不等于真机触摸验收。
- 全屏按钮已加入沉浸式替代，并验证 API 缺失／拒绝与标准全屏；占满网页视窗不能保证隐藏手机地址栏，仍需真机试玩。
- 当前线上部署版本未查询，不能把本地构建成功写成线上已更新。

## 5. 启动、测试与文档

Node.js 24.x，已有依赖；先检查端口，不重复安装或启动。交接时 3009 监听 PID 为 14228，仅作快照，下次以实际进程为准。现有 `.next/` 是上述最终生产构建；**不要在同一服务使用它时原地构建**，先核实并停止本任务拥有的预览。

仓库根命令（脚本可使用已存在的本地 npm）：

```powershell
Set-Location D:/projects/sinefine
.\sinefine.ps1 dev
.\sinefine.ps1 test
.\sinefine.ps1 typecheck
.\sinefine.ps1 lint
.\sinefine.ps1 build
.\sinefine.ps1 start
```

应用目录标准命令：`npm run dev -- --port 3009`、`npm test`、`npm run typecheck`、`npm run lint`、`npm run build`、`npm run start -- --port 3009`。若当前工具环境仅有 Node，可用 `node scripts/run-tests.mjs`、`node node_modules/typescript/bin/tsc --noEmit --incremental false`；构建应先执行 `node scripts/build-runtime-art.mjs`，再运行 `node node_modules/next/dist/bin/next build`。

本地隔离生产预览已有启动器：在 `source/` 运行 `node .verification/interior-audit-20261016/start-local.mjs`，它在进程内清空服务端云配置，不修改 `.env.local`。该文件被忽略，若更换电脑须检查是否存在，不从聊天索取密钥。

- `/fate/street`：正式玩法／主存档；验收使用独立 localhost 来源，保留用户原来源记录。
- `/fate/city-art`：全城美术预览，不等于正式 NPC 生活／主存档。
- `/fate/emiya-life`：卫宫独立试玩记录。
- 必要记录：`docs/local-development.md`、`docs/embodiment-polish-2026-10-19.md`、`docs/experience-polish-2026-10-19.md`、`docs/full-map-contact-audit-2026-10-18.md`、`docs/play-window-and-closeups-2026-10-19.md`。
- 功能优先读 DOM／坐标／状态；必要视觉副本用 `node scripts/art-workflow.mjs review <图片路径>`，默认最长边 1280、JPEG 质量 80，保存在 `source/.verification/art-review/`。不循环截图、不重新导入旧图。

## 6. 本次流量现象（未确定原因）

用户观察：任务运行时 `codex.exe` 发送约 **1,308,454 字节/秒**；暂停一分钟后降至约 **1,206 字节/秒**。这是用户提供的进程发送速率，尚未独立复测，不能直接当作单次模型请求体大小。

怀疑长上下文使请求体过大，**尚未验证**；此次未测量请求体，也未确认历史图片是否每次重复发送，不能据此认定原因或宣称已修复。新 Work 使用当前本地仓库和本文件，不复制整段聊天／截图；若后续诊断，只在本地汇总少量脱敏字节统计及同期进程流量，不上传请求正文、完整日志或密钥，不改客户端／代理设置。
