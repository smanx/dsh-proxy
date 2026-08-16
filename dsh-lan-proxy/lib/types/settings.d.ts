import type { LanProxyUpdatePayload } from './contract.ts';
/** The on-disk shape (a subset of the update payload; no derived fields). */
export interface PersistedRuntimeSettings {
    upstreamPort?: number;
    username?: string;
    password?: string;
}
/** Tolerant read of an unknown JSON value into the persisted shape. */
export declare function normalizeRuntimeSettings(raw: unknown): PersistedRuntimeSettings;
/**
 * Read/write access to the persisted settings file. Writes are atomic
 * (temp file + rename) so a crash never leaves a truncated JSON behind.
 */
export declare class RuntimeSettingsFile {
    private readonly filePath;
    constructor(filePath: string);
    read(): PersistedRuntimeSettings;
    write(settings: PersistedRuntimeSettings): void;
}
export type UpdateValidation = {
    ok: true;
    patch: Required<Pick<LanProxyUpdatePayload, 'upstreamPort' | 'username' | 'password'>> & LanProxyUpdatePayload;
} | {
    ok: false;
    message: string;
};
/**
 * Validate an update payload from the settings page.
 * @param payload - the raw RPC payload.
 * @param listenPort - the proxy's listen port (upstream must differ from it).
 * @returns the normalized patch, or a user-facing rejection message.
 */
export declare function validateUpdate(payload: unknown, listenPort: number): UpdateValidation;
