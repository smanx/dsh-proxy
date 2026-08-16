// @vitest-environment jsdom
/**
 * The LAN-proxy settings section presentation: the status card renders from
 * the host `status` RPC, the form submits an update payload (and restarts the
 * service), invalid ports are rejected locally, and transport failures surface
 * as the unreachable banner.
 */
import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsSection, type SettingsSectionProps } from '../src/client/SettingsSection.tsx'
import { zh, type LanProxyKey } from '../src/client/locales.ts'
import {
  RPC_CHANNEL,
  RPC_STATUS_ENDPOINT,
  RPC_UPDATE_ENDPOINT,
  type LanProxyStatus,
} from '../src/contract.ts'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = false

const t = (key: LanProxyKey): string => zh[key] ?? key

const STATUS: LanProxyStatus = {
  listenHost: '0.0.0.0',
  listenPort: 3081,
  upstreamHost: '127.0.0.1',
  upstreamPort: 3080,
  username: 'admin',
  authEnabled: true,
  sessionTtlHours: 12,
  persisted: false,
}

function makeRpc(over: {
  status?: (channel: string, endpoint: string, payload: unknown) => Promise<unknown>
  update?: (channel: string, endpoint: string, payload: unknown) => Promise<unknown>
} = {}): { rpc: ClientConnectionRpc; calls: Array<{ channel: string; endpoint: string; payload: unknown }> } {
  const calls: Array<{ channel: string; endpoint: string; payload: unknown }> = []
  const rpc = {
    call: vi.fn((channel: string, endpoint: string, payload: unknown) => {
      calls.push({ channel, endpoint, payload })
      if (endpoint === RPC_STATUS_ENDPOINT && over.status) return over.status(channel, endpoint, payload)
      if (endpoint === RPC_UPDATE_ENDPOINT && over.update) return over.update(channel, endpoint, payload)
      return Promise.resolve({ ok: true, value: STATUS })
    }),
  } as unknown as ClientConnectionRpc
  return { rpc, calls }
}

function props(rpc: ClientConnectionRpc): SettingsSectionProps {
  return { rpc, t, close: () => {} } as unknown as SettingsSectionProps
}

function mount(element: ReactElement): { root: Root; container: HTMLDivElement } {
  const container = document.createElement('div')
  const root = createRoot(container)
  flushSync(() => { root.render(element) })
  return { root, container }
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

let mounted: { root: Root; container: HTMLDivElement } | null = null

beforeEach(() => {
  document.head.innerHTML = ''
})

afterEach(() => {
  mounted?.root.unmount()
  mounted = null
})

describe('status card', () => {
  it('renders the running port, forward target, and auth state', async () => {
    const { rpc } = makeRpc()
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    const text = mounted.container.textContent ?? ''
    expect(text).toContain('3081')
    expect(text).toContain('127.0.0.1:3080')
    expect(text).toContain('admin')
    expect(text).toContain('已启用')
    expect(rpc.call).toHaveBeenCalledWith(RPC_CHANNEL, RPC_STATUS_ENDPOINT, undefined)
  })

  it('shows the unreachable banner when the status RPC fails', async () => {
    const { rpc } = makeRpc({
      status: () => Promise.reject(new Error('transport down')),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    expect(mounted.container.textContent ?? '').toContain('无法连接代理服务')
  })
})

describe('update form', () => {
  it('submits the target port, username, and password patch and shows the message', async () => {
    const updated = { ...STATUS, upstreamPort: 3090, username: 'alice' }
    const { rpc, calls } = makeRpc({
      update: () => Promise.resolve({ ok: true, value: { status: updated, message: '已保存并重启转发服务' } }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    setInputValue(inputs[0], '3090')
    setInputValue(inputs[1], 'alice')
    setInputValue(inputs[2], 's3cret')
    flushSync(() => {})
    const submit = mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement
    submit.click()
    await flush()

    const updateCall = calls.find((call) => call.endpoint === RPC_UPDATE_ENDPOINT)
    expect(updateCall).toEqual({ channel: RPC_CHANNEL, endpoint: RPC_UPDATE_ENDPOINT, payload: { upstreamPort: 3090, username: 'alice', password: 's3cret' } })
    expect(mounted.container.textContent ?? '').toContain('已保存并重启转发服务')
    expect(mounted.container.textContent ?? '').toContain('127.0.0.1:3090')
  })

  it('rejects an invalid port locally without calling the host', async () => {
    const { rpc, calls } = makeRpc()
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    setInputValue(inputs[0], '99999')
    flushSync(() => {})
    const submit = mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement
    submit.click()
    await flush()

    expect(mounted.container.textContent ?? '').toContain('端口必须是 1–65535 的整数')
    expect(calls.some((call) => call.endpoint === RPC_UPDATE_ENDPOINT)).toBe(false)
  })

  it('surfaces a host-side rejection message', async () => {
    const { rpc } = makeRpc({
      update: () => Promise.resolve({ ok: false, error: { code: 'bad-request', message: '转发目标端口不能与监听端口相同（都是 3081）', details: { issues: [] } } }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    setInputValue(inputs[0], '3081')
    flushSync(() => {})
    const submit = mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement
    submit.click()
    await flush()

    expect(mounted.container.textContent ?? '').toContain('不能与监听端口相同')
  })
})
