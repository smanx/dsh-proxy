import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots';
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
/** Injected business face: the generic Connection RPC caller. */
export interface SettingsSectionInjected {
    rpc: ClientConnectionRpc;
}
/** Full section props: runtime share + injected face + the locale seat. */
export type SettingsSectionProps = PropsRuntime<'settings.section'> & InjectFace<SettingsSectionInjected> & PropsLocale<'dsh-proxy'>;
/**
 * Render the section.
 * @param props - runtime share, the injected rpc caller, and `t`.
 */
export declare function SettingsSection({ rpc, t }: SettingsSectionProps): import("react").JSX.Element;
