'use strict';
// 跨平台单文件打包脚本（Node SEA 方案）
// 用法:
//   node build.js                        构建全部 5 个目标
//   node build.js --targets win-x64      只构建指定目标（逗号分隔）
// 产物: dist/dsh-proxy-<平台>-<架构>[.exe]
const { execSync } = require('child_process');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const https = require('https');
const postject = require('postject');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.sea-cache');
const BUNDLE = path.join(DIST, 'app.bundle.js');
const BLOB = path.join(DIST, 'sea-prep.blob');
const SEA_CONFIG = path.join(DIST, 'sea-config.json');

const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
const NODE_VER = process.version.slice(1); // 例如 22.22.3，与本地 Node 保持一致

const TARGETS = [
  { name: 'win-x64',     sub: `node-v${NODE_VER}-win-x64`,      dl: `node-v${NODE_VER}-win-x64.zip`,      file: 'node.exe', ext: '.exe' },
  { name: 'linux-x64',   sub: `node-v${NODE_VER}-linux-x64`,    dl: `node-v${NODE_VER}-linux-x64.tar.gz`, file: 'bin/node', ext: '' },
  { name: 'linux-arm64', sub: `node-v${NODE_VER}-linux-arm64`,  dl: `node-v${NODE_VER}-linux-arm64.tar.gz`, file: 'bin/node', ext: '' },
  { name: 'macos-x64',   sub: `node-v${NODE_VER}-darwin-x64`,   dl: `node-v${NODE_VER}-darwin-x64.tar.gz`, file: 'bin/node', ext: '', macho: true },
  { name: 'macos-arm64', sub: `node-v${NODE_VER}-darwin-arm64`, dl: `node-v${NODE_VER}-darwin-arm64.tar.gz`, file: 'bin/node', ext: '', macho: true },
];

// 打包注入的版本号（--version 参数 / DSH_PROXY_VERSION 环境变量），为空则不注入
let BUILD_VERSION = '';

// ---------------------------------------------------------------- 工具函数
function log(msg) {
  console.log(`[build] ${msg}`);
}

// 镜像列表：npmmirror 在国内更快，nodejs.org 官方兜底
function mirrorsFor(dl) {
  return [
    `https://npmmirror.com/mirrors/node/v${NODE_VER}/${dl}`,
    `https://nodejs.org/dist/v${NODE_VER}/${dl}`,
  ];
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(httpGet(new URL(res.headers.location, url).toString()));
        return;
      }
      resolve(res);
    });
    req.on('error', reject);
  });
}

async function download(url, dest, timeoutMs = 900000) {
  const res = await httpGet(url);
  if (res.statusCode !== 200 && res.statusCode !== 206) {
    res.resume();
    throw new Error(`HTTP ${res.statusCode}`);
  }
  const file = fs.createWriteStream(dest);
  const timer = setTimeout(() => res.destroy(new Error(`下载超时`)), timeoutMs);
  await new Promise((resolve, reject) => {
    res.on('error', reject);
    file.on('error', reject);
    file.on('finish', resolve);
    res.pipe(file);
  });
  clearTimeout(timer);
}

async function downloadAny(urls, dest) {
  let lastErr;
  for (const u of urls) {
    try {
      fs.rmSync(dest, { force: true });
      await download(u, dest);
      if (fs.statSync(dest).size > 0) return;
    } catch (err) {
      lastErr = err;
      console.warn(`  (镜像 ${u} 失败：${err.message}，换下一个)`);
    }
  }
  throw lastErr || new Error('所有镜像均下载失败');
}

async function extractArchive(archive, dest) {
  if (archive.endsWith('.zip')) {
    // zip 用纯 JS 解压：Linux 的 GNU tar 不支持 zip，Windows/macOS 的 bsdtar 虽支持，
    // 但统一走 extract-zip 保证任意平台可构建
    const extract = require('extract-zip');
    await extract(archive, { dir: dest });
  } else {
    execSync(`tar -xf "${archive}" -C "${dest}"`, { stdio: 'inherit' });
  }
}

async function ensureNodeBinary(target) {
  // win-x64 且本机就是 win32/x64 时优先直接用本地 node.exe（省一次下载）；
  // 若被占用/锁定（EBUSY，如杀毒扫描或 node 进程正在运行），自动改用下载
  if (target.name === 'win-x64' && process.platform === 'win32' && process.arch === 'x64') {
    try {
      const probe = path.join(CACHE, 'probe-node.exe');
      fs.copyFileSync(process.execPath, probe);
      fs.rmSync(probe, { force: true });
      return process.execPath;
    } catch {
      log('本机 node.exe 被占用/锁定，改用下载 win-x64 二进制');
    }
  }
  const archive = path.join(CACHE, target.dl);
  if (!fs.existsSync(archive) || fs.statSync(archive).size === 0) {
    log(`下载 Node ${NODE_VER} ${target.name} …`);
    await downloadAny(mirrorsFor(target.dl), archive);
  }
  const extractDir = path.join(CACHE, 'extract');
  const nodePath = path.join(extractDir, target.sub, target.file);
  if (!fs.existsSync(nodePath)) {
    log(`解压 ${target.dl} …`);
    fs.mkdirSync(extractDir, { recursive: true });
    await extractArchive(archive, extractDir);
  }
  if (!fs.existsSync(nodePath)) {
    throw new Error(`解压后找不到 ${nodePath}`);
  }
  return nodePath;
}

async function bundle() {
  log('esbuild 打包 app.js（含 http-proxy）…');
  const esbuild = require('esbuild');
  const opts = {
    entryPoints: [path.join(ROOT, 'app.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    minify: true,
    outfile: BUNDLE,
    logLevel: 'info',
  };
  // 版本注入：--version 参数 > DSH_PROXY_VERSION 环境变量 > 不注入（回退 package.json）
  if (BUILD_VERSION) {
    opts.define = { 'process.env.DSH_PROXY_VERSION': JSON.stringify(BUILD_VERSION) };
    log(`版本号：${BUILD_VERSION}`);
  }
  await esbuild.build(opts);
}

async function makeBlob() {
  log('生成 SEA blob …');
  const cfg = {
    main: BUNDLE,
    output: BLOB,
    disableExperimentalSEAWarning: true,
  };
  fs.writeFileSync(SEA_CONFIG, JSON.stringify(cfg, null, 2));
  execSync(`node --experimental-sea-config "${SEA_CONFIG}"`, { stdio: 'inherit' });
  if (!fs.existsSync(BLOB)) throw new Error('SEA blob 未生成');
}

async function buildTarget(target) {
  log(`构建 ${target.name} …`);
  const out = path.join(DIST, `dsh-proxy-${target.name}${target.ext}`);
  const src = await ensureNodeBinary(target);
  fs.copyFileSync(src, out);
  log(`  postject 注入 blob → ${path.basename(out)}`);
  postject.inject(out, 'NODE_SEA_BLOB', fs.readFileSync(BLOB), {
    sentinelFuse: FUSE,
    ...(target.macho ? { machoSegmentName: 'NODE_SEA' } : {}),
  });
  try {
    fs.chmodSync(out, 0o755); // mac/linux 需要可执行位（Windows 上无实际效果）
  } catch { /* ignore */ }
  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
  log(`  ✓ ${path.basename(out)}（${size} MB）`);
  return out;
}

// ---------------------------------------------------------------- 主流程
async function main() {
  const argv = process.argv.slice(2);
  const tIdx = argv.indexOf('--targets');
  const want = new Set(
    tIdx !== -1
      ? argv[tIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
      : TARGETS.map((t) => t.name)
  );
  const targets = TARGETS.filter((t) => want.has(t.name));
  const unknown = [...want].filter((n) => !TARGETS.some((t) => t.name === n));
  if (unknown.length) {
    console.error(`未知目标: ${unknown.join(', ')}；可选: ${TARGETS.map((t) => t.name).join(', ')}`);
    process.exit(1);
  }

  // 版本号：--version 参数 > DSH_PROXY_VERSION 环境变量 > 不注入（app.js 回退 package.json）
  const vIdx = argv.indexOf('--version');
  BUILD_VERSION = vIdx !== -1 && argv[vIdx + 1] !== undefined
    ? String(argv[vIdx + 1]).replace(/^v/, '')
    : (process.env.DSH_PROXY_VERSION ? String(process.env.DSH_PROXY_VERSION).replace(/^v/, '') : '');

  fs.mkdirSync(DIST, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });

  await bundle();
  await makeBlob();

  const outs = [];
  for (const t of targets) outs.push(await buildTarget(t));

  log('全部完成：');
  for (const o of outs) log(`  ${o}`);
  log('提示：macOS/Linux 版本传到对应系统后需先执行 chmod +x。');
}

main().catch((err) => {
  console.error('[build] 失败：', err);
  process.exit(1);
});
