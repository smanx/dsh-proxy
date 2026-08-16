import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import http from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProxyController, type EffectiveProxyOptions } from '../src/controller.ts'

const dirs: string[] = []
const servers: http.Server[] = []
let controller: ProxyController | null = null
const logs: string[] = []

function tempSettingsFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lan-proxy-controller-'))
  dirs.push(dir)
  return join(dir, 'dsh-lan-proxy.json')
}

/** An upstream that answers every path with its marker text. */
async function startUpstream(marker: string): Promise<number> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(marker)
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as AddressInfo).port
}

function baseOptions(upstreamPort: number): EffectiveProxyOptions {
  return {
    listenHost: '127.0.0.1',
    listenPort: 0,
    upstreamHost: '127.0.0.1',
    upstreamPort,
    username: 'admin',
    password: 'admin',
  }
}

async function fetchThrough(url: string, headers: Record<string, string> = {}): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { headers, redirect: 'manual' })
  return { status: res.status, text: await res.text() }
}

beforeEach(() => {
  logs.length = 0
})

afterEach(async () => {
  if (controller !== null) {
    await controller.stop()
    controller = null
  }
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => {
      server.closeAllConnections()
      server.close(() => resolve())
    })
  }
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('ProxyController status', () => {
  it('starts and reports the bound port and effective options', async () => {
    const upstreamPort = await startUpstream('A')
    controller = new ProxyController({
      base: baseOptions(upstreamPort),
      settingsFile: tempSettingsFile(),
      log: (level, message) => logs.push(`${level}:${message}`),
    })
    await controller.start()
    const status = controller.status()
    expect(status.listenHost).toBe('127.0.0.1')
    expect(status.listenPort).toBeGreaterThan(0)
    expect(status.proxyListening).toBe(true)
    expect(status.upstreamPort).toBe(upstreamPort)
    expect(status.username).toBe('admin')
    expect(status.authEnabled).toBe(true)
    expect(status.persisted).toBe(false)
    expect(status.password).toBe('admin')
    expect(logs.some((line) => line.includes('listening'))).toBe(true)

    const fresh = await controller.refreshStatus()
    expect(fresh.upstreamReachable).toBe(true)
  })

  it('lights the proxy red when the listen port is taken and the target red when nothing listens upstream', async () => {
    // Occupy a concrete port so the controller cannot bind it.
    const blocker = http.createServer(() => {})
    servers.push(blocker)
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve))
    const takenPort = (blocker.address() as AddressInfo).port

    // Reserve a port and release it, so the upstream probe finds no listener.
    const probe = http.createServer(() => {})
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
    const deadPort = (probe.address() as AddressInfo).port
    await new Promise<void>((resolve) => probe.close(() => resolve()))

    controller = new ProxyController({
      base: { ...baseOptions(deadPort), listenPort: takenPort },
      settingsFile: tempSettingsFile(),
      log: () => {},
    })
    await controller.start()
    expect(controller.status().proxyListening).toBe(false)
    const fresh = await controller.refreshStatus()
    expect(fresh.upstreamReachable).toBe(false)
  })
})

describe('ProxyController update', () => {
  it('switches the forward target and restarts the service', async () => {
    const portA = await startUpstream('UPSTREAM_A')
    const portB = await startUpstream('UPSTREAM_B')
    controller = new ProxyController({
      base: baseOptions(portA),
      settingsFile: tempSettingsFile(),
      log: () => {},
    })
    await controller.start()
    const listenPort = controller.status().listenPort

    const before = await fetchThrough(`http://127.0.0.1:${listenPort}/`, { authorization: basic('admin', 'admin') })
    expect(before.text).toBe('UPSTREAM_A')

    const out = await controller.update({ upstreamPort: portB })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.result.status.upstreamPort).toBe(portB)
    expect(out.result.message).toContain('重启')

    // listenPort 0 asks the OS for a fresh port on every restart.
    const after = await fetchThrough(`http://127.0.0.1:${out.result.status.listenPort}/`, { authorization: basic('admin', 'admin') })
    expect(after.text).toBe('UPSTREAM_B')
  })

  it('rotates credentials and restarts', async () => {
    const upstreamPort = await startUpstream('UPSTREAM')
    controller = new ProxyController({
      base: baseOptions(upstreamPort),
      settingsFile: tempSettingsFile(),
      log: () => {},
    })
    await controller.start()
    const listenPort = controller.status().listenPort

    const out = await controller.update({ username: 'alice', password: 's3cret' })
    expect(out.ok).toBe(true)
    if (!out.ok) return

    const oldCreds = await fetchThrough(`http://127.0.0.1:${out.result.status.listenPort}/`, { authorization: basic('admin', 'admin') })
    expect(oldCreds.status).toBe(401)
    const newCreds = await fetchThrough(`http://127.0.0.1:${out.result.status.listenPort}/`, { authorization: basic('alice', 's3cret') })
    expect(newCreds.status).toBe(200)
    expect(newCreds.text).toBe('UPSTREAM')
    expect(controller.status().username).toBe('alice')
    expect(controller.status().authEnabled).toBe(true)
  })

  it('disables password login when credentials are cleared to empty (set-empty semantics)', async () => {
    const upstreamPort = await startUpstream('UPSTREAM')
    controller = new ProxyController({
      base: baseOptions(upstreamPort),
      settingsFile: tempSettingsFile(),
      log: () => {},
    })
    await controller.start()
    const listenPort = controller.status().listenPort

    const cleared = await controller.update({ username: '', password: '' })
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) return
    expect(cleared.result.status.authEnabled).toBe(false)
    expect(cleared.result.status.username).toBe('')
    expect(cleared.result.status.password).toBe('')

    // The gate is open again: an anonymous request passes through.
    const anon = await fetchThrough(`http://127.0.0.1:${cleared.result.status.listenPort}/`)
    expect(anon.status).toBe(200)
    expect(anon.text).toBe('UPSTREAM')

    // Setting only one credential keeps password login off and warns.
    const partial = await controller.update({ username: 'half', password: '' })
    expect(partial.ok).toBe(true)
    if (!partial.ok) return
    expect(partial.result.status.authEnabled).toBe(false)
    expect(partial.result.message).toContain('需同时设置用户名和密码')
    expect(listenPort).toBeGreaterThan(0)
  })

  it('persists the patch across controller instances', async () => {
    const portA = await startUpstream('A')
    const portB = await startUpstream('B')
    const settingsFile = tempSettingsFile()

    controller = new ProxyController({ base: baseOptions(portA), settingsFile, log: () => {} })
    await controller.start()
    const out = await controller.update({ upstreamPort: portB, username: 'bob', password: 'pw' })
    expect(out.ok).toBe(true)
    await controller.stop()
    controller = null

    const restarted = new ProxyController({ base: baseOptions(portA), settingsFile, log: () => {} })
    controller = restarted
    await restarted.start()
    const status = restarted.status()
    expect(status.upstreamPort).toBe(portB)
    expect(status.username).toBe('bob')
    expect(status.persisted).toBe(true)
    const res = await fetchThrough(`http://127.0.0.1:${status.listenPort}/`, { authorization: basic('bob', 'pw') })
    expect(res.text).toBe('B')
  })

  it('rejects invalid patches without touching the running proxy', async () => {
    const upstreamPort = await startUpstream('A')
    controller = new ProxyController({ base: baseOptions(upstreamPort), settingsFile: tempSettingsFile(), log: () => {} })
    await controller.start()
    const before = controller.status()

    const listenPort = before.listenPort
    const conflict = await controller.update({ upstreamPort: listenPort })
    expect(conflict.ok).toBe(false)
    if (conflict.ok) return

    const empty = await controller.update({})
    expect(empty.ok).toBe(false)
    if (empty.ok) return

    const stillUp = await fetchThrough(`http://127.0.0.1:${listenPort}/`, { authorization: basic('admin', 'admin') })
    expect(stillUp.status).toBe(200)
    expect(stillUp.text).toBe('A')
    expect(controller.status()).toEqual(before)
  })
})

describe('ProxyController start failure', () => {
  it('logs loudly but keeps the controller alive when the port is taken', async () => {
    const upstreamPort = await startUpstream('A')
    // Occupy a concrete port so the controller cannot bind it.
    const blocker = http.createServer(() => {})
    servers.push(blocker)
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve))
    const takenPort = (blocker.address() as AddressInfo).port

    controller = new ProxyController({
      base: { ...baseOptions(upstreamPort), listenPort: takenPort },
      settingsFile: tempSettingsFile(),
      log: (level, message) => logs.push(`${level}:${message}`),
    })
    await controller.start()
    expect(controller.status().listenPort).toBe(takenPort)
    expect(controller.status().proxyListening).toBe(false)
    expect(logs.some((line) => line.includes('failed to listen'))).toBe(true)
  })
})

describe('ProxyController start/stop controls', () => {
  it('stops and restarts the service, keeping the target probe independent', async () => {
    const upstreamPort = await startUpstream('A')
    controller = new ProxyController({ base: baseOptions(upstreamPort), settingsFile: tempSettingsFile(), log: () => {} })
    await controller.start()
    expect(controller.status().proxyListening).toBe(true)

    await controller.stop()
    expect(controller.status().proxyListening).toBe(false)
    const probed = await controller.refreshStatus()
    expect(probed.upstreamReachable).toBe(true)

    await controller.start()
    expect(controller.status().proxyListening).toBe(true)
  })

  it('stopDeferred reports stopped immediately and closes the listener shortly after', async () => {
    const upstreamPort = await startUpstream('A')
    controller = new ProxyController({ base: baseOptions(upstreamPort), settingsFile: tempSettingsFile(), log: () => {} })
    await controller.start()
    const status = controller.stopDeferred(0)
    expect(status.proxyListening).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(controller.status().proxyListening).toBe(false)
  })
})

function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}
