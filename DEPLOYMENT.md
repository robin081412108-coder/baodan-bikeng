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

## 2. 联系方式保存使用 Vercel KV

本项目现在不用 Supabase。线上联系方式保存走 Vercel KV。

你需要在 Vercel 项目里创建并连接 KV 存储。连接后，Vercel 会自动添加这些环境变量：

```env
KV_REST_API_URL=Vercel 自动生成
KV_REST_API_TOKEN=Vercel 自动生成
```

可选变量：

```env
VERCEL_KV_LEADS_KEY=baodan:leads
```

不填也可以，默认就是 `baodan:leads`。

## 3. 后台地址

后台地址：

```text
/admin/leads
```

浏览器会弹出账号密码框。本地默认账号是 `admin`，密码是 `admin123`。生产环境必须设置 `ADMIN_PASSWORD`，否则后台会锁定。

## 4. 上传限制

当前支持：

- PDF
- Word DOCX
- JPG / JPEG
- PNG
- WEBP
- TXT
- MD

大小限制：20MB。

## 5. 上线前测试

至少测试：

- 保险计划书 PDF 能分析出 3 条结果
- Word DOCX 能分析出 3 条结果
- 图片截图能分析
- 超大文件会被拦截
- 联系方式能提交
- `/admin/leads` 能看到联系方式线索
- 没有后台账号密码时不能进入后台
