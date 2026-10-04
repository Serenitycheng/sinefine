> 历史验收：下文描述第 14 条当时的画面。旧 v1 建筑图集已在 2026-10-04 移出活动工程，当前使用[融合版图集](art-direction-step-17.md)，旧素材路径不再是当前文件。

# 第 14 条验收：2D 场景美术、镜头与操作手感

日期：2026-09-30 开始，2026-10-01 完成。工作目录：`D:\projects\sinefine-recovery`。

## 实际画面与操作

- 连续街区和俯瞰图改用同一份 2D 绘制数据；角色走过街道、桥和河岸时，建筑不会换成另一张背景图。14 个地点共用旧地图的入口与存档坐标，因此不改变日常模拟的地理关系。
- 建筑由一张 4×4 透明图集提供，住宅、柳洞寺、教会、学园、咖啡店、商店及河岸公园各有辨识度。普通建筑作为沿街布景，道路、草地、树木、水面与路灯保持统一画法。地点卡的旧插画仍用于卡片。
- 镜头按可见空间计算缩放，贴近人物并平滑跟随。选择不同人物时过渡移动；切回俯瞰图可快速看全城。缩放可以用画面按钮、桌面滚轮或触屏双指，点地位置使用当前显示镜头反算；降低人物手动步速，避免近景走得过快。
- 十处住宅有不同房间排列。家具、碰撞、房间提示、NPC 站位和交谈范围按住宅布局一致移动。旧室内坐标自动迁到同一逻辑房间；新室内位置记录布局版本，重复读取不再迁移。
- 夜间场景压暗街区并点亮路灯与地点入口；室内原有夜间灯光继续适用。新增图集在角色素材一起预载，场景组件避免每帧重复绘制 React 节点。

## 美术资产

- 源文件：`source/public/fate/environment/fuyuki-building-atlas-v1.png`，1254×1254，RGBA，约 2.98 MB。
- 游戏文件：`source/public/fate/environment/fuyuki-building-atlas-v1.webp`，同尺寸，约 744 KB。由源 PNG 编码为 WebP，画面未作局部修改。
- 使用 Codex 内置 imagegen 生成透明 4×4 手绘建筑图集。提示词要点：*production-ready transparent environment sprite atlas for a continuous 2D Japanese town life game; single square, exact four columns and rows, 16 isolated objects, consistent elevated three-quarter front view and lighting, entrances at bottom center; nuanced hand-painted anime RPG textures with tiles, timber, brick, windows and plants; ten distinct family residences plus Buddhist temple, Gothic chapel, Japanese school, corner cafe, paired shops, riverbank park and modern mixed-use building; no people, UI, labels, flat vector blocks or city-wide painting.*
- 这套画面是冬木市区域关系的风格化游戏表达，不宣称与 Fate 原作平面图逐栋对应。具体区域取舍仍以[冬木市地图说明](fuyuki-geography.md)为准。

## 验证与边界

- 自动检查：186 项测试全部通过；TypeScript、oxlint、Next.js 生产构建通过。测试覆盖 14 地点图集来源、背景建筑不挡路、桌面与手机镜头坐标、十处住宅四房间可达、旧存档迁移与现行坐标复读。
- 本地浏览器：桌面 1254×628、手机宽 390；查看白天与夜间街区、整城俯瞰、地图目录、远坂宅重排后的房间，点击室内地面确实到达走廊；最终地图图标可打开对应地点详情。页面无 JavaScript 错误。桌面连续抽样 90 帧平均约 18 ms，最高 67 ms，其中 2 帧超过 33 ms；不把这次短样本等同于长期性能保证。
- 触屏方向键和双指缩放具备入口与防误点处理，实际手机多点触控、实体手柄及长时间低端设备运行尚待第 15 条发布验收。第 14 条交付的是连续 2D 街区；可环视的 3D 街区与人物模型在最后一条。
