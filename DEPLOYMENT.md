# 阿里云香港 + 百炼千问上线说明

## 当前方案

- 网站运行在阿里云轻量应用服务器（中国香港）
- 文档分析调用阿里云百炼中国内地（北京）地域的 `qwen-long`
- 上传资料由网站转发给百炼解析，分析结束后请求删除临时文件
- 联系方式在试运行阶段保存到服务器硬盘的 `data/leads.json`
- 后台地址为 `/admin/leads`

## 百炼配置

在阿里云控制台进入大模型服务平台百炼，使用中国内地（北京）地域：

1. 开通百炼服务，并确认使用中国内地（北京）地域。
2. 在 API Key 管理中创建北京地域 API Key。模型广场首页展示 `qwen3.5` 不影响本项目；本项目通过 API 直接调用文件分析专用的 `qwen-long`。
3. 如需查找模型说明，在“专项模型 / 长上下文（Qwen-Long）”中查看 `qwen-long` 文档，不要将本项目改成 `qwen3.5`。
4. 记录 API Key，仅填写到服务器 `.env.local`，不要提交到 GitHub。
5. 在费用或用量管理中设置预算预警或额度控制，避免测试期超出预期费用。

`qwen-long` 官方文件输入支持 PDF、DOCX、TXT、MD、PNG、JPG/JPEG 等格式。

## 服务器环境变量

在服务器项目目录创建 `.env.local`：

```env
DASHSCOPE_API_KEY=你的百炼API_Key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-long
ADMIN_USERNAME=admin
ADMIN_PASSWORD=改成一个只有你知道的强密码
```

## 服务器安装与部署

```bash
sudo -i
apt update
apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2

mkdir -p /var/www
cd /var/www
git clone https://github.com/robin081412108-coder/baodan-bikeng.git
cd baodan-bikeng
npm install
nano .env.local
npm run build

pm2 start npm --name baodan-bikeng -- start
pm2 save
pm2 startup systemd -u root --hp /root
pm2 save
```

## Nginx 公网访问配置

执行：

```bash
cat > /etc/nginx/sites-available/baodan-bikeng <<'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/baodan-bikeng /etc/nginx/sites-enabled/baodan-bikeng
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx
```

随后在阿里云轻量应用服务器防火墙添加 TCP 端口：

- `80`：HTTP 网页访问
- `443`：后续绑定 HTTPS 时使用

## 测试与后台

使用服务器公网 IP 打开：

```text
http://你的服务器公网IP
http://你的服务器公网IP/admin/leads
```

测试至少包含：

- PDF 分析并显示 3 条结果
- Word DOCX 分析并显示 3 条结果
- JPG 或 PNG 截图分析
- 联系方式提交后在后台显示
- 手机流量访问首页和分析流程

联系方式数据文件：

```text
/var/www/baodan-bikeng/data/leads.json
```

测试期间可定期备份：

```bash
cp /var/www/baodan-bikeng/data/leads.json ~/leads-backup.json
```

## 后续更新网站

```bash
sudo -i
cd /var/www/baodan-bikeng
git pull origin master
npm install
npm run build
pm2 restart baodan-bikeng
```

## 域名与 HTTPS

IP 测试通过后再绑定域名并申请免费 HTTPS 证书：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名
```
