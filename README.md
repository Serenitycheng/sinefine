# SINE FINE｜无终之庭

SINE FINE 是围绕人物日常、关系与世界观察的模拟项目，包括 Fate 冬木街区、原创世界和自然模式。基础日常与本地存档无需付费 AI。

## 当前代码与能力

- `main`：人物身份与日程、道路行走、住宅进出、现场对话、基础生活活动、关系与事件记录；包含本地备份、恢复和多页面冲突保护。
- Fate 可选连接 DeepSeek；Supabase 提供游戏账号、加密连接与手动云端存档槽。手动上传与恢复不等于实时跨设备同步。
- 原创世界支持设定人物与规则、运行本地日常；自然模式提供生态观察与干预。两者的存档与 Fate 分开，并未接入相同的云端槽和后台 AI。
- 关闭网页后的后台日常是可选功能，需 Supabase 定时配置，最多每 30 分钟推进一轮。真实付费后台运行尚未完成验收；应用内预算不覆盖其他 AI 调用。
- 开发分支 [`feat/art-samples`](https://github.com/Serenitycheng/sinefine/tree/feat/art-samples) 已有独立 2.5D 街道美术与卫宫宅家庭玩法，当前分支基线为 `1b59e35`，尚未合入 `main`。Vercel 已有该提交的 Ready 部署记录；它与正式域名是否指向该版本仍需分别核对。

目前仍在原型与样板完善阶段，完整全城室内、全角色动作与自由环视的 3D 城市尚未完成。规则测试不等于真实设备、云端账单或全部场景已验收。

## 技术栈与运行

Next.js 16、React 19、TypeScript、Tailwind CSS；Supabase 与 DeepSeek 为可选云服务。主分支使用 React/CSS 的 2D 场景；开发分支另有 2.5D 美术与 Three.js 对照样板。

需要 Node.js 24.x 与 npm。应用在 `source/`，从仓库根目录执行：

```powershell
cd source
npm ci
npm run dev
```

访问 `http://localhost:3000`。验证与生产运行：

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

## 环境变量与部署

本地规则模拟无需云端密钥。启用自己的云服务时，参考 [`source/.env.example`](source/.env.example)，将值放在 `source/.env.local` 或 Vercel：

- `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`：云端账号与存档服务。
- `FATE_VAULT_SECRET`：服务端连接加密。
- `FATE_BACKGROUND_CRON_SECRET`：仅用于主动启用的后台调度；还需 Supabase Vault 中的 `sinefine_app_url`、`sinefine_background_key` 和对应 Cron。

DeepSeek 连接在应用内配置并加密保存。不要公开 API Key、服务角色密钥、加密密钥或恢复码。

已有 Vercel 项目名为 `sinefine`。使用 Next.js，Root Directory 为 `source`；生产部署应选择已验收的分支与提交，并核对部署结果。云端存档和后台功能还需在自己的 Supabase 项目执行相应迁移与配置，详见[本地开发](docs/local-development.md)、[云端存档](source/docs/cloud-game-saves.md)和[后台日常](source/docs/background-life.md)。本 README 更新不合并开发分支、不改变定时任务或部署设置。

`source/` 是应用；`docs/` 保存开发与验证记录；`history/`、`legacy/`、`recovered/` 和 `data/` 是历史资料与恢复快照。历史数据、备份及素材的公开范围仍需审查；它们不能代表当前云端业务状态。
