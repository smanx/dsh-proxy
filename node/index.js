'use strict';
// 环境变量方式入口（保持与旧版/计划任务兼容）：
//   PROXY_PORT=代理对外监听端口（默认 3081）
//   DSH_PORT=上游 DSH 端口（默认 3080）
//   PROXY_USERNAME / PROXY_PASSWORD：都设置才启用 Basic Auth
const { startProxy } = require('./proxy-core');

const LISTEN_PORT = Number(process.env.PROXY_PORT) || 3081;
const DSH_PORT = Number(process.env.DSH_PORT) || 3080;

startProxy({
  listenPort: LISTEN_PORT,
  dshPort: DSH_PORT,
  username: process.env.PROXY_USERNAME || '',
  password: process.env.PROXY_PASSWORD || '',
});
