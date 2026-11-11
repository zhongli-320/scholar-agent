# ScholarAgent

面向高校学生和研究者的公开学术检索智能体。匿名用户可检索 OpenAlex 并查看论文详情；登录用户可使用 GLM 智能检索、项目收藏、笔记、引用导出和检索历史。

## 本地运行

需要 Node.js 20.9 或更高版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

在 `.env.local` 中填写：

- `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：可公开的 Supabase 客户端配置。
- `GLM_API_KEY`、`GLM_BASE_URL`：智谱官方服务端配置。
- `GLM_MODEL=glm-5.3-flash`：第一优先模型；`GLM_FALLBACK_MODEL=GLM-4.7-Flash`：同平台备用模型。
- `SILICONFLOW_API_KEY`、`SILICONFLOW_BASE_URL`、`SILICONFLOW_MODEL`：第三优先的 SiliconFlow 备用模型，仅存放在服务端。
- `OPENALEX_API_KEY`：OpenAlex 服务端 API key。2026 年 11 月后，公开应用和游标翻页需要该 key；不要提交到 Git。
- `OPENALEX_MAILTO`：请求联系人，保留用于兼容和运维标识。
- `AI_DAILY_LIMIT=2`：每账户每日智能检索次数。

## 数据库

在目标 Supabase 项目的 SQL Editor 执行：

`supabase/migrations/20261110160000_create_scholar_agent_schema.sql`

迁移会创建 `projects`、`saved_works`、`search_history`、`ai_daily_usage`，启用 RLS，并创建原子额度函数。客户端不得使用 secret/service-role key。

## 验证

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

## Vercel 部署

1. 将仓库导入 Vercel。
2. 在 Production 环境配置 `.env.example` 中的变量。
3. 部署后，将 Vercel 域名加入 Supabase Authentication 的 Site URL 和 Redirect URLs，回调路径为 `/auth/callback`。
4. 用匿名窗口验证普通检索；用两个账户验证 RLS、每日两次额度、项目和历史隔离。

OpenAlex 的免费 key 有每日预算，中文覆盖范围取决于 OpenAlex 实际收录。

智能检索依次调用 `glm-5.3-flash`、GLM 4.7 和 SiliconFlow。只有超时、网络错误、429、529 或 5xx 才会切换备用模型；鉴权、地址或模型配置错误会直接提示。任一模型生成有效检索方案后才扣一次额度，全部失败则不扣额度并退回普通检索。
