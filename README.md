# Lexi · 英语单词学习站

一个「扇贝单词」式的英语学习网站：词书浏览、3D 闪卡翻转、SM-2 间隔复习、AI 记忆法、生词本、个人中心与连续打卡，以及基于 Supabase Auth 的邮箱密码账号体系。

技术栈：**Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · Supabase Postgres / Auth · DeepSeek API**。部署目标：**Vercel**。

---

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 词书 | 首页展示 6 本内置词书（日常、商务、雅思、旅行 + 初中 100 词、四级 200 词），进入词书查看单词列表、掌握进度与待复习数量 |
| 闪卡 | 全屏 3D 翻转；正面英文 + 音标 + 词性 + 浏览器 `SpeechSynthesis` 发音，背面中文释义 + 词性 + 例句 + 记忆提示 |
| 拼写测试 | 卡背输入拼写后回车：正确播放 `Excellent!` 并标记「认识」；错误播放 `Keep going!`、显示红色提示和正确拼写，并标记「不认识」 |
| 选择题模式 | 闪卡顶部切换「拼写模式 / 选择题模式」；选择题背面随机给出 4 个中文释义（1 正确 + 3 个随机干扰项），点正确自动标记「认识」，点错误标红正确项并标记「不认识」 |
| 语音反馈 | 直接点「认识 / 模糊 / 不认识」也会播放对应鼓励语，与拼写测试共用 `SpeechSynthesis` |
| 快捷操作 | 点击卡片或空格翻面，`←` / `→` 切词，`Esc` 关闭；输入框内只处理 Esc，方向键和空格不误触 |
| 评分 | 「认识 / 模糊 / 不认识」写入 `UserWord`，按 SM-2 规则更新间隔、easeFactor、repetitions 与掌握度 |
| 今日队列 | 词书只展示「到期复习 + 从未学习」的单词；认识排到未来，不认识 5 分钟后回到今日队列，直到认识为止 |
| 完成提示 | 今日队列为空时显示「今日任务已完成」；若有 5 分钟后重现的词，显示待重学数量与刷新入口 |
| 生词本 | 卡片右上角心形收藏；`/bookmarks` 集中查看、移除、一键闪卡复习 |
| 个人中心 | `/dashboard` 展示昵称、累计掌握单词数、连续打卡天数、已学习/待复习与总进度 |
| 连续打卡 | 每次提交评分时按「今天已学不变 / 昨天学过 +1 / 断签重置为 1」更新 `User.studyStreak` 与 `User.lastStudyDate` |
| AI 记忆法 | 卡背先展示种子词库自带的记忆提示；登录后点击「用 AI 生成三种记忆法」才调用 `/api/generate-memory`，生成「联想 / 词根 / 谐音」三种风格并缓存 |
| 账号 | Supabase Auth 邮箱密码注册/登录；所有 `UserWord` 读写绑定当前登录用户 |
| 预览模式 | 未配置数据库或 Supabase 时，页面仍可用内置 400 个单词跑通浏览与闪卡（登录/保存不可用） |

---

## 本地开发

### 0. 环境要求

- Node.js **20+**（本项目验证于 Node 24）
- npm / pnpm 均可（仓库含 `packageManager` 字段，Vercel 会优先使用 pnpm）
- 一个 Supabase 项目（Postgres + Auth）
- 可选：DeepSeek API Key；不填则记忆法使用内置离线提示

### 1. 安装依赖

```bash
npm install
# 或 pnpm install
```

### 2. 配置环境变量

复制模板：

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

然后填入真实值，四个变量含义见下方[环境变量](#环境变量)。

> `.env` 已被 `.gitignore` 忽略。`.env.example` 只包含占位符，可以提交。

### 3. 初始化数据库

在 Supabase 控制台打开 **Project Settings → Database → Connection string → Session pooler**，复制 URI 填入 `DATABASE_URL`。

```bash
# 应用已有迁移（首次会创建四张表）
npx prisma migrate dev

# 写入 6 本词书、400 个单词（含初中 100 词、四级 200 词）
npx prisma db seed
```

> 如果数据库已经初始化过，重新执行 `npx prisma db seed`（或 `npm run db:seed`）即可增量更新：按 `slug` / `wordBookId + spelling` upsert，新增的两本词书会自动创建，已有单词会更新释义/例句，不会删除你库中不在种子里的词。
>
> 新增的「初中词汇」「四级核心」是独立词书，slug 分别为 `junior-foundation`、`cet4-core`；它们与原有四本词书并存，不覆盖原有进度。
>
> 数据量：6 本词书共 400 词，静态词库源码约 56 KB；写入 Postgres 后仍远小于 Supabase 免费版 500 MB 限制，seed 不调用任何外部 AI / 付费接口。
>
> 如果你修改了 `prisma/schema.prisma`，用 `npx prisma migrate dev --name <变更名>` 生成新迁移。
> 生产环境只执行 `npx prisma migrate deploy`，不要执行 `migrate dev`。

### 4. 启动

```bash
npm run dev
```

打开 <http://localhost:3000>。首次注册如果开启了邮箱确认，需要到邮箱点击确认链接；回调地址会落到 `/auth/callback`。

### 5. 构建校验

```bash
npm run build
npm start
```

`npm run build` 依次执行：清理旧的 `.next` → `prisma generate` → `tsc --noEmit` → `next build`。

---

## 环境变量

| 变量 | 端 | 必填 | 用途 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 服务端 | 是（接数据库时） | Supabase Postgres 连接串，Prisma 使用 |
| `NEXT_PUBLIC_SUPABASE_URL` | 客户端可见 | 是（用账号时） | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 客户端可见 | 是（用账号时） | Supabase anon public key，受 RLS 保护 |
| `DEEPSEEK_API_KEY` | **仅服务端** | 否 | 调用 DeepSeek 生成记忆法；不填则走离线提示 |

安全红线：

- **`DEEPSEEK_API_KEY` 绝不能加 `NEXT_PUBLIC_` 前缀**，也不能出现在任何客户端组件里。当前只在 `src/app/api/generate-memory/route.ts` 的服务端代码中读取。
- **Supabase `service_role` key 本项目完全不需要**。不要把它写进 `.env`、Vercel 环境变量或代码；浏览器只使用 anon key + 用户 session。
- 不要把 `.env`、`.env.production`、数据库密码提交到 Git。
- 迁移已对 `users`、`word_books`、`words`、`user_words` 开启 RLS 且未创建 anon 策略。浏览器不直连这些表；Prisma 使用服务端数据库角色访问。

---

## Supabase 配置

### 数据库

1. 新建 Supabase 项目，保存数据库密码。
2. 在 **Project Settings → Database** 复制 **Session pooler** 连接串（端口 `5432`），替换 `DATABASE_URL`。
3. 若连接报 SSL 错误，在 URI 末尾加 `?sslmode=require`。
4. 执行 `npx prisma migrate dev` 与 `npx prisma db seed`。

### Auth（邮箱密码）

1. **Authentication → Providers → Email**：启用 Email provider。
2. 本地开发可关闭 **Confirm email** 以便注册后直接登录；开启时注册后需点邮件确认。
3. **Authentication → URL Configuration**：
   - Site URL：`http://localhost:3000`（生产改为正式域名）
   - Redirect URLs 追加：
     - `http://localhost:3000/auth/callback`
     - `https://<你的域名>/auth/callback`
4. 注册时代码会带上 `emailRedirectTo = <origin>/auth/callback`，因此上述回调地址必须存在于允许列表。

### 数据隔离

- 登录态由 `@supabase/ssr` 在 `src/proxy.ts` 中刷新，服务端通过 `getViewer()` / `requireViewer()` 取得当前用户。
- 所有 `/api/review`、`/api/bookmarks` 查询都带 `userId = viewer.id` 条件；`UserWord` 有 `@@unique([userId, wordId])`。
- `UserWord` 的写入使用 upsert，只会命中当前用户自己的行。

---

## DeepSeek 记忆法

服务端路由：`POST /api/generate-memory`

```json
{ "wordId": "..." }
```

或传词库内的拼写（服务端会回查 `Word` 表）：

```json
{ "spelling": "serendipity" }
```

返回：

```json
{
  "memory": {
    "association": "把……联想成……",
    "root": "serendip + ity ……",
    "mnemonic": "谐音「……」"
  },
  "source": "ai",
  "model": "deepseek-v4.1-flash"
}
```

- 调用地址：`https://api.deepseek.com/chat/completions`（OpenAI 兼容）
- 模型：`deepseek-v4.1-flash`
- 要求 `response_format: { "type": "json_object" }`，服务端校验三个字段
- 25 秒超时；模块级 Map 最多缓存 200 个单词
- 无 Key → `source: "preview"`；上游失败 → `source: "fallback"`，卡片仍展示内置记忆提示
- 只有登录用户可调用，避免匿名刷接口

---

## API

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/words?book=<slug>&random=1&limit=20&scope=review` | 否（登录后按用户过滤） | 默认只返回当前用户「到期 + 未学习」的今日队列；`scope=all` 用于选择题干扰项等需要全量词库的场景；返回 `{ words, total, totalWords, completed, pendingToday, nextReviewAt, source }` |
| `POST` | `/api/review` | 是 | `{ wordId, rating: "known" \| "fuzzy" \| "unknown" }`，更新 SM-2、打卡天数，返回 `{ userWord, rating, studyStreak, studyDay }` |
| `GET` | `/api/bookmarks` | 是 | 当前用户收藏列表 `{ bookmarks, source }` |
| `POST` | `/api/bookmarks` | 是 | `{ wordId, bookmarked?: boolean }`，upsert 收藏状态 |
| `DELETE` | `/api/bookmarks?wordId=<id>` | 是 | 取消收藏 |
| `POST` | `/api/generate-memory` | 是 | `{ wordId }` 或 `{ spelling }`，生成三种记忆提示 |
| `GET` | `/auth/callback?code=...` | — | Supabase 邮箱确认/魔法链接回调，交换 session 后重定向 |

错误格式统一为：

```json
{ "error": "请先登录后再保存学习记录。", "code": "AUTH_REQUIRED" }
```

常见状态码：`400` 参数错误、`401` 未登录、`404` 单词不存在、`503` 数据库未配置或不可用、`500` 其他错误。

### SM-2 规则

| 评分 | interval | repetitions | easeFactor | mastery | nextReviewAt |
| --- | --- | --- | --- | --- | --- |
| 认识 | `max(2, round(当前 interval × 2))` 天 | +1 | +0.1（上限 3.0） | +1（上限 5） | 当前时间 + interval 天（至少 2 天后） |
| 模糊 | 不变（至少 1 天） | 不变 | −0.05（下限 1.3） | 不变 | 当前时间 + interval 天 |
| 不认识 | 0（进入重学队列） | 重置为 0 | −0.2（下限 1.3） | 重置为 0 | 当前时间 + 5 分钟 |

`nextReviewAt` 是完整的日期时间；今日队列的过滤条件是 `nextReviewAt <= now` 或从未生成 `UserWord`。不认识的词 5 分钟后再次到期，直到某次点「认识」后按至少 2 天排期。掌握度达到 `MASTERED_AT = 4` 视为已掌握。

### 今日队列与完成判定

- 词书详情与 `/api/words` 默认只返回两类词：`UserWord.nextReviewAt <= now` 的到期词，以及没有 `UserWord` 的未学习词。
- 认识的词进入未来（首次 2 天、之后 4/8… 天），因此明天不会重复出现在队列里；中途退出后，已认识的词也不会再出现。
- 不认识的词 `interval = 0`、`nextReviewAt = now + 5 分钟`；5 分钟后重新进入队列。
- 队列为空时，如果还有今天稍后要重现的不认识词，页面显示「还有 N 个词将在约 X 分钟后回到队列」；否则显示「今日任务已完成」。
- `GET /api/words` 的 `completed` 只在队列为空且没有待重学词时为 `true`；`pendingToday` 是今日稍后重现的数量。

### 连续学习天数

`User.studyStreak` 与 `User.lastStudyDate` 由 `POST /api/review` 维护，日期按 **Asia/Shanghai** 计算，`lastStudyDate` 用 Postgres `DATE` 存储：

| 提交评分时的状态 | studyStreak |
| --- | --- |
| 今天已经评价过 | 不变 |
| 上次学习是昨天 | +1 |
| 首次学习 / 断签一天以上 | 重置为 1 |

评分写入与打卡更新在同一个 Prisma 事务中；事务先锁住当前用户行（`SELECT ... FOR UPDATE`），避免两次快速提交把同一天重复加一。首页和 `/dashboard` 都直接读取这个字段，因此两处显示一致。

---

## 项目结构

```text
.
├─ prisma/
│  ├─ schema.prisma                 # User / WordBook / Word / UserWord
│  ├─ seed.ts                       # 幂等写入内置词书与单词
│  └─ migrations/
│     ├─ migration_lock.toml
│     ├─ 20261030234500_init/
│     │  └─ migration.sql           # 建表、索引、级联 FK、启用 RLS
│     └─ 20261102211000_add_study_streak/
│        └─ migration.sql           # users.study_streak / last_study_date
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # 全局字体、Header/Footer
│  │  ├─ page.tsx                   # 词书首页 + 今日统计
│  │  ├─ globals.css                # Tailwind 4 主题与 3D 翻转样式
│  │  ├─ books/[slug]/page.tsx      # 词书详情 + 单词列表
│  │  ├─ bookmarks/page.tsx         # 生词本
│  │  ├─ dashboard/page.tsx         # 个人中心 + 打卡统计
│  │  ├─ login/page.tsx             # 登录/注册
│  │  ├─ auth/callback/route.ts     # Supabase Auth 回调
│  │  └─ api/
│  │     ├─ words/route.ts
│  │     ├─ review/route.ts
│  │     ├─ bookmarks/route.ts
│  │     └─ generate-memory/route.ts
│  ├─ components/
│  │  ├─ flashcard/flashcard.tsx    # 3D 闪卡、拼写/选择题、发音、评分、收藏、AI 记忆
│  │  ├─ word-list.tsx              # 筛选/搜索/开始复习
│  │  ├─ bookmarks-view.tsx         # 生词本列表与复习
│  │  ├─ auth/auth-form.tsx         # 邮箱密码表单
│  │  ├─ auth/sign-out-button.tsx
│  │  ├─ site-header.tsx / site-nav.tsx / site-footer.tsx
│  ├─ lib/
│  │  ├─ prisma.ts                  # Prisma 单例
│  │  ├─ auth.ts                    # getViewer / requireViewer / User 镜像
│  │  ├─ data.ts                    # 数据访问 + 无库预览回退
│  │  ├─ sm2.ts                     # 间隔更新
│  │  ├─ study-streak.ts            # Asia/Shanghai 学习日与连续打卡推进
│  │  ├─ supabase/{client,server,config}.ts
│  │  ├─ api-error.ts / redirect.ts
│  │  ├─ wordbook-data.ts           # 6 本词书 / 400 词种子入口
│  │  ├─ vocabulary-extra.ts        # 原 4 本词书扩充的 76 个高频词
│  │  ├─ vocabulary-junior.ts       # 初中基础 100 词（静态）
│  │  ├─ vocabulary-cet4.ts         # 四级核心 200 词（静态）
│  │  ├─ vocabulary-exam.ts         # 初中 / 四级两本新词书定义
│  │  └─ types.ts
│  └─ proxy.ts                      # Supabase session 刷新（Next 16 的 middleware）
├─ .env.example
├─ vercel.json
└─ package.json
```

说明：

- Next.js 16 中 `middleware.ts` 已由 `proxy.ts` 取代；`cookies()`、动态路由 `params` 均为异步 API。
- `src/lib/data.ts` 在所有数据库查询失败或未配置时回退到内置数据，并返回 `source: "preview"`，因此页面不会白屏。
- `next.config.ts` 中 `typescript.ignoreBuildErrors` 为 `true`，因为 `npm run build` 已先执行独立的 `tsc --noEmit`；`experimental.workerThreads` 用于受限 CI/沙箱环境避免子进程 `spawn EPERM`；`serverExternalPackages: ["@prisma/client"]` 让 Prisma 保留为运行时依赖。
- `scripts/clean-next.mjs` 在每次构建前删除 `.next`。Windows 上 Next 会把 Prisma client 以 junction 放进 `.next/node_modules`，第二次构建可能无法删除该 junction（`EPERM`）；清理后 `npm run build` 可重复执行。

---

## Vercel 部署

### 1. 推送代码

```bash
git init
git add .
git commit -m "feat: Lexi vocabulary app"
git branch -M main
git remote add origin <你的 GitHub 仓库>
git push -u origin main
```

确认 `.env` 没有被提交（`git status` 不应出现它）。

### 2. 导入 Vercel

1. 打开 <https://vercel.com/new>，选择该仓库。
2. Framework Preset 选 **Next.js**；根目录保持默认。
3. Build Command 会读取 `vercel.json` 中的：
   ```bash
   node scripts/clean-next.mjs && prisma generate && tsc --noEmit && next build
   ```
4. Install Command 保持默认（Vercel 根据 `packageManager` 使用 pnpm）。
5. 在 **Environment Variables** 中添加：
   - `DATABASE_URL`（Production / Preview 都加）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DEEPSEEK_API_KEY`（只加服务端环境，不要加 `NEXT_PUBLIC_`）
6. Deploy。

> 环境变量修改后需要 **Redeploy** 才会进入新构建。`NEXT_PUBLIC_*` 在构建时内联，尤其要重新构建。

### 3. 生产数据库迁移

部署前（或首次部署后）在本机对生产库执行一次：

```bash
# macOS / Linux
DATABASE_URL="<生产 Session pooler URI>" npx prisma migrate deploy
DATABASE_URL="<生产 Session pooler URI>" npx prisma db seed
```

```powershell
# Windows PowerShell
$env:DATABASE_URL="<生产 Session pooler URI>"
npx prisma migrate deploy
npx prisma db seed
Remove-Item Env:DATABASE_URL
```

不要在 Vercel Build Command 里跑 `migrate deploy`（每次构建都会执行，且构建环境不应承担迁移职责）。也可以用 GitHub Actions 在部署前单独跑迁移。

### 4. 生产 Auth 回调

在 Supabase **Authentication → URL Configuration** 加入：

- Site URL：`https://<你的 vercel 域名>`
- Redirect URL：`https://<你的 vercel 域名>/auth/callback`

如果使用自定义域名，两处都要改成自定义域名。

### 5. 部署后自检

- `/` 能看到 6 本词书（数据库已 seed 时不再显示 Preview 标记；含「初中词汇」「四级核心」）
- 注册 → 邮箱确认 → 登录
- 进入「初中词汇」应看到 100 词，进入「四级核心」应看到 200 词；每张卡都显示词性、释义和双语例句
- 进入词书 → 点单词 → 翻转 → 发音 → 评分
- 新账号首次进入时，词书只显示未学习词；点「认识」后刷新，该词不再出现（排到至少 2 天后）
- 点「不认识」后，队列为空会显示约 5 分钟后重现；等待或刷新后该词重新出现，直到点「认识」
- 学习到一半关闭闪卡再刷新，已认识的词不再出现，未认识/到期的词仍在队列
- 卡背输入正确/错误拼写，确认语音鼓励、红色纠错提示与自动评分都符合预期
- 切到「选择题模式」翻面，确认 4 个中文释义不重复；点正确项自动进入下一题，点错误项能看到红色正确项与「不认识」记录
- 心形收藏 → `/bookmarks` 能看到并移除
- 登录状态下翻到卡背，点击「用 AI 生成三种记忆法」（无 Key 时显示离线提示）
- 退出登录后 `/bookmarks` 会显示登录引导，不展示任何收藏数据

---

## 常用命令

```bash
npm run dev          # 开发服务器
npm run build        # 清理 .next + prisma generate + tsc --noEmit + next build
npm start            # 生产服务器（先 build）
npm run lint         # ESLint
npm run typecheck    # 仅类型检查
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy
npm run db:seed      # 写入/更新种子词书
npm run db:studio    # Prisma Studio
```

生产服务启动后可以做一次快速自检（默认检查 `http://127.0.0.1:3100`）：

```bash
node scripts/smoke-test.mjs
# 换端口：SMOKE_BASE_URL=http://127.0.0.1:3101 node scripts/smoke-test.mjs
```

Windows 上如果 pnpm 报符号链接/递归栈错误，可使用：

```bash
pnpm install --node-linker=hoisted --package-import-method=copy
```

---

## 常见问题

**页面显示 Preview 标记 / 登录不可用**

说明 `DATABASE_URL` 或 Supabase 公开变量未配置。复制 `.env.example` 为 `.env`，填好后重启 `npm run dev`。

**注册后没有立刻登录**

Supabase 开启了 Confirm email。到邮箱点确认链接，或到 Authentication → Providers → Email 关闭确认。

**登录后 API 返回 401**

检查浏览器是否带 Supabase session cookie；`src/proxy.ts` 的 matcher 不应排除页面路由。清理站点 cookie 后重试。

**`prisma migrate dev` 连接失败**

Supabase 免费项目可能只提供 IPv6 直连；请优先使用 **Session pooler** 地址（端口 5432），不要用 `db.<ref>.supabase.co` 直连。密码含特殊字符时要 URL 编码。

如果 `prisma migrate dev` 报创建 **shadow database** 失败（Session pooler 通常不允许跨库连接），临时把 `DATABASE_URL` 换成 Supabase 的 **Direct connection**（`db.<ref>.supabase.co:5432`）执行一次迁移，成功后切回 Session pooler。生产环境只用 `prisma migrate deploy`，它不需要 shadow database。

**构建时 `spawn EPERM` / worker 错误**

本项目已开启 `experimental.workerThreads` 并把类型检查移到独立 `tsc`。若仍失败，检查 CI 是否禁止子进程；Vercel 默认环境不需要额外处理。

**AI 记忆法一直显示“离线提示”**

未配置 `DEEPSEEK_API_KEY`，或上游返回错误/超时。检查 Vercel 服务端环境变量与 DeepSeek 账户余额；接口失败不会影响评分与收藏。

---

## 安全清单

- ✅ `DEEPSEEK_API_KEY` 仅在 Route Handler 服务端读取
- ✅ 不使用 Supabase `service_role` key
- ✅ `.env` 被 Git 忽略，`.env.example` 只含占位符
- ✅ 所有用户数据 API 都从 session 取 `userId`，不接受客户端传入的 userId
- ✅ `next` 回跳参数经过 `sanitizeNextPath`，阻止 open redirect
- ✅ 四张业务表启用 RLS，浏览器不直查数据库
- ✅ 错误响应不包含 API Key、数据库连接串或堆栈
