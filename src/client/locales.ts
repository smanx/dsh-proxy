/**
 * `dsh-lan-proxy` locale namespace: the settings-section copy. Chinese is the
 * product copy; English mirrors it. The namespace is merged into the shared
 * LocaleNamespaceMap so the section's `t` prop is fully typed.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** The `dsh-lan-proxy` locale namespace id. */
export const NS = 'dsh-lan-proxy'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': '局域网代理',
  'status.title': '运行状态',
  'status.listenHost': '监听地址',
  'status.listenPort': '当前监听端口',
  'status.upstream': '转发目标',
  'status.auth': '访问认证',
  'status.authOn': '已启用',
  'status.authOff': '已关闭（局域网开放访问）',
  'status.sessionTtl': '会话有效期',
  'status.persistedOn': '存在已保存的运行配置（优先于 cordis 配置）',
  'status.persistedOff': '使用 cordis 配置',
  'status.loading': '加载中…',
  'status.unreachable': '无法连接代理服务，请确认插件已启用并重启过 dsh web。',
  'form.title': '修改设置',
  'form.subtitle': '保存后会重启转发服务；重启后所有已登录会话将失效，需重新登录。',
  'form.upstreamPort': '转发目标端口（DSH 服务端口）',
  'form.upstreamPortHint': '留空保持不变',
  'form.username': '用户名',
  'form.usernameHint': '留空保持不变',
  'form.password': '密码',
  'form.passwordHint': '留空保持不变；用户名与密码同时为空将关闭认证',
  'form.save': '保存并重启',
  'form.saving': '保存中…',
  'form.invalidPort': '端口必须是 1–65535 的整数',
  'form.portConflict': '转发目标端口不能与监听端口相同',
  'form.nothingToSave': '没有可保存的修改',
  'form.updated': '已保存并重启转发服务',
  'form.failed': '保存失败',
  'hours': '小时',
} satisfies Record<string, string>

/** The `dsh-lan-proxy` namespace key union. */
export type LanProxyKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'dsh-lan-proxy': LanProxyKey
  }
}

/** English dictionary, checked complete against the zh key set. */
export const en: Record<LanProxyKey, string> = {
  'nav': 'LAN Proxy',
  'status.title': 'Status',
  'status.listenHost': 'Listen address',
  'status.listenPort': 'Running port',
  'status.upstream': 'Forward target',
  'status.auth': 'Access auth',
  'status.authOn': 'Enabled',
  'status.authOff': 'Disabled (open LAN access)',
  'status.sessionTtl': 'Session lifetime',
  'status.persistedOn': 'A saved runtime config overrides the cordis config',
  'status.persistedOff': 'Using the cordis config',
  'status.loading': 'Loading…',
  'status.unreachable': 'Cannot reach the proxy service — make sure the plugin is enabled and dsh web was restarted.',
  'form.title': 'Edit settings',
  'form.subtitle': 'Saving restarts the forwarding service; all active sessions are invalidated and users must log in again.',
  'form.upstreamPort': 'Forward target port (DSH service port)',
  'form.upstreamPortHint': 'Leave empty to keep current',
  'form.username': 'Username',
  'form.usernameHint': 'Leave empty to keep current',
  'form.password': 'Password',
  'form.passwordHint': 'Leave empty to keep current; an empty pair disables auth',
  'form.save': 'Save & restart',
  'form.saving': 'Saving…',
  'form.invalidPort': 'Port must be an integer between 1 and 65535',
  'form.portConflict': 'Forward target port must differ from the listen port',
  'form.nothingToSave': 'Nothing to save',
  'form.updated': 'Saved and the forwarding service restarted',
  'form.failed': 'Save failed',
  'hours': 'h',
}
