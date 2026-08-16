/**
 * dsh-lan-proxy host plugin: mounts the authenticated LAN reverse proxy on a
 * second port, forwarding the web app's loopback listener (127.0.0.1:3080 by
 * default) to the LAN with a web-based login gate. The harness deliberately
 * refuses `--host 0.0.0.0` for the web server itself — remote code execution
 * exposure — so this plugin is the sanctioned way to serve the surface beyond
 * loopback, with authentication in front.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export { lanAddresses, startLanProxy } from './proxy.ts';
export type { LanProxyHandle, LanProxyOptions } from './proxy.ts';
/** Stable Cordis plugin name (the Loader entry and package name). */
export declare const name = "dsh-lan-proxy";
/** Services required before load: the web server, whose bound port is the default upstream. */
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
    /** Login / Basic Auth username; empty together with `password` disables auth. */
    username: string;
    /** Login / Basic Auth password; empty together with `username` disables auth. */
    password: string;
    /** Session cookie lifetime in hours. */
    sessionTtlHours: number;
}
/** Configuration schema; deployment-varying bounds stay tunable from cordis.yml. */
export declare const Config: z<Schemastery.ObjectS<{
    listenHost: z<string, string>;
    listenPort: z<number, number>;
    upstreamHost: z<string, string>;
    upstreamPort: z<number, number>;
    username: z<string, string>;
    password: z<string, string>;
    sessionTtlHours: z<number, number>;
}>, Schemastery.ObjectT<{
    listenHost: z<string, string>;
    listenPort: z<number, number>;
    upstreamHost: z<string, string>;
    upstreamPort: z<number, number>;
    username: z<string, string>;
    password: z<string, string>;
    sessionTtlHours: z<number, number>;
}>>;
/**
 * Start the proxy as an effect on this plugin's fiber: unloading the plugin
 * closes the listener and every upgraded socket.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
