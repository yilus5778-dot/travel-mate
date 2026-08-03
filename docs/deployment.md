# travelmate 部署手册(自有服务器)

面向零基础的手把手部署指南。服务器要求:Linux(以 Ubuntu 为例)、Node.js 22+、已备案域名(境内服务器必须)。

## 0. 前置条件

- [ ] 域名已完成 ICP 备案,并解析(A 记录)到服务器公网 IP
- [ ] 服务器安全组/防火墙已放行 80 和 443 端口
- [ ] 本地 `.env` 已配置好所有密钥(参考 `.env.example`)

## 1. 服务器初始化(只需一次)

```bash
# 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2(进程守护)和 Nginx(反向代理)
sudo npm install -g pm2
sudo apt install -y nginx

# 创建数据目录(SQLite 协作数据存放处)
sudo mkdir -p /var/lib/travelmate
sudo chown $USER:$USER /var/lib/travelmate
```

## 2. 上传代码并构建

方式一(推荐):服务器上直接拉 git 仓库

```bash
git clone <你的仓库地址> travelmate
cd travelmate
npm install
npm run build        # 产物在 .output/
```

方式二:本地构建后上传(服务器配置较低时用)

```bash
# 本地执行
npm run build
# 把 .output、package.json、.env、ecosystem.config.cjs 上传到服务器
scp -r .output package.json .env ecosystem.config.cjs user@服务器IP:~/travelmate/
```

**注意**:`.env` 包含所有密钥,必须上传到项目根目录,且不要提交进 git(已在 .gitignore)。

## 3. 启动服务

```bash
cd ~/travelmate
pm2 start ecosystem.config.cjs
pm2 save                 # 保存进程列表
pm2 startup              # 生成开机自启命令,按提示再执行一条 sudo 命令
pm2 logs travelmate      # 查看日志确认无报错
curl http://localhost:3000   # 本机验证,应返回 HTML
```

## 4. 配置 Nginx + HTTPS

```bash
# 复制配置模板并编辑域名
sudo cp deploy/nginx-travelmate.conf /etc/nginx/conf.d/travelmate.conf
sudo nano /etc/nginx/conf.d/travelmate.conf   # 把 example.com 改成你的域名
sudo nginx -t && sudo systemctl reload nginx

# 申请免费 HTTPS 证书(certbot 会自动改 nginx 配置加上 443)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

浏览器访问 `https://你的域名` 即可。

## 5. 日常运维

```bash
pm2 restart travelmate   # 重启
pm2 logs travelmate      # 看日志
git pull && npm install && npm run build && pm2 restart travelmate   # 更新版本
```

数据备份:定期复制 `/var/lib/travelmate/collaboration.sqlite` 即可。

## 环境变量一览

| 变量 | 用途 |
| --- | --- |
| `DEEPSEEK_API_KEY` | 文本 AI(意图/整理/规划) |
| `ZHIPU_API_KEY` | 图片识别(GLM-4V) |
| `AMAP_WEB_SERVICE_KEY` | 天气(后端 Web 服务) |
| `VITE_AMAP_JS_KEY` / `VITE_AMAP_JS_SECURITY_CODE` | 前端地图(JS API) |
| `COLLAB_DB_PATH` | SQLite 数据文件路径 |
| `PORT` | 服务端口(默认 3000) |

*