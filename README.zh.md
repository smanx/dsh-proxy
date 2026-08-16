# dsh-lan-proxy

DSH 插件：把 DeepSeek Harness Web 界面（默认 `127.0.0.1:3080`）转发到**另一个带认证的端口**，让同一局域网内的其他设备也能安全访问。

- **HTTP + WebSocket 全协议转发**：任务状态、日志等实时推送不失效
- **Web-based 认证**：自带登录页（用户名/密码 → 签名会话 Cookie，HMAC-SHA256、HttpOnly、SameSite=Lax、可设有效期）；脚本/工具可用 **Basic Auth** 兜底
- **开箱即通的兼容修复**：`Host`/`Origin` 改写（通过 DSH `/api` 同源信任篱笆，LAN 访问不 403）、`crypto.randomUUID` polyfill 注入（LAN 非安全上下文下前端 RPC 可用）
- **随 `dsh web` 启停**：无需单独进程，配置改在 profile 的 `cordis.patch.yml`

> 为什么需要它：DSH Web 服务端**故意拒绝** `--host 0.0.0.0`（避免把 RCE 直接暴露到网络），本插件是官方认可的"出网"方式——独立监听端口 + 认证 + 反代回 loopback。
>
> 独立版（Go/Node 单文件，不依赖 DSH）见 <https://github.com/smanx/dsh-proxy>；本插件是它的集成版。

## 安装

```bash
dsh plugin --profile web add file:C:/mydata/codes/dsh-lan-proxy
```

安装后**重启 `dsh web`**（Ctrl+C 后重新运行）即生效。若 3081 被占用（例如独立版 dsh-proxy 还在运行），先停掉它，或在配置里换一个端口。

## 配置

所有配置项都有 schema 默认值；在 **profile 的 `cordis.patch.yml`** 里按行 id 覆盖（patch 会整体替换该行 config，因此要写全你要改的键）：

```yaml
# C:\Users\cc\.dsh\profiles\web\cordis.patch.yml
- id: dsh-lan-proxy
  config:
    listenHost: '0.0.0.0'      # 监听网卡；0.0.0.0 = 局域网可访问
    listenPort: 3081            # 代理对外端口（默认 3081）
    upstreamHost: '127.0.0.1'   # 上游 DSH 地址
    upstreamPort: 0             # 0 = 跟随 web app 实际绑定的端口（默认）
    username: admin             # 登录用户名
    password: admin             # 登录密码
    sessionTtlHours: 12         # 会话 Cookie 有效期（小时）
```

- `username` 与 `password` **同时为空** = 关闭认证（局域网裸奔，谨慎）。
- 会话密钥在进程启动时随机生成：**重启 `dsh web` 后所有已登录会话失效**，需重新登录。

## 使用

1. 重启 `dsh web`，启动日志会打印访问地址：
   ```
   dsh-lan-proxy: listening on 0.0.0.0:3081 -> http://127.0.0.1:3080
   dsh-lan-proxy: 局域网访问 http://192.168.1.100:3081
   ```
2. 浏览器访问 `http://<本机局域网IP>:3081` → 登录页 → 进入 DSH 界面。
3. 局域网内其他设备用同一地址访问。

> Windows 防火墙：若局域网设备连不上，为本机放行该端口（管理员 PowerShell）：
> `netsh advfirewall firewall add rule name="dsh-lan-proxy" dir=in action=allow protocol=TCP localport=3081`

## 开发

```bash
pnpm install
pnpm run check   # typecheck + test + build
pnpm run smoke   # 对正在运行的 DSH（127.0.0.1:3080）做全流程冒烟测试
```

- `src/` — TypeScript 源码；`src/proxy.ts` 是纯 node 代理核心（无 cordis 依赖，可独立测试），`src/index.ts` 是 cordis 插件入口。
- `lib/` — 提交构建产物（`lib/index.cjs` 为完全自包含单文件：schemastery 与 http-proxy 均已内联，profile 无需额外运行时依赖）。
- `tests/` — vitest：认证原语、登录页/polyfill 纯函数、以及带真实上游（HTTP + WebSocket）的代理集成测试。
- 宿主编排测试（跑在真实 DSH 进程里的插件生命周期）见 `scripts/smoke.mjs` 思路 + 手动重启验证。

## 认证细节

- 登录页：`GET /login`、`POST /login`（urlencoded）、`GET /logout`；未认证的页面导航 → 302 到 `/login`；未认证的 `/api/*` → 401 JSON。
- 会话 Cookie：`dsh_lan_session=<base64url(payload)>.<base64url(hmac-sha256)>`，`payload = <过期秒数>.<用户名>`；比较用常量时间。
- Basic Auth 兜底：HTTP 与 WebSocket 握手统一校验（浏览器握手自动带 Cookie，因此浏览器走 Cookie；curl/脚本走 Basic）。
- 登录表单体上限 16 KiB；Cookie `HttpOnly`（脚本不可读）、`SameSite=Lax`（跨站 POST 不带 Cookie）。

## 安全提示

- 该代理通过后，DSH 的 `/api` 信任篱笆看到的是改写后的 loopback `Host`，因此**设置/凭据等特权 RPC 也会对局域网开放**——认证（登录页/Basic）是唯一闸门。请务必设置强密码，不要双空关闭认证。
- 会话在服务重启后全部失效，属有意设计（泄漏的 Cookie 寿命有限）。
