# 上线说明

## 1. Vercel 必填环境变量

在 Vercel 项目里配置：

```env
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-5-mini
ADMIN_USERNAME=admin
ADMIN_PASSWORD=改成一个强密码
```

不要把 `.env.local` 上传到 GitHub。

## 2. 联系方式保存必须配置 Supabase

Vercel 线上环境不能稳定写入本地文件，也不能用内存保存用户联系方式。

如果要让“提交联系方式”后能在 `/admin/leads` 后台看到，必须配置 Supabase：

```env
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
SUPABASE_LEADS_TABLE=leads
```

其中 `SUPABASE_SERVICE_ROLE_KEY` 只放在 Vercel 环境变量里，不会暴露给前端网页用户。

## 3. Supabase 建表 SQL

在 Supabase 的 SQL Editor 里执行：

```sql
create table if not exists public.leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  contact text not null,
  question text,
  file_name text,
  document_type text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;
```

本项目使用服务端 `SUPABASE_SERVICE_ROLE_KEY` 写入和读取线索，所以不需要开放前端匿名写入策略。

## 4. 后台地址

后台地址：

```text
/admin/leads
```

浏览器会弹出账号密码框。本地默认账号是 `admin`，密码是 `admin123`。生产环境必须设置 `ADMIN_PASSWORD`，否则后台会锁定。

## 5. 上传限制

当前支持：

- PDF
- Word DOCX
- JPG / JPEG
- PNG
- WEBP
- TXT
- MD

大小限制：20MB。

## 6. 上线前测试

至少测试：

- 保险计划书 PDF 能分析出 3 条结果
- Word DOCX 能分析出 3 条结果
- 图片截图能分析
- 超大文件会被拦截
- 联系方式能提交
- `/admin/leads` 能看到联系方式线索
- 没有后台账号密码时不能进入后台
