export interface LanProxyOptions {
    /** Interface the proxy binds (0.0.0.0 for LAN access). */
    listenHost: string;
    /** Port the proxy listens on; 0 asks the OS for a free port. */
    listenPort: number;
    /** Upstream DSH bind host, normally the loopback address. */
    upstreamHost: string;
    /** Upstream DSH port (the web app's actual bound port). */
    upstreamPort: number;
    /** Login / Basic Auth username; empty together with `password` disables auth. */
    username: string;
    /** Login / Basic Auth password; empty together with `username` disables auth. */
    password: string;
    /** Session cookie lifetime in seconds. */
    sessionTtlSeconds: number;
    /** Optional sink for human-readable lifecycle messages. */
    log?: (level: 'info' | 'warn' | 'error', message: string) => void;
}
export interface LanProxyHandle {
    /** Resolves with the bound port once listening; rejects on bind errors. */
    ready: Promise<number>;
    /** Close the listener and every upgraded socket. */
    close: () => Promise<void>;
    /** Human-readable access URLs (local + LAN) for the configured port. */
    describeUrls: (boundPort: number) => {
        local: string;
        lan: string[];
    };
}
/** LAN IPv4 addresses the host currently has, as http URLs on `port`. */
export declare function lanAddresses(port: number): string[];
export declare function startLanProxy(options: LanProxyOptions): LanProxyHandle;
