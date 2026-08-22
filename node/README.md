# dsh-proxy

HTTP + WebSocket 反向代理：把 `0.0.0.0:3081` 转发到本地 DSH 服务 `127.0.0.1:3080`。
支持 Basic Auth、局域网访问、dsh 0.1.1+ 客户端 loopback 信任补丁（设置页模型列表
在 LAN 访问下不再报 "settings are unavailable in this browser"）、打包为
**Windows / macOS / Linux 单文件可执行程序**。

## 一、打包版（推荐）

### 运行

`dist/` 里是编译好的单文件程序（无需安装 Node，双击即用）：

| 文件 | 平台 |
|---|---|
| `dsh-proxy-win-x64.exe` | Windows 64 位 |
| `dsh-proxy-linux-x64` | Linux x64 |
| `dsh-proxy-linux-arm64` | Linux ARM64 |
| `dsh-proxy-macos-x64` | macOS Intel |
| `dsh-proxy-macos-arm64` | macOS Apple Silicon |

macOS / Linux 版传到对应系统后先执行一次：`chmod +x dsh-proxy-xxx`。

### 启动交互

双击 exe 后弹出一个控制台窗口，依次填写 4 项（默认值已预填，直接回车即用）：

1. **源端口** —— 上游 DSH 服务端口，默认 `3080`
2. **目标端口** —— 代理对外监听端口，默认 `3081`
3. **用户名** —— Basic Auth 用户名，默认 `admin`
4. **密码** —— Basic Auth 密码，默认 `admin`（输入不回显，回车用默认值）

填写完成后自动启动代理，控制台会显示本机/局域网访问地址。
浏览器访问 `http://<本机IP>:<目标端口>` 会弹出认证框，用填写的账号密码登录即可，
HTTP 与 WebSocket 实时通道均可用。

### 配置记忆

首次填写后，配置保存到 exe 同目录的 `config.json`（含明文密码，注意保管）。
下次启动自动预填上次的值，回车即可继续。

### 免交互启动（计划任务 / 自动化）

```bash
dsh-proxy-win-x64.exe --source-port 3080 --target-port 3081 --user admin --pass admin
```

- 传了任一参数即进入免交互模式：不弹提示、不写 config.json（无状态）。
- 完整参数：`--source-port`（上游 DSH 端口）、`--target-port`（监听端口）、`--user`、`--pass`；`-h` 查看帮助。
- 默认值：源端口 3080、目标端口 3081、用户/密码 admin。
- 源端口与目标端口不能相同，否则启动时报错退出。

### 从源码重新打包

需要 Node ≥ 18（构建时用本机 Node 版本，跨平台产物会下载同版本官方 Node 二进制）：

```bash
npm install
npm run build        # 构建全部 5 个目标（首次需下载约 100MB×4 的 Node 二进制，之后缓存于 .sea-cache/）
npm run build:win    # 只构建 Windows 版
```

技术方案：Node 官方 SEA（Single Executable Application）+ esbuild 打包 + postject 注入，
构建在任意平台均可产出全部目标。产物未签名，Windows 首次运行可能出现
SmartScreen「未知发布者」提示（更多信息 → 仍要运行），macOS 首次运行如被 Gatekeeper
拦截（右键 → 打开）。

### GitHub Actions 自动发布

推送 `v*` 标签（如 `v1.1.0`）即自动构建全部 5 个目标并发布到 GitHub Release
（含 SHA256SUMS.txt 校验和），也可在 Actions 页面手动触发（需填 version，标记为 prerelease）：

```bash
git tag v1.1.0
git push origin v1.1.0
```

工作流见 `.github/workflows/release.yml`；构建所需 Node 二进制会缓存于 `.sea-cache/`，
重复构建不再下载。

## 二、源码方式（环境变量版）

```bash
npm install
npm start
```

或直接 `node index.js`。可通过环境变量覆盖：

```bash
# PowerShell
$env:PROXY_PORT = '3081'        # 代理对外监听端口（默认 3081）
$env:DSH_PORT = '3080'          # 上游 DSH 端口（默认 3080）
$env:PROXY_USERNAME = 'admin'   # 用户名（与密码同时设置才启用认证）
$env:PROXY_PASSWORD = 'admin'   # 密码
node index.js
```

交互版入口 `node app.js` 与打包版行为一致（含配置记忆）。

## 三、原理说明（为什么需要这个代理）

### 为什么需要转发 WebSocket

DSH 的 Web 界面依赖 WebSocket 实时推送事件（`/api/events.mux`、`/api/events.host`），
代理必须同时处理 HTTP 升级请求，否则界面上的任务状态、日志等实时更新会失效。
本代理通过 `upgrade` 事件 + `proxy.ws()` 转发所有 WebSocket 连接。

### 为什么需要改写 Origin（常见坑：LAN 访问 WS 超时/403）

DSH 对 `/api`（含 WebSocket 握手）有一道同源信任校验：请求的 `Origin` 必须等于它
实际看到的 `Host`。代理的 `changeOrigin: true` 会把 `Host` 改写为目标地址
`127.0.0.1:3080`，但浏览器从 `http://192.168.123.237:3081` 页面发出的请求
`Origin: http://192.168.123.237:3081` 仍是代理地址，两者不一致会被 DSH 拒绝（403），
表现为 WebSocket 一直连不上/超时。

解决：代理在转发 HTTP 和 WS 时，把 `Origin` 也对齐到目标地址
（`http://127.0.0.1:3080`），与改写后的 `Host` 保持一致，同源语义不变。

### 关键修复：crypto.randomUUID polyfill（LAN 访问时实时通道不通的根因）

通过局域网 IP（如 `http://192.168.123.237:3081`）访问时，页面是**非安全上下文**
（secure context 只包括 https 和 localhost/127.0.0.1），而 DSH 前端在 `callUnary()`
里用 `crypto.randomUUID()` 生成 rpcId —— 该 API 在非安全上下文**不存在**，导致
`host.describe` 等 RPC 的请求发不出去，前端随即中止实时通道（mux/host WebSocket
在发出握手前就被关闭），表现为 `WebSocket is closed before the connection is
established` / 一直 pending。

**解决**：本代理在转发 HTML 页面时，自动向 `<head>` 注入基于
`crypto.getRandomValues()` 的 `crypto.randomUUID` 兼容实现（`getRandomValues`
在非安全上下文可用）。注入后 LAN 访问的实时通道完全正常。

实测（同一代理、无头 Chrome 加载 `http://192.168.123.237:3081`）：
- 注入前：`host.describe` 请求不发出，mux/host 握手失败，无限重试 ❌
- 注入后：`host.describe` 200，mux/host 均 `101 Switching Protocols`，实时正常 ✅

### 关键修复：dsh 0.1.1+ 客户端 loopback 信任补丁（设置页模型列表报错的根因）

dsh 0.1.1 起，前端在浏览器里按页面 `location.hostname` 计算 `connection.isLoopback`：
非 loopback 主机名（局域网 IP）会被判为"远程浏览器"，设置镜像被强制保持
**仅内存模式**且永不加载——设置 → 模型列表报
`加载提供方目录失败: settings are unavailable in this browser`。

主机名无法从注入的 HTML 伪造，所以本代理对所服务的 **JavaScript 响应做精确
字节串重写**（与插件版 `src/clientpatch.ts` 等价）：

- `dsh-client-connection` 包里 `isLoopback: pageLocation === void 0 || isLoopbackHostname(pageLocation.hostname),`
  → `isLoopback: true,`（一处根治所有消费方）
- `dsh-client-ui-settings` 包里 `connection.isLoopback ? "host" : "memory"` → `"host"`（纵深防御）

该补丁无条件生效（与其它兼容修复一致）；Basic Auth 仍是唯一闸门。客户端包未压缩
发布，needle 为字节级稳定串；上游若变更形态，受影响页面退回上游的远程降级行为。

### 常见 401：/manifest.webmanifest（浏览器抓取 PWA manifest 不带认证）

启用 Basic Auth 后，浏览器抓取 `<link rel="manifest">` 声明的
`/manifest.webmanifest` 时**不会携带 Basic Auth 凭据**（该标签未带
`crossorigin="use-credentials"`），若代理对所有路径强制认证，控制台会一直报
`Failed to load resource: 401`。

解决：代理内置公开静态资源白名单，`/manifest.webmanifest`、`/favicon.svg`、
`/favicon.ico` 三个路径跳过认证检查（只含应用名/图标，无敏感数据）；
页面、API、WebSocket 仍全部要求认证。

## 四、验证

```bash
# HTTP 带认证（admin/admin）
curl -u admin:admin http://127.0.0.1:3081/

# 无凭据应返回 401
curl -i http://127.0.0.1:3081/

# WebSocket 握手（应返回 OPEN）
node -e "const ws=new WebSocket('ws://127.0.0.1:3081/api/events.mux',{headers:{Authorization:'Basic '+Buffer.from('admin:admin').toString('base64')}});ws.onopen=()=>{console.log('OPEN');ws.close()}"
```

## 五、说明

- `changeOrigin: true` 会把 `Host` 头改写为上游地址，配合 `alignOrigin` 把浏览器
  的 `Origin` 也对齐到目标地址，通过 DSH 的 `/api` 同源校验（否则 LAN 访问会被拒 403）。
- `proxy.on('proxyRes', ...)` 对 text/html 响应注入 `crypto.randomUUID` polyfill；
  对 JavaScript 响应整包缓冲后应用 dsh 0.1.1+ 客户端 loopback 信任补丁。
- 认证始终启用（打包版默认 admin/admin）；旧版计划任务托管方式：
  修改任务 `dsh-proxy` 的操作为
  `cmd /c set PROXY_USERNAME=yourname&& set PROXY_PASSWORD=yourpass&& cd /d C:\mydata\codes\dsh-proxy\node && node index.js >> proxy.log 2>> proxy.err`，
  或改用打包版 `dsh-proxy-win-x64.exe --source-port ... --target-port ... --user ... --pass ...`（更推荐用 `../go` 的轻量版）。
- 目录结构：`index.js` 环境变量入口、`app.js` 交互入口、`proxy-core.js` 代理核心（两者共用）、`build.js` 打包脚本。
