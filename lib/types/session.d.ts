/** Credential pair enforced by the proxy (an empty pair = password login off). */
export interface AuthConfig {
    username: string;
    password: string;
}
/** Constant-time string comparison (length mismatch short-circuits). */
export declare function safeEqual(a: string, b: string): boolean;
/** Verify an HTTP Basic Authorization header against the configured pair. */
export declare function checkBasicAuth(authorization: string | undefined, username: string, password: string): boolean;
/** The proxy's gate: Basic Auth only, active when both credentials are set. */
export declare class Authenticator {
    readonly config: AuthConfig;
    constructor(config: AuthConfig);
    /** Password login is active only when both username and password are set. */
    get enabled(): boolean;
    isAuthenticated(authorization: string | undefined): boolean;
}
