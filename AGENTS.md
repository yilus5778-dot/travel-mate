<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## 项目说明(2026-08 重构后)

travelmate 是一个响应式 Web 应用(手机 + 桌面),已从"微信小程序风格原型"转型为正式产品。

- **运行**:`npm run dev`(开发,8080 端口)/ `npm run build && npm start`(生产,Node 22+)
- **密钥**:全部在 `.env`(gitignored),模板见 `.env.example`。服务端读 `process.env`,客户端只暴露 `VITE_*`
- **后端**:自定义 server entry `src/server.ts`,路由 `/api/collaboration/*`(协作)、`/api/ai/*`(DeepSeek + 智谱 GLM-4V)、`/api/weather`(高德)
- **存储**:`src/server/db.ts` 统一 D1 风格接口,自有服务器用 `node:sqlite`(需惰性 prepare,SQLite 会在 prepare 阶段校验 DDL 引用的表)
- **限流**:`src/server/rate-limit.ts`,AI 接口按 IP 每分钟 10 次/每天 200 次
- **部署**:目标是自有服务器 Node + PM2 + Nginx,手册在 `docs/deployment.md`;`DEPLOY_TARGET=cloudflare` 时才产出 Cloudflare 构建(Lovable 托管会自动强制该目标)
- **登录**:v1 为免登录本地模式,不要恢复假微信登录弹窗;真账号体系待规划
