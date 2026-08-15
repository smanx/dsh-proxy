'use strict';
// 打包版入口：交互式填写 4 项配置（源端口/目标端口/用户名/密码），
// 记忆到 exe 旁的 config.json，然后启动代理。
// 支持命令行参数跳过交互（供计划任务/自动化）：
//   dsh-proxy --source-port 3080 --target-port 3081 --user admin --pass admin
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { startProxy } = require('./proxy-core');

const VERSION = require('./package.json').version;

const DEFAULTS = { sourcePort: 3080, targetPort: 3081, username: 'admin', password: 'admin' };

// ---------------------------------------------------------------- 配置记忆
function configPath() {
  // SEA 打包后 process.execPath 就是 exe 本身，配置放在 exe 同目录
  return path.join(path.dirname(process.execPath), 'config.json');
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    const data = JSON.parse(raw);
    return { ...DEFAULTS, ...data };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.log(`  (提示：无法写入配置文件 ${configPath()}：${err.message})`);
    return false;
  }
}

// ---------------------------------------------------------------- 预填式输入
// 非 TTY（管道/脚本调用）回退：一次性读入全部输入，逐行对应每个问题。
// 不能用多个 readline 接口（会吞掉未消费的行），所以统一从这里取行。
let pipedLines = null;
function nextPipedLine() {
  if (pipedLines === null) {
    pipedLines = [];
    try {
      pipedLines = fs.readFileSync(0, 'utf8').split(/\r?\n/);
    } catch { /* 无输入 */ }
  }
  return pipedLines.length ? pipedLines.shift() : '';
}

// 在 raw 模式下实现“默认值已填好、可编辑”的行输入。
function promptPrefilled(question, def, { mask = false } = {}) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const ans = nextPipedLine();
      resolve(ans === '' ? def : ans);
      return;
    }

    const stdin = process.stdin;
    const stdout = process.stdout;
    let buf = mask ? '' : String(def); // mask 模式下默认值不预填（回车即用默认）
    let pos = buf.length;
    let finished = false;

    const render = () => {
      const shown = mask ? '*'.repeat(buf.length) : buf;
      stdout.write(`\r\x1b[2K${question}${shown}`);
      const back = buf.length - pos;
      if (back > 0) stdout.write(`\x1b[${back}D`);
    };

    const finish = (val) => {
      if (finished) return;
      finished = true;
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('keypress', onKey);
      stdout.write('\r\n');
      resolve(val);
    };

    const onKey = (ch, key) => {
      if (!key) return;
      if (key.ctrl && key.name === 'c') {
        finish(null);
        process.exit(130);
      }
      if (key.name === 'return' || key.name === 'enter') {
        finish(buf === '' ? def : buf);
        return;
      }
      if (key.ctrl && key.name === 'u') {
        buf = ''; pos = 0; render(); return;
      }
      if (key.name === 'backspace') {
        if (pos > 0) { buf = buf.slice(0, pos - 1) + buf.slice(pos); pos--; }
        render(); return;
      }
      if (key.name === 'delete') {
        if (pos < buf.length) buf = buf.slice(0, pos) + buf.slice(pos + 1);
        render(); return;
      }
      if (key.name === 'left') { if (pos > 0) pos--; render(); return; }
      if (key.name === 'right') { if (pos < buf.length) pos++; render(); return; }
      if (key.name === 'home') { pos = 0; render(); return; }
      if (key.name === 'end') { pos = buf.length; render(); return; }
      if (ch && ch.length === 1 && ch >= ' ') {
        buf = buf.slice(0, pos) + ch + buf.slice(pos);
        pos++;
        render();
      }
    };

    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('keypress', onKey);
    render();
  });
}

// ---------------------------------------------------------------- 校验
function parsePort(raw) {
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return NaN;
  const n = Number(s);
  return n >= 1 && n <= 65535 ? n : NaN;
}

async function askPort(label, def) {
  for (;;) {
    const raw = await promptPrefilled(label, String(def));
    const n = parsePort(raw);
    if (Number.isInteger(n)) return n;
    console.log(`  ⚠ 无效端口「${raw}」，请输入 1–65535 的整数`);
  }
}

// ---------------------------------------------------------------- CLI 参数
function printHelp() {
  console.log(`dsh-proxy v${VERSION} 打包版
用法:
  dsh-proxy                            交互填写配置后启动
  dsh-proxy --source-port 3080 --target-port 3081 --user admin --pass admin   免交互启动
选项:
  --source-port <端口>   上游 DSH 服务端口（默认 3080）
  --target-port <端口>   代理对外监听端口（默认 3081）
  --user <用户名>        Basic Auth 用户名（默认 admin）
  --pass <密码>          Basic Auth 密码（默认 admin）
  -h, --help             显示帮助`);
}

function parseArgs(argv) {
  if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    process.exit(0);
  }
  const hasAny = ['--source-port', '--target-port', '--user', '--pass'].some((k) => argv.includes(k));
  if (!hasAny) return null;

  const pick = (name, def) => {
    const i = argv.indexOf(name);
    return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : def;
  };
  const cfg = {
    sourcePort: parsePort(pick('--source-port', DEFAULTS.sourcePort)),
    targetPort: parsePort(pick('--target-port', DEFAULTS.targetPort)),
    username: String(pick('--user', DEFAULTS.username)),
    password: String(pick('--pass', DEFAULTS.password)),
  };
  const errs = [];
  if (!Number.isInteger(cfg.sourcePort)) errs.push(`--source-port 无效：${pick('--source-port', DEFAULTS.sourcePort)}`);
  if (!Number.isInteger(cfg.targetPort)) errs.push(`--target-port 无效：${pick('--target-port', DEFAULTS.targetPort)}`);
  if (!cfg.username) errs.push('--user 不能为空');
  if (!cfg.password) errs.push('--pass 不能为空');
  if (Number.isInteger(cfg.sourcePort) && Number.isInteger(cfg.targetPort) && cfg.sourcePort === cfg.targetPort) {
    errs.push(`源端口和目标端口不能相同（都是 ${cfg.sourcePort}）`);
  }
  if (errs.length) {
    console.error('参数错误：\n  ' + errs.join('\n  '));
    process.exit(1);
  }
  return cfg;
}

// ---------------------------------------------------------------- 主流程
function run(cfg) {
  console.log('==========================================');
  console.log(`  dsh-proxy v${VERSION}（HTTP + WebSocket 反向代理）`);
  console.log(`  监听 0.0.0.0:${cfg.targetPort} → 转发 http://127.0.0.1:${cfg.sourcePort}`);
  console.log(`  Basic Auth：${cfg.username} / ***`);
  console.log('==========================================');
  const server = startProxy({
    listenPort: cfg.targetPort,
    dshPort: cfg.sourcePort,
    username: cfg.username,
    password: cfg.password,
  });
  process.on('SIGINT', () => {
    console.log('\n收到 Ctrl+C，正在退出…');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 800).unref();
  });
  process.on('SIGTERM', () => process.exit(0));
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags) {
    run(flags); // 参数模式：不读写 config.json，保持无状态
    return;
  }

  const saved = loadConfig();
  console.log('==========================================');
  console.log(`  dsh-proxy v${VERSION}（HTTP + WebSocket 反向代理）`);
  console.log('  回车 = 使用默认值/上次保存的值；退格可修改');
  console.log('==========================================');

  const sourcePort = await askPort('源端口（上游 DSH 服务端口，默认 3080）: ', saved.sourcePort);

  let targetPort;
  for (;;) {
    targetPort = await askPort('目标端口（代理对外监听端口，默认 3081）: ', saved.targetPort);
    if (targetPort !== sourcePort) break;
    console.log(`  ⚠ 源端口和目标端口不能相同（当前都是 ${sourcePort}），请换一个目标端口`);
  }

  const username = (await promptPrefilled('用户名（默认 admin）: ', saved.username)).trim() || saved.username;
  const password = await promptPrefilled('密码（默认 admin，回车使用默认，输入不回显）: ', saved.password, { mask: true });

  const cfg = { sourcePort, targetPort, username, password };
  saveConfig(cfg);
  console.log(`配置已保存到 ${configPath()}`);
  run(cfg);
}

main().catch((err) => {
  console.error('启动失败：', err);
  process.exit(1);
});
