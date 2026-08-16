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
  RPC_START_ENDPOINT,
  RPC_STATUS_ENDPOINT,
  RPC_STOP_ENDPOINT,
  RPC_UPDATE_ENDPOINT,
  type LanProxyStatus,
} from '../src/contract.ts'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = false

const t = (key: LanProxyKey): string => zh[key] ?? key

const STATUS: LanProxyStatus = {
  listenHost: '0.0.0.0',
  listenPort: 3081,
  proxyListening: true,
  upstreamHost: '127.0.0.1',
  upstreamPort: 3080,
  upstreamReachable: true,
  username: 'admin',
  authEnabled: true,
  sessionTtlHours: 12,
  persisted: false,
}

function makeRpc(over: {
  status?: (channel: string, endpoint: string, payload: unknown) => Promise<unknown>
  update?: (channel: string, endpoint: string, payload: unknown) => Promise<unknown>
  control?: (endpoint: string, payload: unknown) => Promise<unknown>
} = {}): { rpc: ClientConnectionRpc; calls: Array<{ channel: string; endpoint: string; payload: unknown }> } {
  const calls: Array<{ channel: string; endpoint: string; payload: unknown }> = []
  const rpc = {
    call: vi.fn((channel: string, endpoint: string, payload: unknown) => {
      calls.push({ channel, endpoint, payload })
      if (endpoint === RPC_STATUS_ENDPOINT && over.status) return over.status(channel, endpoint, payload)
      if (endpoint === RPC_UPDATE_ENDPOINT && over.update) return over.update(channel, endpoint, payload)
      if ((endpoint === RPC_START_ENDPOINT || endpoint === RPC_STOP_ENDPOINT) && over.control) {
        return over.control(endpoint, payload)
      }
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

/** Submit the section form (jsdom's submit-button click does not fire the form's submit event). */
function submitForm(container: HTMLElement): void {
  const form = container.querySelector('form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
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
  it('renders both ports with green lights, plus the auth state', async () => {
    const { rpc } = makeRpc()
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    const text = mounted.container.textContent ?? ''
    expect(text).toContain('0.0.0.0:3081')
    expect(text).toContain('运行中')
    expect(text).toContain('127.0.0.1:3080')
    expect(text).toContain('可访问')
    expect(text).toContain('admin')
    expect(text).toContain('密码登录')
    expect(text).toContain('已启用')
    // The status RPC must carry an explicit (present) payload field — the
    // host envelope schema rejects a dropped undefined payload key.
    expect(rpc.call).toHaveBeenCalledWith(RPC_CHANNEL, RPC_STATUS_ENDPOINT, {})
  })

  it('lights both ports red when the proxy is down and the target is unreachable', async () => {
    const { rpc } = makeRpc({
      status: () => Promise.resolve({
        ok: true,
        value: { ...STATUS, proxyListening: false, upstreamReachable: false },
      }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    const text = mounted.container.textContent ?? ''
    expect(text).toContain('未运行')
    expect(text).toContain('不可访问')
    expect(text).not.toContain('运行中')
  })

  it('shows the unreachable banner when the status RPC fails', async () => {
    const { rpc } = makeRpc({
      status: () => Promise.reject(new Error('transport down')),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    expect(mounted.container.textContent ?? '').toContain('无法连接代理服务')
  })

  it('shows a loading hint instead of the failure banner while the status RPC is in flight', async () => {
    const { rpc } = makeRpc()
    mounted = mount(<SettingsSection {...props(rpc)} />)
    const text = mounted.container.textContent ?? ''
    expect(text).toContain('加载中')
    expect(text).not.toContain('无法连接代理服务')
    await flush()
    expect(mounted.container.textContent ?? '').toContain('3081')
  })

  it('recovers via the retry button after a transient failure', async () => {
    let failFirst = true
    const { rpc } = makeRpc({
      status: () => (failFirst ? Promise.reject(new Error('transient')) : Promise.resolve({ ok: true, value: STATUS })),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    expect(mounted.container.textContent ?? '').toContain('无法连接代理服务')
    failFirst = false
    const retry = Array.from(mounted.container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('重试')) as HTMLButtonElement
    retry.click()
    await flush()
    expect(mounted.container.textContent ?? '').toContain('3081')
    expect(mounted.container.textContent ?? '').not.toContain('无法连接代理服务')
  })
})

describe('start/stop controls', () => {
  const controlButton = (container: HTMLElement, label: string): HTMLButtonElement =>
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes(label)) as HTMLButtonElement

  it('disables start while running and stop while stopped', async () => {
    mounted = mount(<SettingsSection {...props(makeRpc().rpc)} />)
    await flush()
    expect(controlButton(mounted.container, '启动').disabled).toBe(true)
    expect(controlButton(mounted.container, '停止').disabled).toBe(false)

    mounted.root.unmount()
    const stopped = makeRpc({ status: () => Promise.resolve({ ok: true, value: { ...STATUS, proxyListening: false } }) })
    mounted = mount(<SettingsSection {...props(stopped.rpc)} />)
    await flush()
    expect(controlButton(mounted.container, '启动').disabled).toBe(false)
    expect(controlButton(mounted.container, '停止').disabled).toBe(true)
  })

  it('stops and starts the proxy through the control buttons', async () => {
    let running = true
    const stoppedStatus = { ...STATUS, proxyListening: false }
    const { rpc, calls } = makeRpc({
      status: () => Promise.resolve({ ok: true, value: running ? STATUS : stoppedStatus }),
      control: (endpoint) => {
        if (endpoint === RPC_STOP_ENDPOINT) {
          running = false
          return Promise.resolve({ ok: true, value: stoppedStatus })
        }
        running = true
        return Promise.resolve({ ok: true, value: STATUS })
      },
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    controlButton(mounted.container, '停止').click()
    await flush()
    expect(calls.some((call) => call.endpoint === RPC_STOP_ENDPOINT)).toBe(true)
    expect(mounted.container.textContent ?? '').toContain('代理服务已停止')
    expect(controlButton(mounted.container, '启动').disabled).toBe(false)

    controlButton(mounted.container, '启动').click()
    await flush()
    expect(calls.some((call) => call.endpoint === RPC_START_ENDPOINT)).toBe(true)
    expect(mounted.container.textContent ?? '').toContain('代理服务已启动')
    expect(controlButton(mounted.container, '停止').disabled).toBe(false)
  })

  it('surfaces a control failure without crashing', async () => {
    const { rpc } = makeRpc({
      control: () => Promise.resolve({ ok: false, error: { code: 'internal', message: 'boom', details: {} } }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    controlButton(mounted.container, '停止').click()
    await flush()
    expect(mounted.container.textContent ?? '').toContain('boom')
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
    submitForm(mounted.container)
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
    submitForm(mounted.container)
    await flush()

    expect(mounted.container.textContent ?? '').toContain('端口必须是 1–65535 的整数')
    expect(calls.some((call) => call.endpoint === RPC_UPDATE_ENDPOINT)).toBe(false)
  })

  it('toggles password visibility with the eye button', async () => {
    const { rpc } = makeRpc()
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    const password = inputs[2]
    expect(password.type).toBe('password')

    const eye = mounted.container.querySelector('.dsh_lanproxy_eye') as HTMLButtonElement
    eye.click()
    flushSync(() => {})
    expect(password.type).toBe('text')

    eye.click()
    flushSync(() => {})
    expect(password.type).toBe('password')
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
    submitForm(mounted.container)
    await flush()

    expect(mounted.container.textContent ?? '').toContain('不能与监听端口相同')
  })
})
