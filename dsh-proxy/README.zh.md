# dsh-proxy

DSH 插件：把 DeepSeek Harness Web 界面（默认 `127.0.0.1:3080`）转发到**另一个带认证的端口**，让同一局域网内的其他设备也能安全访问。

- **HTTP + WebSocket 全协议转发**：任务状态、日志等实时推送不失效
- **原生 Basic Auth（默认关闭）**：与独立版 dsh-proxy 一致，使用**浏览器自带的认证弹窗**，没有自绘登录页、没有会话 Cookie——默认用户名与密码均为空，局域网**开放访问**；在设置页**同时设置**用户名和密码后启用，外部访问时浏览器弹出原生 Basic Auth 登录框，成功后浏览器缓存凭据自动登录（含 WebSocket 握手）
- **设置页面**：DSH 设置 → 「局域网代理」，显示监听端口/默认服务端口/**密码登录是否启用**/**免 token 登录是否启用**，可修改代理监听端口、用户名、密码、免 token 登录开关，可**启动/停止**代理，保存后自动重启转发服务（持久化到 `$DSH_HOME/dsh-proxy.json`）
- **可选的免 token 首次访问（默认关闭）**：DSH 0.2.x 用每进程随机的启动 token 把整个 Web 界面锁起来，而局域网设备根本看不到这个 token，第一次打开只会得到 `401 dsh web authentication required`。打开该开关后，由代理代替浏览器完成 token→cookie 兑换，之后每次访问都不再需要 token。默认关闭，因为它会让代理端口成为唯一闸门（见「免 token 首次访问」）。
- **开箱即通的兼容修复**：`Host`/`Origin` 改写（通过 DSH `/api` 同源信任篱笆，LAN 访问不 403）、`crypto.randomUUID` polyfill 注入（LAN 非安全上下文下前端 RPC 可用）
- **随 `dsh web` 启停**：无需单独进程，配置改在 profile 的 `cordis.patch.yml`

> 为什么需要它：DSH Web 服务端**故意拒绝** `--host 0.0.0.0`（避免把 RCE 直接暴露到网络），本插件是官方认可的"出网"方式——独立监听端口 + 认证 + 反代回 loopback。
>
> 独立版（Go/Node 单文件，不依赖 DSH）见 <https://github.com/smanx/dsh-proxy>；本插件是它的集成版，认证方式与独立版一致（原生 Basic Auth）。

## 安装

**在线安装（推荐）**——直接从 GitHub 安装（无需下载仓库）：

```bash
dsh plugin --profile web add github:smanx/dsh-proxy#master
```

**本地安装**（仓库已克隆/下载到本机）：

```bash
dsh plugin --profile web add file:C:/mydata/codes/dsh-proxy
```

安装后包名为 **`@smanx/dsh-proxy`**（scoped，带用户名前缀），`dsh plugin ls` 中显示为 `@smanx/dsh-proxy@0.1.1`。

安装后**重启 `dsh web`**（Ctrl+C 后重新运行）即生效。若 3081 被占用（例如独立版 dsh-proxy 还在运行），先停掉它，或在配置里换一个端口。

## 配置

所有配置项都有 schema 默认值；在 **profile 的 `cordis.patch.yml`** 里按行 id 覆盖（patch 会整体替换该行 config，因此要写全你要改的键）：

```yaml
# C:\Users\cc\.dsh\profiles\web\cordis.patch.yml
- id: dsh-proxy
  config:
    listenHost: '0.0.0.0'      # 监听网卡；0.0.0.0 = 局域网可访问
    listenPort: 3081            # 代理对外端口（默认 3081）
    upstreamHost: '127.0.0.1'   # 上游 DSH 地址
    upstreamPort: 0             # 0 = 跟随 web app 实际绑定的端口（默认）
    username: ''                # 登录用户名（默认空 = 密码登录关闭）
    password: ''                # 登录密码（默认空 = 密码登录关闭）
    skipLaunchToken: false      # 免 token 首次访问（默认关闭，见下文）
```

- 默认 `username` 与 `password` 均为空 = **密码登录关闭**（局域网开放访问，谨慎）。**只有同时设置两者**才会启用密码登录（只设置其一仍保持关闭，设置页会提示）。
- `skipLaunchToken`（默认 **false**）：详见下文「免 token 首次访问」。

## 设置页面（改端口 / 账号密码 / 启停）

重启 `dsh web` 后，打开 DSH 设置（左下角齿轮）→ 「局域网代理」：

- **运行状态**：两个红绿灯指示 —— **代理服务端口**（监听地址:端口，绿灯=代理实际在监听，红灯=端口被占用等绑定失败）与**默认服务端口**（DSH 服务端口，绿灯=可探测到默认服务，红灯=不可达）；另有当前用户名、**密码登录是否启用**、**免 token 登录是否启用**（「未启用」的说明是「首次访问仍需手动带 token 访问一次」）；右上角有 **启动 / 停止** 按钮（运行中时「启动」置灰，未运行时「停止」置灰）。
- **修改设置**：可改 **代理服务端口（监听端口）**、**用户名**、**密码**（留空 = 设为空）、以及**免 token 登录**复选框（其提示写明了安全代价）。点「应用」后，配置写入 `$DSH_HOME/dsh-proxy.json` 并**立即重启转发服务**；改监听端口后局域网访问地址随之变化。

设置页的修改会**持久化**并优先于 profile 的 `cordis.patch.yml`；`listenHost` / `listenPort` 等仍只能通过 `cordis.patch.yml` 修改。插件通过宿主 RPC 通道 `/dsh-proxy`（`status` / `update` / `start` / `stop`）提供该能力，通道仅限 loopback 权威（经代理改写后 LAN 端同样可访问）。

## 使用

1. 重启 `dsh web`，启动日志会打印访问地址：
   ```
   dsh-proxy: listening on 0.0.0.0:3081 -> http://127.0.0.1:3080
   dsh-proxy: 局域网访问 http://192.168.1.100:3081
   ```
2. 浏览器访问 `http://<本机局域网IP>:3081`。
   - **启用了密码登录** → **浏览器弹出原生 Basic Auth 登录框** → 输入用户名密码 → 进入 DSH 界面。浏览器会记住凭据，下次直接进入。
   - **开启了免 token 登录** → 无需粘贴 token：首次访问由代理自动完成兑换，浏览器拿到签名 cookie 后直接进入 DSH 界面；之后每次访问都不再需要 token。
3. 局域网内其他设备用同一地址访问；登录成功后浏览器会记住凭据，下次直接进入。

> Windows 防火墙：若局域网设备连不上，为本机放行该端口（管理员 PowerShell）：
> `netsh advfirewall firewall add rule name="dsh-proxy" dir=in action=allow protocol=TCP localport=3081`

## 开发

```bash
pnpm install
pnpm run check   # typecheck + test + build
pnpm run smoke   # 对正在运行的 DSH（127.0.0.1:3080）做全流程冒烟测试
```

- `src/` — TypeScript 源码；`src/proxy.ts` 是纯 node 代理核心（无 cordis 依赖，可独立测试），`src/controller.ts` 是代理控制器（启动/停止/重启/状态/更新，负责配置持久化），`src/index.ts` 是 cordis 插件入口（含 `/dsh-proxy` RPC 通道），`src/client/` 是浏览器设置页。
- `lib/` — 提交构建产物（`lib/index.cjs` 为完全自包含单文件：schemastery、http-proxy、dsh-home-paths 均已内联；`lib/client.js` 为浏览器端单文件，仅 external react）。
- `tests/` — vitest：认证原语、polyfill 纯函数、代理集成测试（HTTP + WebSocket）、控制器（真实上游 + 临时配置文件）、设置页 jsdom 渲染。
- 宿主编排测试（跑在真实 DSH 进程里的插件生命周期）见 `scripts/smoke.mjs` 思路 + 手动重启验证。

## 认证细节

- **启用条件**：`username` 与 `password` **同时非空**才启用密码登录（默认均为空 = 开放访问）；只设置其一仍保持关闭。
- **认证方式**：HTTP Basic Auth，浏览器原生弹窗——未认证的**任何**请求（页面、`/api/*`、脚本）→ **401 + `WWW-Authenticate: Basic realm="dsh-proxy"`**；WebSocket 拒绝同样带挑战头。登录成功后浏览器按站点缓存凭据，后续请求（含 WS 握手）自动携带。**没有自绘登录页、没有会话 Cookie。**
- **公开静态文件**：`/manifest.webmanifest` 与 `/favicon.svg` 免认证——浏览器会在不带凭据的上下文（PWA 清单、图标）拉取它们，强制认证会 401。
- 凭据比较用常量时间（`timingSafeEqual`）。

## 免 token 首次访问（`skipLaunchToken`）

**解决什么问题。** DSH 0.2.x 用**每进程随机**的启动 token 把整个 Web 界面锁起来——`dsh web` 启动时会打印一个形如 `http://172.28.216.108:3080/?token=HO3B2CzY...` 的地址，不带 token 的访问只会得到：

```
401 dsh web authentication required; reopen the URL printed by dsh web.
```

只有 `GET /?token=...` 能把这个 token 兑换成**签名后的 30 天 cookie**（`dsh-auth-<authority>`）。局域网设备看不到这个 token，所以每台新设备第一次打开都卡在那个 401 上，必须有人到服务器启动日志里把 token 抄出来贴进地址栏——每台设备一次，`dsh web` 每次重启后重来。

开启 `skipLaunchToken: true` 后，由代理**代替浏览器完成它本来要手动做的那一次兑换**，且发生在客户端请求被转发之前：

1. 代理用客户端自己的方法、路径、请求头探测上游；
2. 若上游返回 **401**，且客户端**没有携带任何凭据**（无 `token` 参数、无 `dsh-auth-*` cookie），就给客户端的 URL 追加 `?token=...`；
3. DSH 随即签发 cookie 并 **303 重定向到 `./`**——浏览器落在应用界面上，并为之后的每个请求保留这个 cookie；
4. 其他任何状态码都说明请求本身没问题，按原样转发。

**什么情况下才会生效。** 只有「`GET` + 无 token + 无 `dsh-auth-*` cookie」的请求才会被升级。已带凭据的请求一律原样转发，因此代理不会追加第二个 token（DSH 会拒绝），也不会把 token 重放到有状态的请求上。

**关闭时零开销。** 开关关闭（默认）时，热路径上每个请求只多一次布尔属性读取——探测完全不跑，请求与改动前逐字节一致。

**token 从不落盘。** 它从宿主的 Connection 服务（`ctx.connection.authenticatedUrl()`）读取，也就是 `dsh web` 启动时打印的那个值，读取时机在**转发服务启动时**，而非插件加载时（`BrowserAuth` 要等 harness 开始服务后才存在）。持久化的只有**开关标志**（`$DSH_HOME/dsh-proxy.json`），token 每次启动重读，因此能自动跟随重启。若宿主给不出 token，功能保持静默、记一条警告日志，代理行为与之前完全一致。

**怎么开启。** 在 `cordis.patch.yml` 里改（见上），或在设置页勾选**免 token 登录**复选框。设置页会写入开关标志、重启转发服务，**无需重启 `dsh web`** 即可生效。关闭开关会**立即清除**已缓存的 token。

**覆盖不到的地方。** 该能力只作用于普通 HTTP 请求路径，**不会处理 WebSocket 升级**：`GET /?token=...` 是浏览器导航，原始 WS 握手需要的 version 2 API cookie 只能由 `/connect?token=...` 签发。开启后页面能打开、浏览器也持有 cookie，但一个**完全不带 cookie** 的 WS 客户端仍然会拿到 401——与这个功能之前的行为一致。

**安全代价。** 开启后，**能连到代理端口的设备都不再需要启动 token 即可被 DSH 放行**。请把它视作「该端口没有 DSH 侧认证」，只剩下 Basic Auth 一道闸门。这正是它默认**关闭**的原因，也是为什么要搭配 `username` + `password` 使用。设置页在复选框旁写明了这一点。

## 安全提示

- 默认**开放访问**（用户名密码为空）——启用密码登录前，局域网内任何人都可访问。请尽快在设置页**同时设置用户名和密码**。
- 该代理通过后，DSH 的 `/api` 信任篱笆看到的是改写后的 loopback `Host`，因此**设置/凭据等特权 RPC 也会对局域网开放**——密码登录（Basic Auth）是唯一闸门。
- **`skipLaunchToken` 会移除 DSH 自身的 token 校验**：能连到代理端口的设备无需启动 token 即可被放行。请把它视作「该端口没有 DSH 侧认证」，并务必同时配置 Basic Auth 凭据。
- 浏览器缓存的 Basic 凭据在**修改密码后不会自动失效**：旧凭据会 401 并重新弹窗，输入新密码即可；如需彻底清除，可在浏览器"已保存的密码"里删除该站点条目。
