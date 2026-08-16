/**
 * dsh-lan-proxy client plugin: the browser half of the LAN-proxy settings
 * page. Registers the `settings.section` entry ("局域网代理") that shows the
 * running proxy status and edits the forward target port / username /
 * password through the host `/dsh-lan-proxy` Connection RPC channel.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the settings.section SlotMap entry and its owner props.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the ctx.locale Context merge and LocaleNamespaceMap.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { SettingsSection, type SettingsSectionInjected } from './SettingsSection.tsx'
import { NS, en, zh } from './locales.ts'
import { adoptStyles } from './styles.ts'

/** Required services: slots (section registry), locale, and the wire connection. */
export const inject = ['slots', 'locale', 'connection']

/**
 * Compose the settings section.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  adoptStyles()
  console.info('[dsh-lan-proxy] bundle loaded')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-lan-proxy: dictionaries')
  const t = ctx.locale.bind(NS)
  // The client connection face is read through the service store, not the
  // `ctx.connection` property proxy: the host dsh-client-connection package
  // merges a different `connection` Context member, and the two collide in
  // this single-program build.
  const connection = ctx.get('connection') as unknown as ConnectionHandle
  const rpc = connection.rpc
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-lan-proxy',
    order: 70,
    label: () => t('nav'),
    locale: NS,
    inject: (): SettingsSectionInjected => ({ rpc }),
  }, SettingsSection))
}
