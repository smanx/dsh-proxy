/** The `dsh-lan-proxy` locale namespace id. */
export declare const NS = "dsh-lan-proxy";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    nav: string;
    'status.title': string;
    'status.listenHost': string;
    'status.listenPort': string;
    'status.upstream': string;
    'status.username': string;
    'status.auth': string;
    'status.authOn': string;
    'status.authOff': string;
    'status.sessionTtl': string;
    'status.persistedOn': string;
    'status.persistedOff': string;
    'status.loading': string;
    'status.unreachable': string;
    'status.retry': string;
    'form.title': string;
    'form.subtitle': string;
    'form.upstreamPort': string;
    'form.upstreamPortHint': string;
    'form.username': string;
    'form.usernameHint': string;
    'form.password': string;
    'form.passwordHint': string;
    'form.showPassword': string;
    'form.hidePassword': string;
    'form.save': string;
    'form.saving': string;
    'form.invalidPort': string;
    'form.portConflict': string;
    'form.nothingToSave': string;
    'form.updated': string;
    'form.failed': string;
    hours: string;
};
/** The `dsh-lan-proxy` namespace key union. */
export type LanProxyKey = keyof typeof zh;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'dsh-lan-proxy': LanProxyKey;
    }
}
/** English dictionary, checked complete against the zh key set. */
export declare const en: Record<LanProxyKey, string>;
