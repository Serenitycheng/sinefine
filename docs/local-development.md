# SINE FINE 本地开发

当前工作仓库：`D:\projects\sinefine`。应用目录：`source/`。

新一轮先读 [精简交接](development-handoff.md) 与根 `AGENTS.md`，按 [低流量工作流](low-traffic-development.md) 执行。大型新阶段使用新普通会话，不复制旧长聊天和截图历史。

## 安装与启动

使用 Node.js **24.x**（完整安装包含 npm），在仓库根目录运行：

已有依赖时跳过安装；先检查当前预览服务与端口，能复用就不另开同用途服务。安装本身需要联网，日常渲染／测试不需要重装依赖。

```powershell
.\sinefine.ps1 install
.\sinefine.ps1 dev
```

打开终端输出的本地地址，通常是 `http://localhost:3000`。按 Ctrl+C 停止。
脚本优先使用系统 npm；本机没有系统 npm 时，也支持已下载到 `.local-tools/npm/` 的临时工具。
临时工具不纳入版本控制，新电脑应安装完整的 Node.js 24。

也可以进入 `source/`，使用标准的 `npm ci` 和 `npm run dev`。
依赖按 `package-lock.json` 安装，避免在恢复阶段同时升级框架。

## 验证命令

```powershell
.\sinefine.ps1 test
.\sinefine.ps1 typecheck
.\sinefine.ps1 lint
.\sinefine.ps1 build
```

构建完成后，运行 `.\sinefine.ps1 start` 可检查生产模式。
测试使用 Node 内建测试工具和项目已有的 TypeScript，不调用真实 DeepSeek，不读写云端业务数据。

## 本地功能与可选云服务

- 街道漫游、人物日常、预设对话、世界设定及本地存档无需云端密钥。
- 自由世界 `/create` 与自然界 `/nature` 也可离线进行本地模拟，分别保存、导入与导出；玩法与边界见 [其他模式说明](other-modes.md)。
- DeepSeek 对话在应用的 AI 设置中由用户配置连接。
- 云端账号及加密连接需要 Supabase 和原加密密钥。参考 `source/.env.example`，将开发环境配置写入 `source/.env.local`。
- 复制空模板不代表云服务已经配置完成。开发环境应使用独立数据库；不要对恢复备份中的原生产库执行初始化或迁移。
- Fate 游戏进度自动保存在浏览器；Fate 存档页现可手动上传、预览恢复或下载同账号的一份云端进度。云端功能还需执行游戏存档迁移，详见 [云端存档配置](../source/docs/cloud-game-saves.md)。未配置时仍可通过文件在设备间转移存档。

## 恢复备份与开发代码

`history/`、`legacy/`、`recovered/` 是历史恢复资料。开发使用 `source/`。
`RECOVERY-MANIFEST.json` 与 `VERIFY.py` 校验的是 2026-09-09 的原始备份，修改受校验的源码后出现哈希差异属于预期；不要重写旧清单掩盖开发变更。

依赖、构建产物、测试临时文件和 `.env.local` 已纳入 `.gitignore`。新功能以普通 Git 差异和相应测试记录跟踪。
