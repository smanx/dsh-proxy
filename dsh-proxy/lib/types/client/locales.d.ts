/** The `dsh-proxy` locale namespace id. */
export declare const NS = "dsh-proxy";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    nav: string;
    'status.title': string;
    'status.proxyPort': string;
    'status.proxyRunning': string;
    'status.proxyStopped': string;
    'status.targetPort': string;
    'status.targetReachable': string;
    'status.targetUnreachable': string;
    'status.username': string;
    'status.auth': string;
    'status.authOn': string;
    'status.authOff': string;
    'status.persistedOn': string;
    'status.persistedOff': string;
    'status.loading': string;
    'status.unreachable': string;
    'status.retry': string;
    'control.start': string;
    'control.stop': string;
    'control.started': string;
    'control.stopped': string;
    'control.failed': string;
    'control.startHintPort': string;
    'form.title': string;
    'form.subtitle': string;
    'form.listenPort': string;
    'form.listenPortHint': string;
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
    'form.updated': string;
    'form.updatedSaved': string;
    'form.updatedPartial': string;
    'form.updatedSavedPartial': string;
    'form.updatedListenFailed': string;
    'form.failed': string;
};
/** The `dsh-proxy` namespace key union. */
export type LanProxyKey = keyof typeof zh;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'dsh-proxy': LanProxyKey;
    }
}
/** English dictionary, checked complete against the zh key set. */
export declare const en: Record<LanProxyKey, string>;
