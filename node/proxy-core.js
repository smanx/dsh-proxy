'use strict';
// 代理核心：HTTP + WebSocket 反向代理，带 Basic Auth、Origin 对齐、
// crypto.randomUUID polyfill 注入。由 index.js（环境变量方式）和
// app.js（打包版交互方式）共用。
const http = require('http');
const os = require('os');
const httpProxy = require('http-proxy');
const crypto = require('crypto');

const AUTH_REALM = 'dsh-proxy';

// 核心修复：crypto.randomUUID polyfill。
// DSH 前端用 crypto.randomUUID() 生成 rpcId，但该 API 只在 https/localhost
// 等安全上下文可用；通过局域网 IP 访问时页面是非安全上下文，randomUUID
// 不存在 → RPC 请求发不出去 → 实时通道(WS)建立失败。
// 代理在转发 HTML 时注入基于 getRandomValues 的兼容实现（该 API 非安全源可用）。
const POLYFILL = '<script>(function(){try{if(typeof crypto!=="undefined"&&crypto&&typeof crypto.randomUUID!=="function"){crypto.randomUUID=function(){var b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h="";for(var i=0;i<16;i++){h+=b[i].toString(16).padStart(2,"0")}return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}}}catch(e){}})();</script>';

/**
 * 启动反向代理。
 * @param {object} opts
 * @param {number} opts.listenPort  代理对外监听端口
 * @param {number} opts.dshPort     上游 DSH 服务端口（127.0.0.1）
 * @param {string} [opts.username]  Basic Auth 用户名（空则不启用认证）
 * @param {string} [opts.password]  Basic Auth 密码（空则不启用认证）
 * @returns {http.Server}
 */
function startProxy({ listenPort, dshPort, username = '', password = '', host = '0.0.0.0' }) {
  const TARGET_ORIGIN = `http://127.0.0.1:${dshPort}`;
  const AUTH_USER = String(username);
  const AUTH_PASS = String(password);

  // 公开静态资源白名单：只含应用名/图标等非敏感数据（PWA manifest、站点图标）。
  // 浏览器抓取 <link rel="manifest"> 时（标签未带 crossorigin="use-credentials"）
  // 不会携带 Basic Auth 凭据，若这些路径也强制认证，控制台会一直报
  // /manifest.webmanifest 401。因此对白名单路径跳过认证；页面、API、WS 仍全部要求认证。
  const PUBLIC_PATHS = new Set(['/manifest.webmanifest', '/favicon.svg', '/favicon.ico']);

  function safeEqual(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  }

  function checkAuth(req) {
    if (!AUTH_USER || !AUTH_PASS) return true; // 未配置 → 不需要认证
    const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization || '');
    if (!m) return false;
    let decoded;
    try {
      decoded = Buffer.from(m[1], 'base64').toString('utf8');
    } catch {
      return false;
    }
    const i = decoded.indexOf(':');
    if (i === -1) return false;
    return safeEqual(decoded.slice(0, i), AUTH_USER) && safeEqual(decoded.slice(i + 1), AUTH_PASS);
  }

  function rejectUnauthorized(res) {
    res.writeHead(401, {
      'WWW-Authenticate': `Basic realm="${AUTH_REALM}"`,
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end('401 Unauthorized');
  }

  function rejectUpgrade(socket) {
    socket.end(`HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="${AUTH_REALM}"\r\nConnection: close\r\n\r\n`);
  }

  const proxy = httpProxy.createProxyServer({
    target: TARGET_ORIGIN,
    ws: true,
    changeOrigin: true,
  });

  proxy.on('proxyRes', (proxyRes, req, res) => {
    const ct = String(proxyRes.headers['content-type'] || '');
    if (!ct.includes('text/html') || proxyRes.headers['content-encoding']) return;
    delete proxyRes.headers['content-length'];
    res.removeHeader('content-length');
    let injected = false;
    const origWrite = res.write.bind(res);
    res.write = function (chunk, ...rest) {
      if (!injected) {
        injected = true;
        let str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        const i = str.toLowerCase().indexOf('<head');
        if (i !== -1) {
          const e = str.indexOf('>', i);
          str = e !== -1 ? str.slice(0, e + 1) + POLYFILL + str.slice(e + 1) : POLYFILL + str;
        } else {
          str = POLYFILL + str;
        }
        chunk = Buffer.from(str);
      }
      return origWrite(chunk, ...rest);
    };
  });

  // changeOrigin 把 Host 改写为目标地址，浏览器带的 Origin 需同步对齐，
  // 否则 DSH 的 /api 同源校验(Origin 必须等于它看到的 Host)会拒绝(403)，
  // WS 握手同样走该校验。
  function alignOrigin(req) {
    if (req.headers.origin) req.headers.origin = TARGET_ORIGIN;
  }

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://proxy').pathname;
    if (!PUBLIC_PATHS.has(pathname) && !checkAuth(req)) {
      rejectUnauthorized(res);
      return;
    }
    alignOrigin(req);
    proxy.web(req, res);
  });

  server.on('upgrade', (req, socket, head) => {
    if (!checkAuth(req)) {
      rejectUpgrade(socket);
      return;
    }
    alignOrigin(req);
    proxy.ws(req, socket, head);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n错误：端口 ${listenPort} 已被其他程序占用。请换一个目标端口后重试。`);
    } else if (err.code === 'EACCES') {
      console.error(`\n错误：没有权限监听端口 ${listenPort}（可能需要管理员权限）。`);
    } else {
      console.error(`\n代理启动失败：${err.message}`);
    }
    process.exitCode = 1;
  });

  server.listen(listenPort, host, () => {
    const authText = AUTH_USER && AUTH_PASS ? `Basic Auth 已启用（用户名：${AUTH_USER}）` : '未启用认证';
    console.log(`代理已启动，监听 0.0.0.0:${listenPort}，转发到 ${TARGET_ORIGIN}（${authText}）`);
    console.log(`本机访问：  http://127.0.0.1:${listenPort}`);
    const nets = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }
    for (const ip of ips) console.log(`局域网访问：http://${ip}:${listenPort}`);
  });

  return server;
}

module.exports = { startProxy };
