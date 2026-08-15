package main

// 打包版入口（Go）：交互式填写 4 项配置（源端口/目标端口/用户名/密码），
// 记忆到 exe 旁的 config.json，然后启动代理。
// 支持命令行参数跳过交互（供计划任务/自动化）：
//   dsh-proxy --source-port 3080 --target-port 3081 --user admin --pass admin

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"golang.org/x/term"
)

const version = "1.0.0"

// ------------------------------------------------ 配置记忆（exe 同目录 config.json）

type Config struct {
	SourcePort int    `json:"sourcePort"`
	TargetPort int    `json:"targetPort"`
	Username   string `json:"username"`
	Password   string `json:"password"`
}

func defaultConfig() Config {
	return Config{SourcePort: 3080, TargetPort: 3081, Username: "admin", Password: "admin"}
}

func configPath() string {
	exe, err := os.Executable()
	if err != nil {
		return "config.json"
	}
	return filepath.Join(filepath.Dir(exe), "config.json")
}

func loadConfig() Config {
	cfg := defaultConfig()
	b, err := os.ReadFile(configPath())
	if err != nil {
		return cfg
	}
	if json.Unmarshal(b, &cfg) != nil {
		return defaultConfig()
	}
	return cfg
}

func saveConfig(cfg Config) {
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return
	}
	if os.WriteFile(configPath(), b, 0o644) != nil {
		fmt.Printf("  (提示：无法写入配置文件 %s)\n", configPath())
	}
}

// ------------------------------------------------ 输入

// 非 TTY（管道/脚本调用）回退：一次性读入全部输入，逐行对应每个问题
var pipedLines []string
var pipedLoaded bool

func nextPipedLine() string {
	if !pipedLoaded {
		pipedLoaded = true
		b, err := io.ReadAll(os.Stdin)
		if err != nil {
			return ""
		}
		pipedLines = strings.Split(strings.ReplaceAll(string(b), "\r\n", "\n"), "\n")
	}
	if len(pipedLines) == 0 {
		return ""
	}
	line := pipedLines[0]
	pipedLines = pipedLines[1:]
	return strings.TrimRight(line, "\r")
}

// promptPrefilled：raw 模式下“默认值已填好、可编辑”的行输入。
// mask=true 时（密码）不预填、输入回显为 *，回车用默认值。
func promptPrefilled(question, def string, mask bool) string {
	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		ans := nextPipedLine()
		if ans == "" {
			return def
		}
		return ans
	}

	oldState, err := term.MakeRaw(fd)
	if err != nil {
		// 无法进入 raw 模式：退化为普通问答
		reader := bufio.NewReader(os.Stdin)
		fmt.Printf("%s（默认 %s）", question, def)
		line, _ := reader.ReadString('\n')
		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			return def
		}
		return line
	}
	defer term.Restore(fd, oldState)

	buf := []rune(def)
	if mask {
		buf = nil
	}
	pos := len(buf)
	reader := bufio.NewReader(os.Stdin)

	render := func() {
		shown := string(buf)
		if mask {
			shown = strings.Repeat("*", len(buf))
		}
		fmt.Printf("\r\x1b[2K%s%s", question, shown)
		if back := len(buf) - pos; back > 0 {
			fmt.Printf("\x1b[%dD", back)
		}
	}

	for {
		render()
		rn, _, err := reader.ReadRune()
		if err != nil {
			break
		}
		switch rn {
		case '\r', '\n':
			fmt.Println()
			if len(buf) == 0 {
				return def
			}
			return string(buf)
		case 0x03: // Ctrl+C
			fmt.Println()
			os.Exit(130)
		case 0x7f, 0x08: // 退格
			if pos > 0 {
				buf = append(buf[:pos-1], buf[pos:]...)
				pos--
			}
		case 0x15: // Ctrl+U 清空
			buf = nil
			pos = 0
		case 0x1b: // 方向键等转义序列
			b2, err := reader.ReadByte()
			if err != nil {
				return def
			}
			if b2 == '[' || b2 == 'O' {
				b3, err := reader.ReadByte()
				if err != nil {
					return def
				}
				switch b3 {
				case 'D': // 左
					if pos > 0 {
						pos--
					}
				case 'C': // 右
					if pos < len(buf) {
						pos++
					}
				case 'H': // Home
					pos = 0
				case 'F': // End
					pos = len(buf)
				case '3': // Delete
					reader.ReadByte() // 消费 '~'
					if pos < len(buf) {
						buf = append(buf[:pos], buf[pos+1:]...)
					}
				}
			}
		default:
			if rn >= ' ' {
				buf = append(buf, 0)
				copy(buf[pos+1:], buf[pos:])
				buf[pos] = rn
				pos++
			}
		}
	}
	return def
}

// askPort：校验端口（1-65535 整数），非法则重问
func askPort(label string, def int) int {
	for {
		raw := promptPrefilled(label, strconv.Itoa(def), false)
		n, err := strconv.Atoi(strings.TrimSpace(raw))
		if err == nil && n >= 1 && n <= 65535 {
			return n
		}
		fmt.Printf("  ⚠ 无效端口「%s」，请输入 1–65535 的整数\n", raw)
	}
}

// ------------------------------------------------ CLI 参数

func printHelp() {
	fmt.Printf(`dsh-proxy v%s（Go 版）打包程序
用法:
  dsh-proxy                            交互填写配置后启动
  dsh-proxy --source-port 3080 --target-port 3081 --user admin --pass admin   免交互启动
选项:
  --source-port <端口>   上游 DSH 服务端口（默认 3080）
  --target-port <端口>   代理对外监听端口（默认 3081）
  --user <用户名>        Basic Auth 用户名（默认 admin）
  --pass <密码>          Basic Auth 密码（默认 admin）
  -h, --help             显示帮助
`, version)
}

// parseFlags 返回 (cfg, 是否参数模式)。参数模式下不读写 config.json（无状态）。
func parseFlags(args []string) (Config, bool) {
	fs := flag.NewFlagSet("dsh-proxy", flag.ContinueOnError)
	fs.Usage = printHelp
	sourcePort := fs.Int("source-port", 3080, "")
	targetPort := fs.Int("target-port", 3081, "")
	user := fs.String("user", "admin", "")
	pass := fs.String("pass", "admin", "")
	if err := fs.Parse(args); err != nil {
		if err == flag.ErrHelp {
			os.Exit(0)
		}
		fmt.Fprintln(os.Stderr, "参数错误：", err)
		os.Exit(1)
	}

	set := map[string]bool{}
	fs.Visit(func(f *flag.Flag) { set[f.Name] = true })
	if !set["source-port"] && !set["target-port"] && !set["user"] && !set["pass"] {
		return Config{}, false // 交互模式
	}

	cfg := Config{
		SourcePort: *sourcePort,
		TargetPort: *targetPort,
		Username:   *user,
		Password:   *pass,
	}
	var errs []string
	if cfg.SourcePort < 1 || cfg.SourcePort > 65535 {
		errs = append(errs, fmt.Sprintf("--source-port 无效：%d", cfg.SourcePort))
	}
	if cfg.TargetPort < 1 || cfg.TargetPort > 65535 {
		errs = append(errs, fmt.Sprintf("--target-port 无效：%d", cfg.TargetPort))
	}
	if cfg.Username == "" {
		errs = append(errs, "--user 不能为空")
	}
	if cfg.Password == "" {
		errs = append(errs, "--pass 不能为空")
	}
	if cfg.SourcePort == cfg.TargetPort {
		errs = append(errs, fmt.Sprintf("源端口和目标端口不能相同（都是 %d）", cfg.SourcePort))
	}
	if len(errs) > 0 {
		fmt.Fprintln(os.Stderr, "参数错误：\n  "+strings.Join(errs, "\n  "))
		os.Exit(1)
	}
	return cfg, true
}

// ------------------------------------------------ 主流程

func run(cfg Config) {
	fmt.Println("==========================================")
	fmt.Printf("  dsh-proxy v%s（HTTP + WebSocket 反向代理）\n", version)
	fmt.Printf("  监听 0.0.0.0:%d → 转发 http://127.0.0.1:%d\n", cfg.TargetPort, cfg.SourcePort)
	fmt.Printf("  Basic Auth：%s / ***\n", cfg.Username)
	fmt.Println("==========================================")

	// Ctrl+C / SIGTERM 优雅退出
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		fmt.Println("\n收到退出信号，正在退出…")
		os.Exit(0)
	}()

	err := startProxy(cfg.TargetPort, cfg.SourcePort, cfg.Username, cfg.Password)
	if err != nil {
		fmt.Fprintln(os.Stderr, "\n启动失败：", err)
		os.Exit(1)
	}
}

func main() {
	cfg, flagMode := parseFlags(os.Args[1:])
	if flagMode {
		run(cfg) // 参数模式：不读写 config.json
		return
	}

	saved := loadConfig()
	fmt.Println("==========================================")
	fmt.Printf("  dsh-proxy v%s（HTTP + WebSocket 反向代理）\n", version)
	fmt.Println("  回车 = 使用默认值/上次保存的值；退格可修改")
	fmt.Println("==========================================")

	sourcePort := askPort("源端口（上游 DSH 服务端口，默认 3080）: ", saved.SourcePort)

	var targetPort int
	for {
		targetPort = askPort("目标端口（代理对外监听端口，默认 3081）: ", saved.TargetPort)
		if targetPort != sourcePort {
			break
		}
		fmt.Printf("  ⚠ 源端口和目标端口不能相同（当前都是 %d），请换一个目标端口\n", sourcePort)
	}

	username := strings.TrimSpace(promptPrefilled("用户名（默认 admin）: ", saved.Username, false))
	if username == "" {
		username = saved.Username
	}
	password := promptPrefilled("密码（默认 admin，回车使用默认，输入不回显）: ", saved.Password, true)

	cfg = Config{SourcePort: sourcePort, TargetPort: targetPort, Username: username, Password: password}
	saveConfig(cfg)
	fmt.Printf("配置已保存到 %s\n", configPath())
	run(cfg) // startProxy 内部阻塞，正常不会返回
}
