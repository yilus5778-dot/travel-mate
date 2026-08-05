# travelmate · AI 旅行搭子

一款「本地优先」的旅行规划 Web 应用(响应式,同时适配手机和电脑):

- **AI 行程规划**:一句话生成每日行程,或粘贴攻略/截图自动整理成结构化行程
- **搭子匹配**:6 题旅行偏好测试,匹配专属动物搭子,影响行程推荐
- **协作旅行**:邀请码共享行程,多人实时共同编辑(角色:所有者/可编辑/只读)
- **记账分摊**:多人记账、预算进度、AA 最少转账结算建议
- **旅行清单**:按目的地和季节自动生成打包清单
- **真实地图与天气**:高德地图按天画路线、目的地天气预报

## 技术栈

- 前端:React 19 + TanStack Start/Router + Tailwind CSS v4 + shadcn/ui
- 后端:TanStack Start 自定义 server entry(`src/server.ts`),Nitro Node 部署
- 数据库:Node 22 内置 SQLite(`node:sqlite`),仅协作数据落库,其余数据在浏览器本地
- AI:DeepSeek(文本) + 智谱 GLM-4V(图片识别),Key 只在服务端
- 地图/天气:高德开放平台(JS API + Web 服务)

## 本地开发

```bash
npm install
cp .env.example .env   # 填入各 API Key
npm run dev            # http://localhost:8080
```

## 生产部署

```bash
npm run build          # 产物在 .output/
npm start              # node --env-file=.env .output/server/index.mjs
```

自有服务器完整部署手册(Nginx + PM2 + HTTPS):[docs/deployment.md](docs/deployment.md)

## 环境变量

见 [.env.example](.env.example)。

---

This project was built with [Lovable](https://lovable.dev). Continue developing in the
[Lovable editor](https://lovable.dev/projects/2f8e6b8a-3514-46e3-9b52-9eb98b509743);
pushes to `main` sync back into Lovable.
