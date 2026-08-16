/**
 * Shared wire contract between the host plugin and its settings section:
 * the generic Connection RPC channel name, the endpoint names, and the
 * status/update payload shapes. Imported by both halves (type-only on the
 * client side — erased at build).
 */
/** Generic Connection RPC channel mounted by the host plugin. */
export declare const RPC_CHANNEL = "/dsh-lan-proxy";
/** Endpoint: read the current proxy status. */
export declare const RPC_STATUS_ENDPOINT = "status";
/** Endpoint: apply a settings patch and restart the forwarding service. */
export declare const RPC_UPDATE_ENDPOINT = "update";
/** Endpoint: start the forwarding service (idempotent). */
export declare const RPC_START_ENDPOINT = "start";
/** Endpoint: stop the forwarding service (the response is answered before the listener closes). */
export declare const RPC_STOP_ENDPOINT = "stop";
/** Read-only status the settings section shows. */
export interface LanProxyStatus {
    /** Interface the proxy binds (0.0.0.0 = LAN reachable). */
    listenHost: string;
    /** Port the proxy listens on (the OS-assigned value when 0 was configured). */
    listenPort: number;
    /** Whether the proxy is actually bound (false = bind failed, e.g. port busy). */
    proxyListening: boolean;
    /** Upstream DSH host. */
    upstreamHost: string;
    /** Upstream DSH port the proxy forwards to. */
    upstreamPort: number;
    /** Whether the target upstream service answers a probe. */
    upstreamReachable: boolean;
    /** Login username currently enforced. */
    username: string;
    /** Whether the auth gate is on (both credentials non-empty). */
    authEnabled: boolean;
    /** Whether a persisted runtime override exists on top of the cordis config. */
    persisted: boolean;
}
/** Settings-section patch: only fields present are changed; omitted fields keep their values. */
export interface LanProxyUpdatePayload {
    /** New forward target port (1–65535, must differ from the listen port). */
    upstreamPort?: number;
    /** New login username. */
    username?: string;
    /** New login password; an empty string clears it (auth needs a non-empty pair to stay on). */
    password?: string;
}
/** Successful update response. */
export interface LanProxyUpdateResult {
    /** The status after the forwarding service restarted. */
    status: LanProxyStatus;
    /** Human-readable confirmation message. */
    message: string;
}
