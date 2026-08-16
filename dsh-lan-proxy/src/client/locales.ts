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
  'status.proxyPort': '代理服务端口',
  'status.proxyRunning': '运行中',
  'status.proxyStopped': '未运行',
  'status.targetPort': '默认服务端口',
  'status.targetReachable': '可访问',
  'status.targetUnreachable': '不可访问',
  'status.username': '当前用户名',
  'status.auth': '密码登录',
  'status.authOn': '已启用',
  'status.authOff': '未启用（局域网开放访问）',
  'status.persistedOn': '存在已保存的运行配置（优先于 cordis 配置）',
  'status.persistedOff': '使用 cordis 配置',
  'status.loading': '加载中…',
  'status.unreachable': '无法连接代理服务，请确认插件已启用并重启过 dsh web。',
  'status.retry': '重试',
  'control.start': '启动',
  'control.stop': '停止',
  'control.started': '代理服务已启动',
  'control.stopped': '代理服务已停止',
  'control.failed': '操作失败',
  'form.title': '修改设置',
  'form.subtitle': '启用密码登录后，浏览器会弹出原生 Basic Auth 登录框；保存修改会重启转发服务。',
  'form.listenPort': '代理服务端口（监听端口）',
  'form.listenPortHint': '1–65535',
  'form.username': '用户名',
  'form.usernameHint': '清空即设为空',
  'form.password': '密码',
  'form.passwordHint': '清空即设为空；用户名与密码需同时非空才会启用密码登录',
  'form.showPassword': '显示密码',
  'form.hidePassword': '隐藏密码',
  'form.save': '应用',
  'form.saving': '应用中…',
  'form.invalidPort': '端口必须是 1–65535 的整数',
  'form.portConflict': '代理服务端口不能与默认服务端口相同',
  'form.updated': '已保存并重启转发服务',
  'form.updatedPartial': '已保存并重启转发服务（注意：需同时设置用户名和密码才会启用密码登录）',
  'form.failed': '保存失败',
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
  'status.proxyPort': 'Proxy port',
  'status.proxyRunning': 'Running',
  'status.proxyStopped': 'Not running',
  'status.targetPort': 'Default service port',
  'status.targetReachable': 'Reachable',
  'status.targetUnreachable': 'Unreachable',
  'status.username': 'Username',
  'status.auth': 'Password login',
  'status.authOn': 'Enabled',
  'status.authOff': 'Not enabled (open access)',
  'status.persistedOn': 'A saved runtime config overrides the cordis config',
  'status.persistedOff': 'Using the cordis config',
  'status.loading': 'Loading…',
  'status.unreachable': 'Cannot reach the proxy service — make sure the plugin is enabled and dsh web was restarted.',
  'status.retry': 'Retry',
  'control.start': 'Start',
  'control.stop': 'Stop',
  'control.started': 'Proxy service started',
  'control.stopped': 'Proxy service stopped',
  'control.failed': 'Action failed',
  'form.title': 'Edit settings',
  'form.subtitle': 'With password login enabled, the browser shows its native Basic Auth dialog; saving restarts the forwarding service.',
  'form.listenPort': 'Proxy port (listen)',
  'form.listenPortHint': '1–65535',
  'form.username': 'Username',
  'form.usernameHint': 'Empty to set blank',
  'form.password': 'Password',
  'form.passwordHint': 'Empty to set blank; password login requires BOTH username and password',
  'form.showPassword': 'Show password',
  'form.hidePassword': 'Hide password',
  'form.save': 'Apply',
  'form.saving': 'Applying…',
  'form.invalidPort': 'Port must be an integer between 1 and 65535',
  'form.portConflict': 'Proxy port must differ from the default service port',
  'form.updated': 'Saved and the forwarding service restarted',
  'form.updatedPartial': 'Saved and restarted (note: password login requires BOTH username and password)',
  'form.failed': 'Save failed',
}
