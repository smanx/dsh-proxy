/**
 * The settings page section for the LAN proxy: shows the running port and
 * forward target, and edits the target upstream port, username, and password.
 * Saving calls the host `/dsh-lan-proxy` `update` endpoint, which persists the
 * patch and restarts the forwarding service; the returned status re-renders
 * the card. All RPC results are rendered, never thrown to the shell.
 *
 * Status loading is phase-driven ('loading' | 'ok' | 'error'): the failure
 * banner only ever appears after a real rejection, never during the in-flight
 * request; a transient boot-time failure retries once automatically and the
 * banner carries a manual retry button plus the technical error detail.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import {
  RPC_CHANNEL,
  RPC_START_ENDPOINT,
  RPC_STATUS_ENDPOINT,
  RPC_STOP_ENDPOINT,
  RPC_UPDATE_ENDPOINT,
  type LanProxyStatus,
  type LanProxyUpdatePayload,
  type LanProxyUpdateResult,
} from '../contract.ts'
import type { LanProxyKey } from './locales.ts'

/** Injected business face: the generic Connection RPC caller. */
export interface SettingsSectionInjected {
  rpc: ClientConnectionRpc
}

/** Full section props: runtime share + injected face + the locale seat. */
export type SettingsSectionProps = PropsRuntime<'settings.section'> & InjectFace<SettingsSectionInjected> & PropsLocale<'dsh-lan-proxy'>

/** Status-card lifecycle phase. */
type StatusPhase = 'loading' | 'ok' | 'error'

/** One labeled status row. */
function StatusRow(props: { label: ReactNode; value: ReactNode }): ReactNode {
  return (
    <div className="dsh_lanproxy_row">
      <span className="dsh_lanproxy_rowLabel">{props.label}</span>
      <span className="dsh_lanproxy_rowValue">{props.value}</span>
    </div>
  )
}

/** A port with a red/green running light and a short state label. */
function PortStatus(props: { port: string; ok: boolean; okText: string; failText: string }): ReactNode {
  return (
    <span className="dsh_lanproxy_portStatus">
      <span className={props.ok ? 'dsh_lanproxy_dot dsh_lanproxy_dotOn' : 'dsh_lanproxy_dot dsh_lanproxy_dotOff'} />
      <span className="dsh_lanproxy_portValue">{props.port}</span>
      <span className={props.ok ? 'dsh_lanproxy_statusText dsh_lanproxy_statusTextOn' : 'dsh_lanproxy_statusText dsh_lanproxy_statusTextOff'}>
        {props.ok ? props.okText : props.failText}
      </span>
    </span>
  )
}

/** Eye icon (visibility on). */
function EyeIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Eye-off icon (visibility off). */
function EyeOffIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

/**
 * Render the section.
 * @param props - runtime share, the injected rpc caller, and `t`.
 */
export function SettingsSection({ rpc, t }: SettingsSectionProps) {
  const [phase, setPhase] = useState<StatusPhase>('loading')
  const phaseRef = useRef<StatusPhase>('loading')
  const [status, setStatus] = useState<LanProxyStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [controlling, setControlling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [controlError, setControlError] = useState<string | null>(null)
  const [controlMessage, setControlMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [upstreamPort, setUpstreamPort] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // Ref (not state): the form is seeded from the first successful status
  // load only; a state dependency here would re-run the load effect.
  const formSeededRef = useRef(false)

  const applyPhase = useCallback((next: StatusPhase): void => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  /** Write the current values back into the form (empty means "set empty"). */
  const applyStatusToForm = useCallback((next: LanProxyStatus): void => {
    setUpstreamPort(String(next.upstreamPort))
    setUsername(next.username)
    setPassword(next.password ?? '')
  }, [])

  /** Fetch the current proxy status; every outcome is rendered, never thrown. */
  const loadStatus = useCallback(async (): Promise<void> => {
    applyPhase('loading')
    setStatusError(null)
    try {
      // The host envelope schema requires the `payload` field to be present,
      // and JSON.stringify drops undefined-valued keys — an explicit empty
      // object keeps the wire message valid.
      const result = await rpc.call(RPC_CHANNEL, RPC_STATUS_ENDPOINT, {})
      if (result.ok) {
        const next = result.value as LanProxyStatus
        setStatus(next)
        applyPhase('ok')
        if (!formSeededRef.current) {
          applyStatusToForm(next)
          formSeededRef.current = true
        }
      } else {
        setStatusError(result.error.message)
        applyPhase('error')
      }
    } catch (err) {
      console.error('[dsh-lan-proxy] status RPC failed:', err)
      setStatusError(err instanceof Error ? err.message : String(err))
      applyPhase('error')
    }
  }, [rpc, applyPhase, applyStatusToForm])

  useEffect(() => {
    void loadStatus()
    // One automatic retry for transient failures (page opened right around
    // boot or a connection blip) — the manual retry button covers the rest.
    const timer = window.setTimeout(() => {
      if (phaseRef.current === 'error') void loadStatus()
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [loadStatus])

  /** Start or stop the forwarding service; the returned status re-renders the card. */
  const runControl = useCallback(async (action: 'start' | 'stop'): Promise<void> => {
    setControlling(true)
    setControlError(null)
    setControlMessage(null)
    try {
      const result = await rpc.call(
        RPC_CHANNEL,
        action === 'start' ? RPC_START_ENDPOINT : RPC_STOP_ENDPOINT,
        {},
      )
      if (result.ok) {
        setStatus(result.value as LanProxyStatus)
        setControlMessage(action === 'start' ? t('control.started') : t('control.stopped'))
      } else {
        setControlError(result.error.message)
      }
    } catch (err) {
      console.error(`[dsh-lan-proxy] ${action} RPC failed:`, err)
      setControlError(`${t('control.failed')}：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setControlling(false)
    }
  }, [rpc, t])

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      // The form is pre-filled with the current values and always submits the
      // FULL payload: clearing a field intentionally SETS it empty (both empty
      // disables password login), it never means "keep unchanged".
      const port = Number(upstreamPort.trim())
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        setError(t('form.invalidPort'))
        return
      }
      if (status !== null && port === status.listenPort) {
        setError(t('form.portConflict'))
        return
      }
      const payload: LanProxyUpdatePayload = {
        upstreamPort: port,
        username: username.trim(),
        password,
      }
      const result = await rpc.call(RPC_CHANNEL, RPC_UPDATE_ENDPOINT, payload)
      if (result.ok) {
        const value = result.value as LanProxyUpdateResult
        setStatus(value.status)
        applyPhase('ok')
        setMessage(value.message)
        applyStatusToForm(value.status)
      } else {
        setError(result.error.message)
      }
    } catch (err) {
      console.error('[dsh-lan-proxy] update RPC failed:', err)
      setError(`${t('form.failed')}：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const authBadge = status === null || status.authEnabled
    ? <span className="dsh_lanproxy_badge dsh_lanproxy_badgeOn">{t('status.authOn')}</span>
    : <span className="dsh_lanproxy_badge dsh_lanproxy_badgeOff">{t('status.authOff')}</span>

  const statusCard = phase === 'loading' ? (
    <p className="dsh_lanproxy_hint">{t('status.loading')}</p>
  ) : phase === 'error' ? (
    <div className="dsh_lanproxy_statusError">
      <p className="dsh_lanproxy_error">{t('status.unreachable')}</p>
      {statusError !== null ? <p className="dsh_lanproxy_hint">{statusError}</p> : null}
      <button type="button" className="dsh_lanproxy_button" onClick={() => { void loadStatus() }}>
        {t('status.retry')}
      </button>
    </div>
  ) : status !== null ? (
    <>
      <StatusRow
        label={t('status.proxyPort')}
        value={<PortStatus port={`${status.listenHost}:${status.listenPort}`} ok={status.proxyListening} okText={t('status.proxyRunning')} failText={t('status.proxyStopped')} />}
      />
      <StatusRow
        label={t('status.targetPort')}
        value={<PortStatus port={`${status.upstreamHost}:${status.upstreamPort}`} ok={status.upstreamReachable} okText={t('status.targetReachable')} failText={t('status.targetUnreachable')} />}
      />
      <StatusRow label={t('status.username')} value={status.username} />
      <StatusRow label={t('status.auth')} value={authBadge} />
      <p className="dsh_lanproxy_hint">
        {status.persisted ? t('status.persistedOn') : t('status.persistedOff')}
      </p>
    </>
  ) : null

  return (
    <section className="dsh_lanproxy_section" aria-labelledby="dsh-lanproxy-settings-title">
      <div className="dsh_lanproxy_heading">
        <h2 id="dsh-lanproxy-settings-title" className="dsh_lanproxy_title">{t('nav')}</h2>
        <p className="dsh_lanproxy_subtitle">{t('form.subtitle')}</p>
      </div>

      <div className="dsh_lanproxy_card">
        <div className="dsh_lanproxy_cardHeader">
          <div className="dsh_lanproxy_cardTitle">{t('status.title')}</div>
          {phase === 'ok' && status !== null ? (
            <div className="dsh_lanproxy_controls">
              <button
                type="button"
                className="dsh_lanproxy_button"
                disabled={controlling || status.proxyListening}
                onClick={() => { void runControl('start') }}
              >
                {t('control.start')}
              </button>
              <button
                type="button"
                className="dsh_lanproxy_button dsh_lanproxy_buttonStop"
                disabled={controlling || !status.proxyListening}
                onClick={() => { void runControl('stop') }}
              >
                {t('control.stop')}
              </button>
            </div>
          ) : null}
        </div>
        {statusCard}
        {controlMessage !== null ? <p className="dsh_lanproxy_message">{controlMessage}</p> : null}
        {controlError !== null ? <p className="dsh_lanproxy_error">{controlError}</p> : null}
      </div>

      <form className="dsh_lanproxy_card dsh_lanproxy_form" onSubmit={(event) => { void submit(event) }}>
        <div>
          <div className="dsh_lanproxy_cardTitle">{t('form.title')}</div>
        </div>

        <div className="dsh_lanproxy_field">
          <label className="dsh_lanproxy_fieldLabel" htmlFor="dsh-lanproxy-upstream-port">{t('form.upstreamPort')}</label>
          <input
            id="dsh-lanproxy-upstream-port"
            className="dsh_lanproxy_input"
            type="number"
            min={1}
            max={65535}
            inputMode="numeric"
            placeholder={t('form.upstreamPortHint')}
            value={upstreamPort}
            onChange={(event) => { setUpstreamPort(event.target.value) }}
          />
        </div>

        <div className="dsh_lanproxy_field">
          <label className="dsh_lanproxy_fieldLabel" htmlFor="dsh-lanproxy-username">{t('form.username')}</label>
          <input
            id="dsh-lanproxy-username"
            className="dsh_lanproxy_input"
            type="text"
            autoComplete="username"
            placeholder={t('form.usernameHint')}
            value={username}
            onChange={(event) => { setUsername(event.target.value) }}
          />
        </div>

        <div className="dsh_lanproxy_field">
          <label className="dsh_lanproxy_fieldLabel" htmlFor="dsh-lanproxy-password">{t('form.password')}</label>
          <div className="dsh_lanproxy_passwordWrap">
            <input
              id="dsh-lanproxy-password"
              className="dsh_lanproxy_input dsh_lanproxy_passwordInput"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('form.passwordHint')}
              value={password}
              onChange={(event) => { setPassword(event.target.value) }}
            />
            <button
              type="button"
              className="dsh_lanproxy_eye"
              aria-label={showPassword ? t('form.hidePassword') : t('form.showPassword')}
              title={showPassword ? t('form.hidePassword') : t('form.showPassword')}
              onClick={() => { setShowPassword((visible) => !visible) }}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className="dsh_lanproxy_actions">
          <button type="submit" className="dsh_lanproxy_button" disabled={saving}>
            {saving ? t('form.saving') : t('form.save')}
          </button>
          {message !== null ? <p className="dsh_lanproxy_message">{message}</p> : null}
          {error !== null ? <p className="dsh_lanproxy_error">{error}</p> : null}
        </div>
      </form>
    </section>
  )
}
