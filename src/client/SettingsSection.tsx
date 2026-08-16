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
  RPC_STATUS_ENDPOINT,
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
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [upstreamPort, setUpstreamPort] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const applyPhase = useCallback((next: StatusPhase): void => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  /** Fetch the current proxy status; every outcome is rendered, never thrown. */
  const loadStatus = useCallback(async (): Promise<void> => {
    applyPhase('loading')
    setStatusError(null)
    try {
      const result = await rpc.call(RPC_CHANNEL, RPC_STATUS_ENDPOINT, undefined)
      if (result.ok) {
        setStatus(result.value as LanProxyStatus)
        applyPhase('ok')
      } else {
        setStatusError(result.error.message)
        applyPhase('error')
      }
    } catch (err) {
      console.error('[dsh-lan-proxy] status RPC failed:', err)
      setStatusError(err instanceof Error ? err.message : String(err))
      applyPhase('error')
    }
  }, [rpc, applyPhase])

  useEffect(() => {
    void loadStatus()
    // One automatic retry for transient failures (page opened right around
    // boot or a connection blip) — the manual retry button covers the rest.
    const timer = window.setTimeout(() => {
      if (phaseRef.current === 'error') void loadStatus()
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [loadStatus])

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const payload: LanProxyUpdatePayload = {}
      if (upstreamPort.trim() !== '') {
        const port = Number(upstreamPort.trim())
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          setError(t('form.invalidPort'))
          return
        }
        if (status !== null && port === status.listenPort) {
          setError(t('form.portConflict'))
          return
        }
        payload.upstreamPort = port
      }
      if (username.trim() !== '') payload.username = username.trim()
      if (password !== '') payload.password = password
      if (payload.upstreamPort === undefined && payload.username === undefined && payload.password === undefined) {
        setError(t('form.nothingToSave'))
        return
      }
      const result = await rpc.call(RPC_CHANNEL, RPC_UPDATE_ENDPOINT, payload)
      if (result.ok) {
        const value = result.value as LanProxyUpdateResult
        setStatus(value.status)
        applyPhase('ok')
        setMessage(value.message)
        setUpstreamPort('')
        setUsername('')
        setPassword('')
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
      <StatusRow label={t('status.listenHost')} value={status.listenHost} />
      <StatusRow label={t('status.listenPort')} value={String(status.listenPort)} />
      <StatusRow label={t('status.upstream')} value={`${status.upstreamHost}:${status.upstreamPort}`} />
      <StatusRow label={t('status.username')} value={status.username} />
      <StatusRow label={t('status.auth')} value={authBadge} />
      <StatusRow label={t('status.sessionTtl')} value={`${status.sessionTtlHours} ${t('hours')}`} />
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
        <div className="dsh_lanproxy_cardTitle">{t('status.title')}</div>
        {statusCard}
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
