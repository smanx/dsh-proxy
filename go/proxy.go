package main

// 代理核心：HTTP + WebSocket 反向代理，带 Basic Auth、Origin 对齐、
// crypto.randomUUID polyfill 注入。功能与 JS 版（dsh-proxy）完全等价。

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"syscall"
)

// 核心修复：crypto.randomUUID polyfill。
// DSH 前端用 crypto.randomUUID() 生成 rpcId，但该 API 只在 https/localhost
// 等安全上下文可用；通过局域网 IP 访问时页面是非安全上下文，randomUUID
// 不存在 → RPC 请求发不出去 → 实时通道(WS)建立失败。
// 代理在转发 HTML 时注入基于 getRandomValues 的兼容实现（该 API 非安全源可用）。
const polyfill = `<script>(function(){try{if(typeof crypto!=="undefined"&&crypto&&typeof crypto.randomUUID!=="function"){crypto.randomUUID=function(){var b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h="";for(var i=0;i<16;i++){h+=b[i].toString(16).padStart(2,"0")}return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}}}catch(e){}})();</script>`

const authRealm = "dsh-proxy"

// publicPaths 公开静态资源白名单：只含应用名/图标等非敏感数据（PWA manifest、站点图标）。
// 浏览器抓取 <link rel="manifest"> 时（标签未带 crossorigin="use-credentials"）
// 不会携带 Basic Auth 凭据，若这些路径也强制认证，控制台会一直报
// /manifest.webmanifest 401。因此对白名单路径跳过认证；页面、API、WS 仍全部要求认证。
var publicPaths = map[string]bool{
	"/manifest.webmanifest": true,
	"/favicon.svg":          true,
	"/favicon.ico":          true,
}

// startProxy 启动反向代理：监听 0.0.0.0:listenPort，转发到 127.0.0.1:dshPort。
// username/password 均非空时启用 Basic Auth（HTTP + WebSocket 握手都要认证）。
// 返回 http.ErrServerClosed 表示被优雅关闭。
func startProxy(listenPort, dshPort int, username, password string) error {
	target := &url.URL{Scheme: "http", Host: fmt.Sprintf("127.0.0.1:%d", dshPort)}
	targetOrigin := "http://127.0.0.1:" + strconv.Itoa(dshPort)

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target) // 改写 scheme/host/路径
			// changeOrigin：Host 头改写为目标地址（SetURL 不保证改 Host 头，显式设置）
			pr.Out.Host = target.Host
			// Origin 对齐：浏览器带的 Origin 是代理地址，需与改写后的 Host 一致，
			// 否则 DSH 的 /api 同源校验(Origin 必须等于它看到的 Host)会拒绝(403)
			if o := pr.In.Header.Get("Origin"); o != "" {
				pr.Out.Header.Set("Origin", targetOrigin)
			}
		},
		// text/html 响应注入 crypto.randomUUID polyfill（compress 过的跳过）
		ModifyResponse: func(resp *http.Response) error {
			ct := resp.Header.Get("Content-Type")
			if !strings.Contains(ct, "text/html") || resp.Header.Get("Content-Encoding") != "" {
				return nil
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return err
			}
			resp.Body.Close()
			body = injectPolyfill(body)
			resp.Body = io.NopCloser(strings.NewReader(string(body)))
			resp.ContentLength = int64(len(body))
			resp.Header.Set("Content-Length", strconv.Itoa(len(body)))
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			if errors.Is(err, context.Canceled) {
				return
			}
			http.Error(w, "502 Bad Gateway", http.StatusBadGateway)
		},
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !publicPaths[r.URL.Path] && !checkAuth(r, username, password) {
			w.Header().Set("WWW-Authenticate", `Basic realm="`+authRealm+`"`)
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprintln(w, "401 Unauthorized")
			return
		}
		proxy.ServeHTTP(w, r)
	})

	srv := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%d", listenPort),
		Handler: handler,
	}

	// WebSocket 升级请求不需要单独处理：Go 的 httputil.ReverseProxy 原生支持
	// HTTP Upgrade（检测到 Upgrade 头会自动 hijack 并双向透传），认证在 handler 里统一拦截。

	authText := "未启用认证"
	if username != "" && password != "" {
		authText = "Basic Auth 已启用（用户名：" + username + "）"
	}
	fmt.Printf("代理已启动，监听 0.0.0.0:%d，转发到 %s（%s）\n", listenPort, target, authText)
	fmt.Printf("本机访问：  http://127.0.0.1:%d\n", listenPort)
	for _, ip := range lanIPv4s() {
		fmt.Printf("局域网访问：http://%s:%d\n", ip, listenPort)
	}

	ln, err := net.Listen("tcp", srv.Addr)
	if err != nil {
		if isAddrInUse(err) {
			return fmt.Errorf("端口 %d 已被其他程序占用，请换一个目标端口后重试", listenPort)
		}
		return err
	}
	err = srv.Serve(ln)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	if err != nil && isAddrInUse(err) {
		return fmt.Errorf("端口 %d 已被其他程序占用，请换一个目标端口后重试", listenPort)
	}
	return err
}

// injectPolyfill 把 polyfill 注入到 HTML 的 <head> 之后；没有 <head> 则插到最前面。
func injectPolyfill(body []byte) []byte {
	lower := strings.ToLower(string(body))
	idx := strings.Index(lower, "<head")
	if idx == -1 {
		return append([]byte(polyfill), body...)
	}
	gt := bytes.Index(body[idx:], []byte(">"))
	if gt == -1 {
		return append([]byte(polyfill), body...)
	}
	cut := idx + gt + 1
	out := make([]byte, 0, len(body)+len(polyfill))
	out = append(out, body[:cut]...)
	out = append(out, polyfill...)
	out = append(out, body[cut:]...)
	return out
}

// checkAuth 校验 Basic Auth；username/password 任一为空则放行（不启用认证）。
func checkAuth(r *http.Request, username, password string) bool {
	if username == "" || password == "" {
		return true
	}
	m := strings.SplitN(r.Header.Get("Authorization"), " ", 2)
	if len(m) != 2 || !strings.EqualFold(m[0], "Basic") {
		return false
	}
	decoded, err := base64.StdEncoding.DecodeString(m[1])
	if err != nil {
		return false
	}
	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 {
		return false
	}
	// 常量时间比较（与 Node 的 timingSafeEqual 对应）
	uOK := subtle.ConstantTimeCompare([]byte(parts[0]), []byte(username)) == 1
	pOK := subtle.ConstantTimeCompare([]byte(parts[1]), []byte(password)) == 1
	return uOK && pOK
}

// isAddrInUse 判断端口占用错误（兼容 Windows / Linux / macOS）
func isAddrInUse(err error) bool {
	if errors.Is(err, syscall.EADDRINUSE) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "address already in use") || strings.Contains(msg, "only one usage of each socket address")
}

// lanIPv4s 列出本机非回环 IPv4 地址，用于打印局域网访问提示
func lanIPv4s() []string {
	var ips []string
	ifaces, err := net.Interfaces()
	if err != nil {
		return ips
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			var ip net.IP
			switch v := a.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip != nil && ip.To4() != nil && !ip.IsLoopback() {
				ips = append(ips, ip.String())
			}
		}
	}
	return ips
}
