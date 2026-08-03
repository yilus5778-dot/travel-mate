// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  },
  // 部署目标:默认构建 Node 服务(自有服务器);Lovable 构建时会被平台强制为 Cloudflare,
  // 本地需要 Cloudflare 产物时可显式 DEPLOY_TARGET=cloudflare。
  nitro: {
    preset: process.env.DEPLOY_TARGET === "cloudflare" ? "cloudflare-module" : "node-server",
  },
  tanstackStart: {
    router: {
      autoCodeSplitting: false,
    },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: {
      entry: "server",
      build: {
        inlineCss: true,
      },
    },
  },
});
