/**
 * dsh-proxy host plugin: mounts the authenticated LAN reverse proxy on a
 * second port, forwarding the web app's loopback listener (127.0.0.1:3080 by
 * default) to the LAN with a web-based login gate. The harness deliberately
 * refuses `--host 0.0.0.0` for the web server itself — remote code execution
 * exposure — so this plugin is the sanctioned way to serve the surface beyond
 * loopback, with authentication in front.
 *
 * The plugin also mounts the `/dsh-proxy` generic Connection RPC channel:
 * `status` reads the running proxy, `update` persists a settings patch (target
 * upstream port, username, password) into `$DSH_HOME/dsh-proxy.json` and
 * restarts the forwarding service — the backend of the settings section.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export { lanAddresses, startLanProxy } from './proxy.ts';
export type { LanProxyHandle, LanProxyOptions } from './proxy.ts';
/** Stable Cordis plugin name (the Loader entry and package name). */
export declare const name = "@smanx/dsh-proxy";
/** Services required before load: the web server (upstream port source) and the Connection RPC registry. */
export declare const inject: string[];
/** Plugin configuration, validated at load by the Loader. */
export interface Config {
    /** Interface the proxy binds; 0.0.0.0 exposes the LAN. */
    listenHost: string;
    /** Port the proxy listens on (must differ from the web app's port). */
    listenPort: number;
    /** Upstream DSH bind host. */
    upstreamHost: string;
    /** Upstream DSH port; 0 follows the web app's actual bound port. */
    upstreamPort: number;
    /** Login / Basic Auth username; password login is enabled only when both it and `password` are set. */
    username: string;
    /** Login / Basic Auth password; password login is enabled only when both it and `username` are set. */
    password: string;
    /** Auto-attach the launch token on 401 (off by default). */
    skipLaunchToken: boolean;
}
/** Configuration schema; deployment-varying bounds stay tunable from cordis.yml. */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    listenHost: z<string, string, "defined">;
    listenPort: z<number, number, "defined">;
    upstreamHost: z<string, string, "defined">;
    upstreamPort: z<number, number, "defined">;
    username: z<string, string, "defined">;
    password: z<string, string, "defined">;
    /**
     * Auto-attach the DSH launch token to requests the upstream rejects with
     * 401, so a first-time LAN browser completes the token→cookie exchange
     * without being handed the token. OFF by default: enabling it removes
     * DSH's token check for the proxied surface, leaving the proxy's Basic Auth
     * (if configured) as the only barrier.
     */
    skipLaunchToken: z<boolean, boolean, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    listenHost: z<string, string, "defined">;
    listenPort: z<number, number, "defined">;
    upstreamHost: z<string, string, "defined">;
    upstreamPort: z<number, number, "defined">;
    username: z<string, string, "defined">;
    password: z<string, string, "defined">;
    /**
     * Auto-attach the DSH launch token to requests the upstream rejects with
     * 401, so a first-time LAN browser completes the token→cookie exchange
     * without being handed the token. OFF by default: enabling it removes
     * DSH's token check for the proxied surface, leaving the proxy's Basic Auth
     * (if configured) as the only barrier.
     */
    skipLaunchToken: z<boolean, boolean, "defined">;
}>>, "plain">;
/**
 * Mount the proxy and the RPC channel as effects on this plugin's fiber:
 * unloading the plugin closes the listener, every upgraded socket, and the
 * channel.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
