# dsh-lan-proxy

DSH 插件：把 DeepSeek Harness Web 界面（默认 `127.0.0.1:3080`）转发到**另一个带认证的端口**，让同一局域网内的其他设备也能安全访问。

- **HTTP + WebSocket 全协议转发**：任务状态、日志等实时推送不失效
- **原生 Basic Auth（默认关闭）**：与独立版 dsh-proxy 一致，使用**浏览器自带的认证弹窗**，没有自绘登录页、没有会话 Cookie——默认用户名与密码均为空，局域网**开放访问**；在设置页**同时设置**用户名和密码后启用，外部访问时浏览器弹出原生 Basic Auth 登录框，成功后浏览器缓存凭据自动登录（含 WebSocket 握手）
- **设置页面**：DSH 设置 → 「局域网代理」，显示监听端口/默认服务端口/**密码登录是否启用**，可修改代理监听端口、用户名、密码，可**启动/停止**代理，保存后自动重启转发服务（持久化到 `$DSH_HOME/dsh-lan-proxy.json`）
- **开箱即通的兼容修复**：`Host`/`Origin` 改写（通过 DSH `/api` 同源信任篱笆，LAN 访问不 403）、`crypto.randomUUID` polyfill 注入（LAN 非安全上下文下前端 RPC 可用）
- **随 `dsh web` 启停**：无需单独进程，配置改在 profile 的 `cordis.patch.yml`

> 为什么需要它：DSH Web 服务端**故意拒绝** `--host 0.0.0.0`（避免把 RCE 直接暴露到网络），本插件是官方认可的"出网"方式——独立监听端口 + 认证 + 反代回 loopback。
>
> 独立版（Go/Node 单文件，不依赖 DSH）见 <https://github.com/smanx/dsh-proxy>；本插件是它的集成版，认证方式与独立版一致（原生 Basic Auth）。

## 安装

```bash
dsh plugin --profile web add file:C:/mydata/codes/dsh-proxy/dsh-lan-proxy
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
```

- 默认 `username` 与 `password` 均为空 = **密码登录关闭**（局域网开放访问，谨慎）。**只有同时设置两者**才会启用密码登录（只设置其一仍保持关闭，设置页会提示）。

## 设置页面（改端口 / 账号密码 / 启停）

重启 `dsh web` 后，打开 DSH 设置（左下角齿轮）→ 「局域网代理」：

- **运行状态**：两个红绿灯指示 —— **代理服务端口**（监听地址:端口，绿灯=代理实际在监听，红灯=端口被占用等绑定失败）与**默认服务端口**（DSH 服务端口，绿灯=可探测到默认服务，红灯=不可达）；另有当前用户名、**密码登录是否启用**；右上角有 **启动 / 停止** 按钮（运行中时「启动」置灰，未运行时「停止」置灰）。
- **修改设置**：可改 **代理服务端口（监听端口）**、**用户名**、**密码**（留空 = 设为空）。点「应用」后，配置写入 `$DSH_HOME/dsh-lan-proxy.json` 并**立即重启转发服务**；改监听端口后局域网访问地址随之变化。

设置页的修改会**持久化**并优先于 profile 的 `cordis.patch.yml`；`listenHost` / `listenPort` 等仍只能通过 `cordis.patch.yml` 修改。插件通过宿主 RPC 通道 `/dsh-lan-proxy`（`status` / `update` / `start` / `stop`）提供该能力，通道仅限 loopback 权威（经代理改写后 LAN 端同样可访问）。

## 使用

1. 重启 `dsh web`，启动日志会打印访问地址：
   ```
   dsh-lan-proxy: listening on 0.0.0.0:3081 -> http://127.0.0.1:3080
   dsh-lan-proxy: 局域网访问 http://192.168.1.100:3081
   ```
2. 浏览器访问 `http://<本机局域网IP>:3081` → **浏览器弹出原生 Basic Auth 登录框** → 输入用户名密码 → 进入 DSH 界面。
3. 局域网内其他设备用同一地址访问；登录成功后浏览器会记住凭据，下次直接进入。

> Windows 防火墙：若局域网设备连不上，为本机放行该端口（管理员 PowerShell）：
> `netsh advfirewall firewall add rule name="dsh-lan-proxy" dir=in action=allow protocol=TCP localport=3081`

## 开发

```bash
pnpm install
pnpm run check   # typecheck + test + build
pnpm run smoke   # 对正在运行的 DSH（127.0.0.1:3080）做全流程冒烟测试
```

- `src/` — TypeScript 源码；`src/proxy.ts` 是纯 node 代理核心（无 cordis 依赖，可独立测试），`src/controller.ts` 是代理控制器（启动/停止/重启/状态/更新，负责配置持久化），`src/index.ts` 是 cordis 插件入口（含 `/dsh-lan-proxy` RPC 通道），`src/client/` 是浏览器设置页。
- `lib/` — 提交构建产物（`lib/index.cjs` 为完全自包含单文件：schemastery、http-proxy、dsh-home-paths 均已内联；`lib/client.js` 为浏览器端单文件，仅 external react）。
- `tests/` — vitest：认证原语、polyfill 纯函数、代理集成测试（HTTP + WebSocket）、控制器（真实上游 + 临时配置文件）、设置页 jsdom 渲染。
- 宿主编排测试（跑在真实 DSH 进程里的插件生命周期）见 `scripts/smoke.mjs` 思路 + 手动重启验证。

## 认证细节

- **启用条件**：`username` 与 `password` **同时非空**才启用密码登录（默认均为空 = 开放访问）；只设置其一仍保持关闭。
- **认证方式**：HTTP Basic Auth，浏览器原生弹窗——未认证的**任何**请求（页面、`/api/*`、脚本）→ **401 + `WWW-Authenticate: Basic realm="dsh-lan-proxy"`**；WebSocket 拒绝同样带挑战头。登录成功后浏览器按站点缓存凭据，后续请求（含 WS 握手）自动携带。**没有自绘登录页、没有会话 Cookie。**
- **公开静态文件**：`/manifest.webmanifest` 与 `/favicon.svg` 免认证——浏览器会在不带凭据的上下文（PWA 清单、图标）拉取它们，强制认证会 401。
- 凭据比较用常量时间（`timingSafeEqual`）。

## 安全提示

- 默认**开放访问**（用户名密码为空）——启用密码登录前，局域网内任何人都可访问。请尽快在设置页**同时设置用户名和密码**。
- 该代理通过后，DSH 的 `/api` 信任篱笆看到的是改写后的 loopback `Host`，因此**设置/凭据等特权 RPC 也会对局域网开放**——密码登录（Basic Auth）是唯一闸门。
- 浏览器缓存的 Basic 凭据在**修改密码后不会自动失效**：旧凭据会 401 并重新弹窗，输入新密码即可；如需彻底清除，可在浏览器"已保存的密码"里删除该站点条目。
