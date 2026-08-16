# dsh-lan-proxy

DSH 插件：把 DeepSeek Harness Web 界面（默认 `127.0.0.1:3080`）转发到**另一个带认证的端口**，让同一局域网内的其他设备也能安全访问。

- **HTTP + WebSocket 全协议转发**：任务状态、日志等实时推送不失效
- **密码登录（默认关闭）**：默认用户名与密码均为空，局域网**开放访问**；在设置页**同时设置**用户名和密码后启用——外部访问弹出浏览器 **Basic Auth** 登录框，登录页作为兜底（签名会话 Cookie，HMAC-SHA256、HttpOnly、SameSite=Lax、可设有效期），脚本/工具可用 Basic Auth 头
- **设置页面**：DSH 设置 → 「局域网代理」，显示当前监听端口/转发目标/**密码登录是否启用**，可修改转发目标端口、用户名、密码，保存后自动重启转发服务（持久化到 `$DSH_HOME/dsh-lan-proxy.json`）
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
    username: ''                # 登录用户名（默认空 = 密码登录关闭）
    password: ''                # 登录密码（默认空 = 密码登录关闭）
    sessionTtlHours: 12         # 会话 Cookie 有效期（小时）
```

- 默认 `username` 与 `password` 均为空 = **密码登录关闭**（局域网开放访问，谨慎）。**只有同时设置两者**才会启用密码登录（只设置其一仍保持关闭，设置页会提示）。
- 会话密钥在进程启动时随机生成：**重启 `dsh web` 后所有已登录会话失效**，需重新登录。

## 设置页面（改端口 / 账号密码）

重启 `dsh web` 后，打开 DSH 设置（左下角齿轮）→ 「局域网代理」：

- **运行状态**：两个红绿灯指示 —— **代理服务端口**（监听地址:端口，绿灯=代理实际在监听，红灯=端口被占用等绑定失败）与**目标服务端口**（DSH 服务端口，绿灯=可探测到目标服务，红灯=目标不可达）；另有当前用户名、认证开关、会话有效期，并标注是否使用了已保存的运行配置。
- **修改设置**：可改 **转发目标端口**（DSH 服务端口）、**用户名**、**密码**（留空 = 保持不变）。点「保存并重启」后，配置写入 `$DSH_HOME/dsh-lan-proxy.json` 并**立即重启转发服务**；重启后所有已登录会话失效，需重新登录。

设置页的修改会**持久化**并优先于 profile 的 `cordis.patch.yml`；`listenHost` / `listenPort` 等仍只能通过 `cordis.patch.yml` 修改。插件通过宿主 RPC 通道 `/dsh-lan-proxy`（`status` / `update`）提供该能力，通道仅限 loopback 权威（经代理改写后 LAN 端同样可访问）。

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

- `src/` — TypeScript 源码；`src/proxy.ts` 是纯 node 代理核心（无 cordis 依赖，可独立测试），`src/controller.ts` 是代理控制器（启动/重启/状态/更新，负责配置持久化），`src/index.ts` 是 cordis 插件入口（含 `/dsh-lan-proxy` RPC 通道），`src/client/` 是浏览器设置页。
- `lib/` — 提交构建产物（`lib/index.cjs` 为完全自包含单文件：schemastery、http-proxy、dsh-home-paths 均已内联；`lib/client.js` 为浏览器端单文件，仅 external react）。
- `tests/` — vitest：认证原语、登录页/polyfill 纯函数、代理集成测试（HTTP + WebSocket）、控制器（真实上游 + 临时配置文件）、设置页 jsdom 渲染。
- 宿主编排测试（跑在真实 DSH 进程里的插件生命周期）见 `scripts/smoke.mjs` 思路 + 手动重启验证。

## 认证细节

- **启用条件**：`username` 与 `password` **同时非空**才启用密码登录（默认均为空 = 开放访问）；只设置其一仍保持关闭。
- **外部访问**：启用后，未认证的**页面导航 → 302 到登录页**（Cookie 登录——故意不向浏览器发 Basic 挑战，避免浏览器缓存过 Basic 凭据时静默自动登录、永远看不到登录框）；未认证的 `/api/*` 与脚本/工具 → **401 JSON + `WWW-Authenticate: Basic`**；WebSocket 拒绝同样带挑战头。
- 登录页：`GET /login`、`POST /login`（urlencoded）、`GET /logout`；成功登录签发会话 Cookie。
- 会话 Cookie：`dsh_lan_session=<base64url(payload)>.<base64url(hmac-sha256)>`，`payload = <过期秒数>.<用户名>`；比较用常量时间。
- Basic Auth 与 Cookie 均可通过 HTTP 与 WebSocket 握手校验（浏览器走 Cookie，curl/脚本走 Basic 头）。
- 登录表单体上限 16 KiB；Cookie `HttpOnly`（脚本不可读）、`SameSite=Lax`（跨站 POST 不带 Cookie）。

## 安全提示

- 默认**开放访问**（用户名密码为空）——启用密码登录前，局域网内任何人都可访问。请尽快在设置页**同时设置用户名和密码**。
- 该代理通过后，DSH 的 `/api` 信任篱笆看到的是改写后的 loopback `Host`，因此**设置/凭据等特权 RPC 也会对局域网开放**——密码登录（Basic/登录页）是唯一闸门。
- 会话在服务重启后全部失效，属有意设计（泄漏的 Cookie 寿命有限）。
