/**
 * The settings page section for the LAN proxy: shows the running port and
 * forward target, and edits the target upstream port, username, and password.
 * Saving calls the host `/dsh-lan-proxy` `update` endpoint, which persists the
 * patch and restarts the forwarding service; the returned status re-renders
 * the card. All RPC results are rendered, never thrown to the shell.
 */
import { useEffect, useState } from 'react'
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

/** One labeled status row. */
function StatusRow(props: { label: ReactNode; value: ReactNode }): ReactNode {
  return (
    <div className="dsh_lanproxy_row">
      <span className="dsh_lanproxy_rowLabel">{props.label}</span>
      <span className="dsh_lanproxy_rowValue">{props.value}</span>
    </div>
  )
}

/**
 * Render the section.
 * @param props - runtime share, the injected rpc caller, and `t`.
 */
export function SettingsSection({ rpc, t }: SettingsSectionProps) {
  const [status, setStatus] = useState<LanProxyStatus | null>(null)
  const [unreachable, setUnreachable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [upstreamPort, setUpstreamPort] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    let cancelled = false
    void rpc
      .call(RPC_CHANNEL, RPC_STATUS_ENDPOINT, undefined)
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          setStatus(result.value as LanProxyStatus)
        } else {
          setUnreachable(true)
        }
      })
      .catch(() => {
        if (!cancelled) setUnreachable(true)
      })
    return () => {
      cancelled = true
    }
  }, [rpc])

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
        setMessage(value.message)
        setUpstreamPort('')
        setUsername('')
        setPassword('')
      } else {
        setError(result.error.message)
      }
    } catch (err) {
      setError(`${t('form.failed')}：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const authBadge = status === null || status.authEnabled
    ? <span className="dsh_lanproxy_badge dsh_lanproxy_badgeOn">{t('status.authOn')}</span>
    : <span className="dsh_lanproxy_badge dsh_lanproxy_badgeOff">{t('status.authOff')}</span>

  return (
    <section className="dsh_lanproxy_section" aria-labelledby="dsh-lanproxy-settings-title">
      <div className="dsh_lanproxy_heading">
        <h2 id="dsh-lanproxy-settings-title" className="dsh_lanproxy_title">{t('nav')}</h2>
        <p className="dsh_lanproxy_subtitle">{t('form.subtitle')}</p>
      </div>

      <div className="dsh_lanproxy_card">
        <div className="dsh_lanproxy_cardTitle">{t('status.title')}</div>
        {unreachable || status === null ? (
          <p className="dsh_lanproxy_error">{t('status.unreachable')}</p>
        ) : (
          <>
            <StatusRow label={t('status.listenHost')} value={status.listenHost} />
            <StatusRow label={t('status.listenPort')} value={String(status.listenPort)} />
            <StatusRow label={t('status.upstream')} value={`${status.upstreamHost}:${status.upstreamPort}`} />
            <StatusRow label={t('status.auth')} value={authBadge} />
            <StatusRow label={t('status.sessionTtl')} value={`${status.sessionTtlHours} ${t('hours')}`} />
            <p className="dsh_lanproxy_hint">
              {status.persisted ? t('status.persistedOn') : t('status.persistedOff')}
            </p>
          </>
        )}
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
          <input
            id="dsh-lanproxy-password"
            className="dsh_lanproxy_input"
            type="password"
            autoComplete="new-password"
            placeholder={t('form.passwordHint')}
            value={password}
            onChange={(event) => { setPassword(event.target.value) }}
          />
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
