# 家计记账 · Kakei

一个自用的记账网页 App。界面沿用 Industry 蓝图设计语言（直角、发丝边框、四角十字标记、
Barlow Condensed 数字），数据存在你自己的 Supabase 项目里，登录后多设备共用一份账本。

- **每日** — 月度收支概览、预算进度、周条、当天流水、往前几天
- **月度** — 分类环形图、预算完成度、分类明细表、近六月柱状、最大三笔
- **年度** — 年收支、逐月柱状（可点选）、支出热力日历、分类年度合计
- **总计** — 净结余与累计曲线、月均/日均/储蓄率/笔数、资产账户
- **设置** — 货币、深浅主题、每月预算、分类管理、导出 CSV、退出登录

只登录、不注册：账号在 Supabase 控制台手动创建，配合关掉项目的注册开关，
陌生人拿到网址也进不来。

> 设计稿里「提醒与备份」一节按需求暂未实现。

## 一、准备 Supabase

1. 在 [supabase.com](https://supabase.com) 新建一个项目。
2. 打开 **SQL Editor**，把仓库里的 [`supabase/schema.sql`](supabase/schema.sql) 整段粘进去执行。
   它会建好 `settings` / `categories` / `entries` / `accounts` 四张表，开启行级安全
   （每个账号只能读写自己的数据），并在注册时自动写入默认分类与账户。
3. 打开 **Project Settings → API**，记下 `Project URL` 和 `anon public` key。
4. **关掉公开注册**（重要）：**Authentication → Sign In / Providers → Email**，
   把 **Allow new users to sign up** 关掉。前端已经没有注册入口，但 anon key 本身是
   公开的，不关这个开关，任何拿到网址的人都能直接调注册接口建号。
5. 建自己的账号：**Authentication → Users → Add user**，填邮箱和密码，
   勾上 *Auto Confirm User* 免去确认邮件。建号时数据库触发器会自动写好默认分类和账户。

## 二、本地运行

```bash
npm install
cp .env.example .env.local   # 填入上一步的 URL 与 anon key
npm run dev
```

打开 http://localhost:5173 ，用上一步在 Supabase 里建好的邮箱密码登录。
页面只有登录，没有注册入口——要加人就去 Supabase 控制台加。

> anon key 本来就是给浏览器用的公开 key，真正的安全边界是数据库上的 RLS 策略
> 加上关掉的注册开关，所以放进前端没有问题。**service_role key 永远不要写进这个项目。**

## 三、部署

任何静态托管都行（Vercel / Netlify / Cloudflare Pages / GitHub Pages）：

```bash
npm run build   # 产物在 dist/
```

在托管平台的环境变量里配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
如果用到重置密码邮件，记得把部署域名加进 Supabase 的
**Authentication → URL Configuration → Redirect URLs**。

手机上打开后「添加到主屏幕」，就是一个全屏的记账 App。

## 目录结构

```
src/
  App.tsx              外壳与页面切换
  lib/
    supabase.ts        Supabase 客户端
    store.tsx          登录态 + 全量数据加载 + 增删改（React Context）
    stats.ts           按月/年/分类的统计
    format.ts          金额、日期、星期格式化
    types.ts           数据模型
  screens/             登录 / 每日 / 记一笔 / 月度 / 年度 / 总计 / 设置
  components/          标签栏与蓝图框等基础组件
  styles/
    industry.css       设计系统 token 与组件类
    app.css            应用外壳、深色主题、键盘等
supabase/schema.sql    建表 + RLS + 新账号初始化
```

数据量按自用场景设计：登录后一次性拉全部流水（上限两万笔）放在内存里算统计，
所以翻月份、翻年份都不再请求网络。
