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
  password: 's3cret',
  authEnabled: true,
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

  it('never reports "started" when the start response is not actually listening', async () => {
    const stoppedStatus = { ...STATUS, proxyListening: false }
    const { rpc, calls } = makeRpc({
      status: () => Promise.resolve({ ok: true, value: stoppedStatus }),
      control: () => Promise.resolve({ ok: true, value: stoppedStatus }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    controlButton(mounted.container, '启动').click()
    await flush()
    expect(calls.some((call) => call.endpoint === RPC_START_ENDPOINT)).toBe(true)
    const text = mounted.container.textContent ?? ''
    expect(text).not.toContain('代理服务已启动')
    expect(text).toContain('更换代理服务端口')
  })
})

describe('update form', () => {
  it('pre-fills the fields with the current values and submits the full payload', async () => {
    const updated = { ...STATUS, listenPort: 3091, username: 'alice' }
    const { rpc, calls } = makeRpc({
      update: () => Promise.resolve({ ok: true, value: { status: updated, notice: 'saved-restarted', message: '已保存并重启转发服务' } }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    expect((inputs[0] as HTMLInputElement).value).toBe('3081')
    expect((inputs[1] as HTMLInputElement).value).toBe('admin')
    expect((inputs[2] as HTMLInputElement).value).toBe('s3cret')

    setInputValue(inputs[0], '3091')
    setInputValue(inputs[1], 'alice')
    flushSync(() => {})
    submitForm(mounted.container)
    await flush()

    const updateCall = calls.find((call) => call.endpoint === RPC_UPDATE_ENDPOINT)
    expect(updateCall).toEqual({ channel: RPC_CHANNEL, endpoint: RPC_UPDATE_ENDPOINT, payload: { listenPort: 3091, username: 'alice', password: 's3cret' } })
    expect(mounted.container.textContent ?? '').toContain('已保存并重启转发服务')
    expect(mounted.container.textContent ?? '').toContain('0.0.0.0:3091')
    // After saving, the form is re-seeded with the returned status.
    expect((inputs[0] as HTMLInputElement).value).toBe('3091')
    expect((inputs[1] as HTMLInputElement).value).toBe('alice')
  })

  it('submits empty strings when credentials are cleared (set-empty semantics)', async () => {
    const cleared = { ...STATUS, username: '', password: '', authEnabled: false }
    const { rpc, calls } = makeRpc({
      update: () => Promise.resolve({ ok: true, value: { status: cleared, notice: 'saved-restarted', message: '已保存并重启转发服务' } }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    setInputValue(inputs[1], '')
    setInputValue(inputs[2], '')
    flushSync(() => {})
    submitForm(mounted.container)
    await flush()

    const updateCall = calls.find((call) => call.endpoint === RPC_UPDATE_ENDPOINT)
    expect(updateCall).toEqual({ channel: RPC_CHANNEL, endpoint: RPC_UPDATE_ENDPOINT, payload: { listenPort: 3081, username: '', password: '' } })
    expect(mounted.container.textContent ?? '').toContain('未启用')
  })

  it('localizes the credentials-partial notice from the host', async () => {
    const partial = { ...STATUS, username: 'half', password: '', authEnabled: false }
    const { rpc } = makeRpc({
      update: () => Promise.resolve({
        ok: true,
        value: { status: partial, notice: 'credentials-partial-restarted', message: '已保存并重启转发服务（注意：需同时设置用户名和密码才会启用密码登录）' },
      }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    submitForm(mounted.container)
    await flush()
    expect(mounted.container.textContent ?? '').toContain('需同时设置用户名和密码')
  })

  it('reports a saved-but-failed rebind with the host reason', async () => {
    const stopped = { ...STATUS, proxyListening: false }
    const { rpc } = makeRpc({
      update: () => Promise.resolve({
        ok: true,
        value: { status: stopped, notice: 'saved-restart-failed', message: '无法监听 0.0.0.0:3081：EADDRINUSE。该端口可能已被占用。' },
      }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    submitForm(mounted.container)
    await flush()
    const text = mounted.container.textContent ?? ''
    expect(text).toContain('已保存，但转发服务未能启动')
    expect(text).toContain('EADDRINUSE')
    expect(text).not.toContain('已保存并重启转发服务')
  })

  it('reports a plain save (no restart) when the proxy is stopped', async () => {
    const stopped = { ...STATUS, proxyListening: false }
    const { rpc } = makeRpc({
      update: () => Promise.resolve({ ok: true, value: { status: stopped, notice: 'saved', message: '已保存' } }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()
    submitForm(mounted.container)
    await flush()
    // The message element carries the notice; the page subtitle mentions
    // restarting services, so assert against the message itself, not body text.
    const messageEl = mounted.container.querySelector('.dsh_lanproxy_message')
    expect(messageEl?.textContent).toBe('已保存')
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

  it('toggles password visibility with the eye button (value stays pre-filled)', async () => {
    const { rpc } = makeRpc()
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    const password = inputs[2]
    expect(password.type).toBe('password')
    expect((password as HTMLInputElement).value).toBe('s3cret')

    const eye = mounted.container.querySelector('.dsh_lanproxy_eye') as HTMLButtonElement
    eye.click()
    flushSync(() => {})
    expect(password.type).toBe('text')
    expect((password as HTMLInputElement).value).toBe('s3cret')

    eye.click()
    flushSync(() => {})
    expect(password.type).toBe('password')
  })

  it('surfaces a host-side rejection message', async () => {
    const { rpc } = makeRpc({
      update: () => Promise.resolve({ ok: false, error: { code: 'bad-request', message: '代理服务端口不能与默认服务端口相同（都是 3080）', details: { issues: [] } } }),
    })
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    // 3081 → local conflict (equals the default service port 3080? no, it
    // passes the local check), so use a port that passes locally and let the
    // host reject it.
    const inputs = mounted.container.querySelectorAll('input')
    setInputValue(inputs[0], '3999')
    flushSync(() => {})
    submitForm(mounted.container)
    await flush()

    expect(mounted.container.textContent ?? '').toContain('不能与默认服务端口相同')
  })

  it('rejects the default-service-port conflict locally', async () => {
    const { rpc, calls } = makeRpc()
    mounted = mount(<SettingsSection {...props(rpc)} />)
    await flush()

    const inputs = mounted.container.querySelectorAll('input')
    setInputValue(inputs[0], '3080')
    flushSync(() => {})
    submitForm(mounted.container)
    await flush()

    expect(mounted.container.textContent ?? '').toContain('不能与默认服务端口相同')
    expect(calls.some((call) => call.endpoint === RPC_UPDATE_ENDPOINT)).toBe(false)
  })
})
