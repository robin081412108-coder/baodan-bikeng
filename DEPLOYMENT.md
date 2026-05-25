# 阿里云香港上线说明

## 方案说明

本项目可部署到一台阿里云轻量应用服务器（中国香港）：

- 网页和后端接口都运行在香港服务器
- 服务器端调用 OpenAI API，用户浏览器不会看到 API Key
- 联系方式在轻量测试期直接保存到服务器硬盘的 `data/leads.json`
- 后台地址为 `/admin/leads`

香港服务器上的联系方式文件需要定期备份。用户量变大后，再将线索迁移到数据库。

## 建议购买配置

- 地域：中国香港
- 镜像：Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS
- 配置：入门套餐即可；能选 2 GB 内存则优先 2 GB
- 时长：先买 1 个月测试

## 服务器环境变量

在服务器项目目录创建 `.env.local`，内容为：

```env
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-5-mini
ADMIN_USERNAME=admin
ADMIN_PASSWORD=改成一个只有你知道的强密码
```

不要把 `.env.local` 上传到 GitHub，也不要把 API Key 发给任何人。

## 首次部署命令

登录 Ubuntu 服务器后执行：

```bash
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/robin081412108-coder/baodan-bikeng.git
cd baodan-bikeng
npm install
npm run build
pm2 start npm --name baodan-bikeng -- start
pm2 save
pm2 startup
```

`pm2 startup` 会打印一行需要再次执行的命令，复制执行那一行，然后再次运行 `pm2 save`。

## Nginx 反向代理

先用服务器公网 IP 访问时，将下列内容保存为 `/etc/nginx/sites-available/baodan-bikeng`：

```nginx
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
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/baodan-bikeng /etc/nginx/sites-enabled/baodan-bikeng
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

完成后浏览器打开：

```text
http://你的服务器公网IP
```

## 后台和数据备份

后台地址：

```text
http://你的服务器公网IP/admin/leads
```

联系方式数据文件：

```text
/var/www/baodan-bikeng/data/leads.json
```

测试期间可定期在服务器执行：

```bash
cp /var/www/baodan-bikeng/data/leads.json ~/leads-backup.json
```

## 绑定域名和 HTTPS

公网 IP 测试通过后，再购买并解析域名到服务器 IP。域名生效后可使用 Certbot 免费申请 HTTPS 证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

## 上线前测试

- PDF 能分析出 3 条结果
- Word DOCX 能分析出 3 条结果
- 图片截图能分析
- 联系方式提交后，后台能看到记录
- 后台必须输入你设置的密码才能进入
- 手机移动网络能够顺畅访问首页并上传资料
