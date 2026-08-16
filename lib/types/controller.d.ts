import type { LanProxyStatus, LanProxyUpdateResult } from './contract.ts';
/** The fully-resolved runtime options of one proxy instance. */
export interface EffectiveProxyOptions {
    listenHost: string;
    listenPort: number;
    upstreamHost: string;
    upstreamPort: number;
    username: string;
    password: string;
    sessionTtlSeconds: number;
}
export interface ProxyControllerOptions {
    /** Options from the cordis config (schema defaults applied, upstream port resolved). */
    base: EffectiveProxyOptions;
    /** Path of the persisted runtime-settings JSON. */
    settingsFile: string;
    /** Log sink (the plugin passes ctx.logger-based printer). */
    log: (level: 'info' | 'warn' | 'error', message: string) => void;
}
export type UpdateOutcome = {
    ok: true;
    result: LanProxyUpdateResult;
} | {
    ok: false;
    message: string;
};
export declare class ProxyController {
    private readonly opts;
    private handle;
    private boundPort;
    private readonly settings;
    private readonly log;
    private options;
    constructor(opts: ProxyControllerOptions);
    /** Whether a persisted runtime override exists (drives the status flag). */
    private persisted;
    /**
     * Start the proxy (idempotent). Listen errors — the port is already taken,
     * e.g. by the standalone dsh-proxy — are logged loudly but never thrown, so
     * a failed forwarder can never take down the web app boot.
     */
    start(): Promise<void>;
    /** Stop the proxy and every upgraded socket. */
    stop(): Promise<void>;
    /** Stop and start again with the current effective options (the "restart the forwarding service" verb). */
    restart(): Promise<void>;
    /** Current read-only status for the settings page. */
    status(): LanProxyStatus;
    /**
     * Apply an update payload: validate, persist, then restart the forwarding
     * service with the new effective options.
     * @param payload - raw RPC payload from the settings page.
     * @returns the new status, or a user-facing rejection message.
     */
    update(payload: unknown): Promise<UpdateOutcome>;
}
