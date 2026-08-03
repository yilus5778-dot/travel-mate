// PM2 进程管理配置(服务器上使用)
// 用法:pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: "travelmate",
      script: ".output/server/index.mjs",
      // Node 22 支持 --env-file,从项目根目录的 .env 读取所有密钥
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // SQLite 数据文件位置(协作数据),建议放在项目外的持久目录
        COLLAB_DB_PATH: "/var/lib/travelmate/collaboration.sqlite",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      time: true,
    },
  ],
};
