/**
 * dsh-lan-proxy client plugin: the browser half of the LAN-proxy settings
 * page. Registers the `settings.section` entry ("局域网代理") that shows the
 * running proxy status and edits the forward target port / username /
 * password through the host `/dsh-lan-proxy` Connection RPC channel.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: slots (section registry), locale, and the wire connection. */
export declare const inject: string[];
/**
 * Compose the settings section.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
