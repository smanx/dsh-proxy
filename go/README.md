# dsh-proxy-go

dsh-proxy 的 **Go 轻量版**：HTTP + WebSocket 反向代理（转发到本地 DSH 服务），
功能与 JS 版（`../node`）完全等价，但单文件体积从 **80-119MB 降到约 6-7MB**，
且无需安装 Node 运行时。

## 功能

- HTTP + WebSocket 反向代理（Go 标准库 `httputil.ReverseProxy` 原生支持 WS 升级）
- Basic Auth（默认 `admin/admin`，HTTP 与 WS 握手统一校验）
- Origin 对齐 + Host 改写（通过 DSH `/api` 同源校验，LAN 访问 WS 不 403）
- HTML 注入 `crypto.randomUUID` polyfill（LAN 非安全上下文下实时通道可用）
- 交互式启动：4 项配置预填可编辑（源端口 3080 / 目标端口 3081 / admin / admin）
- 配置记忆：`config.json` 存于可执行文件同目录，下次启动自动预填
- CLI 免交互参数（供计划任务/自动化）：
  `dsh-proxy --source-port 3080 --target-port 3081 --user admin --pass admin`

## 构建

需要 Go ≥ 1.22（本机已装 1.26）：

```powershell
.\build.ps1            # 全部 5 个平台
.\build.ps1 -Target win-x64   # 只构建 Windows
```

产物（`dist/`，纯静态链接，无需任何运行时）：

| 文件 | 平台 |
|---|---|
| `dsh-proxy-win-x64.exe` | Windows 64 位 |
| `dsh-proxy-linux-x64` | Linux x64 |
| `dsh-proxy-linux-arm64` | Linux ARM64 |
| `dsh-proxy-macos-x64` | macOS Intel |
| `dsh-proxy-macos-arm64` | macOS Apple Silicon |

macOS/Linux 版传到对应系统后先 `chmod +x`。

## 验证

```bash
# 免交互启动（示例端口 3091）
./dsh-proxy --source-port 3080 --target-port 3091 --user admin --pass admin

# 无凭据 → 401；带凭据 → 200
curl -i http://127.0.0.1:3091/
curl -u admin:admin http://127.0.0.1:3091/

# WebSocket 握手 → OPEN
node -e "const ws=new WebSocket('ws://127.0.0.1:3091/api/events.mux',{headers:{Authorization:'Basic '+Buffer.from('admin:admin').toString('base64')}});ws.onopen=()=>{console.log('OPEN');ws.close()}"
```

## 说明

- 与 JS 版（`../node`）行为一致，可随时替换；JS 版保留未动。
- 产物未签名：Windows 首次运行可能见 SmartScreen 提示（更多信息 → 仍要运行）。
- 源码结构：`main.go`（入口/交互/配置/CLI）、`proxy.go`（代理核心）。
