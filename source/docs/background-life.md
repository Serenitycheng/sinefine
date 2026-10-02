# 关闭网页后的后台日常

街道页新增「后台日常」：玩家主动开启后，云端每 30 分钟推进 30 个游戏内分钟；每轮最多一次 AI 调用。人物睡眠或没有实际相遇、可执行新选择时可以不调用。网页关闭后仍运行，重新打开时读取最新进度。后台与浏览器同时运行会产生两份世界，因此代管期间本地暂停；点击「暂停后台并接回进度」后恢复本地操控。

**预算：每个游戏账号每天最多 5 元人民币，按北京时间零点重置。** 使用 `deepseek-flash`，关闭思考模式，输出最多 1800 tokens。按 2026-09-30 核对的[官方中文价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)保守计算：百万输入 tokens 2 元、百万输出 tokens 8 元，输入全部按缓存未命中及高峰价计。请求前按 UTF-8 字节上界、消息封装余量和最大输出原子预扣；返回可靠用量后释放多扣部分。超时、未知结果及未完成结算保留预扣。达到下一次调用所需预算时等到次日，不会在重启开关时清零。

此预算覆盖**本功能的后台 AI 调用**，不包含手动交谈、本页原有的自主交谈或同一密钥在其他应用中的消费。当前价格表有效期至北京时间 2026-10-30 00:00；过期后需要核对并更新 `lib/fate-background.ts`，否则暂停后续 AI 调用。费用记录是按上述高峰价估算的保守账本，最终账单以 DeepSeek 为准。

## 首次启用：按顺序完成四步

1. **建表。** 打开用于当前网站的 Supabase 项目，进入 SQL Editor，新建查询，复制并运行 [202609300001_background_life.sql](../supabase/migrations/202609300001_background_life.sql) 全文。已有的账号与加密连接迁移应已运行。此迁移增加 `fate_background_sessions`，不替换现有 `fate_game_saves`。
2. **设置定时密钥并发布。** 在 Vercel 的 `sinefine` 项目 → Settings → Environment Variables 添加服务器变量 `FATE_BACKGROUND_CRON_SECRET`。值使用至少 32 位随机字符串。可在本地终端生成：`node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"`。保留原有四个 Supabase/加密变量。部署包含本功能的新版代码；在本地测试时也要把变量放进 `.env.local` 并重启本地服务。
3. **接通 Supabase 时钟。** 在 Supabase → Integrations → Vault 创建两个 Secret：`sinefine_app_url` 的值是正式网站根地址（例如 `https://sinefine.vercel.app`，以实际域名为准）；`sinefine_background_key` 的值与上一步的定时密钥完全相同。然后在 SQL Editor 运行 [setup-background-cron.sql](../supabase/setup-background-cron.sql) 全文。每分钟检查是否有到期的世界，只有到期才发送 HTTP 请求；每个账号的推进间隔仍为 30 分钟。重复运行此文件会替换同名任务。
4. **由玩家开启。** 在网站「AI 设置」登录游戏账号、保存 DeepSeek 连接；打开街道页，点击「刷新后台状态」，再点击「开启后台代管」。首轮在开启后约 30 分钟执行。以后关闭网页即可，重新打开会接回已同步的进度。

定时密钥只配置在服务器和 Vault 中，不使用 `NEXT_PUBLIC_` 前缀。DeepSeek 密钥沿用现有加密连接，不放进定时请求、存档或 Vault 的这两个 Secret。

[Supabase Cron](https://supabase.com/docs/guides/cron) 支持定时 SQL/HTTP，[官方调度示例](https://supabase.com/docs/guides/functions/schedule-functions)使用 `pg_cron`、`pg_net` 与 Vault。选择此方案是为了兼容 Vercel Hobby：[Vercel 官方限制](https://vercel.com/docs/cron-jobs/usage-and-pricing)目前不允许 Hobby 的 Vercel Cron 每 30 分钟执行。

## 进度和异常处理

- 后台有独立进度位置，不覆盖存档页手动上传的云端快照。每次同步替换本地前沿用「恢复前的进度」备份。
- 自动同步只允许本地仍与开启时或上次同步的内容一致。其他设备、本地编辑或其他标签页产生差异时，明确选择「接回云端并暂停后台」或「保留本地并停止后台」。写入失败不丢弃原进度。
- 后台居民共用现有作息、经济、相遇和关系规则；实际交谈写入事件与对话记录。玩家停在室内时保留其室内位置，其他居民各自行动。
- 定时任务使用数据库租约，重复请求不能重复生成。暂停或更换进度会使旧租约失效；尚在进行的请求不能在之后覆盖进度，费用预扣仍保留。
- AI 密钥删除、余额不足、模型异常或价格表到期时暂停后台并显示原因。网络故障不无限重试；预算不足保持开启，次日继续。漏掉的定时轮次不会一次性补发大量请求。
- 「下轮预计」是数据库的到期时间；实际执行受云平台可用性影响。页面「刷新后台状态」只读取状态，不触发付费调用。

## 核对是否在实际运行

开启 30 分钟后刷新街道页，应看到「已推进」增加、游戏时间前进。Supabase 的 Cron 页面可查看 `sinefine-background-life` 任务记录。SQL Editor 可查询（不含密钥）：

```sql
select enabled, revision, updated_at, next_run_at, budget_day,
       spent_micros / 1000000.0 as conservative_yuan, rounds, notice
from public.fate_background_sessions;
```

Cron 的 SQL 成功不等于 HTTP 或 AI 成功；必须结合上述进度与 Vercel 运行日志检查。尚未创建表/定时密钥/时钟时，应用会显示配置提示并拒绝开启。

## 开发验证

`node scripts/run-tests.mjs` 覆盖费用预扣、未知用量、价格到期、北京时间日期、实际相遇记录、每轮一次调用、睡眠无强制交谈以及室内位置保持。

另可用独立内存 PostgreSQL 检查真实迁移：安装或解包 `@electric-sql/pglite` 后，运行 `node scripts/verify-background-db.mjs <PGlite安装路径>/dist/index.js`。检查版本冲突、重叠租约、5 元边界、重启不清零、次日重置、暂停期间的请求、租约过期和匿名权限。该脚本不连接真实 Supabase、不发 AI 请求。

本次离线检查已通过。2026-10-02 已在正式项目执行数据库迁移，Vercel 与 Supabase Vault 已保存匹配的定时密钥，Cron 任务已启用且最近一次调度成功。用户选择暂不进行付费实测，尚无玩家开启后台代管，**关闭网页后的真实 AI 运行尚未验收**。日后玩家自愿完成第四步，再检查关闭网页 30 分钟的真实结果。
