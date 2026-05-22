// PM2 ecosystem — production configuration for PriceBasket
// Usage:
//   pm2 start ecosystem.config.js   ← start all services
//   pm2 reload ecosystem.config.js  ← zero-downtime reload
//   pm2 stop ecosystem.config.js    ← stop all
//
// One-time startup setup (run once after deploy):
//   pm2 save && pm2 startup

module.exports = {
  apps: [
    // ── Next.js frontend (production build) ────────────────────────────────
    {
      name: "frontend",
      cwd: "/home/ubuntu/price-basket/frontend",
      script: "node_modules/.bin/next",
      args: "start --hostname 127.0.0.1 --port 3000",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      error_file: "/home/ubuntu/price-basket/frontend/logs/pm2-error.log",
      out_file:   "/home/ubuntu/price-basket/frontend/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // ── FastAPI backend (uvicorn) ───────────────────────────────────────────
    {
      name: "backend",
      cwd: "/home/ubuntu/price-basket/backend",
      script: ".venv/bin/uvicorn",
      args: "app.main:app --host 127.0.0.1 --port 8000 --workers 2",
      interpreter: "none",   // run the binary directly, not through node
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: "10s",
      env: {
        PYTHONUNBUFFERED: "1",
      },
      error_file: "/home/ubuntu/price-basket/backend/logs/pm2-error.log",
      out_file:   "/home/ubuntu/price-basket/backend/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
