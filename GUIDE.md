# dsh-proxy 使用指引

## 项目简介

dsh-proxy 是一个 HTTP + WebSocket 反向代理：把局域网端口转发到本地 DSH 服务
（默认 `127.0.0.1:3080`），让同一局域网内其他设备也能访问 DSH 界面，
并自动修复跨设备访问时的两个经典问题——WebSocket 实时通道连不上、
页面请求被 403 拒绝。

主要特性：

- **HTTP + WebSocket 全协议转发**：任务状态、日志等实时推送不失效
- **Basic Auth 访问保护**：默认账号 `admin` / `admin`，局域网访问也安全
- **自动修复**：Origin 同源校验对齐、`crypto.randomUUID` 兼容注入，开箱即用
- **双击即用**：无需安装 Node 等任何运行时；配置自动记忆，下次启动直接回车

## 项目地址

GitHub 仓库：<https://github.com/smanx/dsh-proxy>

## 下载地址

Releases 页面：<https://github.com/smanx/dsh-proxy/releases>

### 选哪个版本？

每个版本都有 **Go** 和 **Node** 两种实现，功能完全一致，**下载任意一个就行**：

| 实现 | 体积 | 说明 |
|---|---|---|
| **Go 版（推荐）** | 约 6-7 MB | 体积小、启动快，纯静态单文件，无需任何运行时 |
| Node 版 | 约 80-120 MB | 自带 Node 运行时，文件较大，功能相同 |

### 选哪个文件？

按自己的操作系统选择对应平台的文件（Go 版文件名带 `-go` 前缀，如
`dsh-proxy-go-win-x64.exe`；Node 版不带，如 `dsh-proxy-win-x64.exe`）：

| 文件（以 Go 版为例） | 适用系统 |
|---|---|
| `dsh-proxy-go-win-x64.exe` | Windows 64 位 |
| `dsh-proxy-go-linux-x64` | Linux x64 |
| `dsh-proxy-go-linux-arm64` | Linux ARM64（如树莓派） |
| `dsh-proxy-go-macos-x64` | macOS Intel |
| `dsh-proxy-go-macos-arm64` | macOS Apple Silicon（M 系列） |

## 快速开始

1. 下载对应系统的文件，放到任意目录。
2. **Windows**：双击 exe 即可。**macOS / Linux**：先执行 `chmod +x <文件名>` 再运行。
3. 按提示填写 4 项配置（**默认值直接回车即可**）：
   - 源端口（上游 DSH 服务端口）：默认 `3080`
   - 目标端口（代理对外监听端口）：默认 `3081`
   - 用户名：默认 `admin`
   - 密码：默认 `admin`
4. 浏览器访问 `http://<本机IP>:<目标端口>`（如 `http://192.168.1.100:3081`），
   输入刚才填写的账号密码即可使用；局域网内其他设备用同一地址也能访问。
5. 配置会自动保存到程序同目录的 `config.json`，下次启动直接回车继续。

### 免交互启动（计划任务 / 脚本）

```bash
dsh-proxy-win-x64.exe --source-port 3080 --target-port 3081 --user admin --pass admin
```

## 常见问题

- **端口被占用**：换一个目标端口重试即可。
- **源端口和目标端口不能相同**：两个端口必须不同。
- **Windows 提示「未知发布者」**：程序未签名，属正常现象，点「更多信息 → 仍要运行」。
- **更多细节**：见仓库根目录的 `README.md`。
