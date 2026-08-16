/** Name of the session cookie the login flow sets. */
export declare const SESSION_COOKIE = "dsh_lan_session";
export interface SessionConfig {
    /** Basic Auth / login-page username; empty disables the gate together with `password`. */
    username: string;
    /** Basic Auth / login-page password; empty disables the gate together with `username`. */
    password: string;
    /** Session cookie lifetime in seconds. */
    sessionTtlSeconds: number;
}
/** Constant-time string comparison (length mismatch short-circuits). */
export declare function safeEqual(a: string, b: string): boolean;
export type SessionVerification = {
    ok: true;
    username: string;
} | {
    ok: false;
    reason: 'malformed' | 'expired' | 'tampered';
};
/**
 * Issues and verifies session tokens of the form
 * `<base64url(exp.uname)>.<base64url(hmac)>`. The secret is generated per
 * process, so a server restart invalidates every outstanding session (users
 * simply log in again) — deliberate: the proxy holds the whole DSH surface,
 * and rotation on restart keeps leaked cookies short-lived.
 */
export declare class SessionStore {
    private readonly config;
    readonly secret: NonSharedBuffer;
    constructor(config: SessionConfig);
    issue(username: string, now?: number): string;
    verify(token: string, now?: number): SessionVerification;
}
/** Extract the session cookie value from a raw Cookie header, or null. */
export declare function readSessionCookie(cookieHeader: string | undefined): string | null;
/** Verify an HTTP Basic Authorization header against the configured pair. */
export declare function checkBasicAuth(authorization: string | undefined, username: string, password: string): boolean;
/**
 * Combined gate: session cookie OR Basic Auth. When both configured
 * credentials are empty the gate is disabled entirely (open LAN access).
 */
export declare class Authenticator {
    readonly config: SessionConfig;
    readonly sessions: SessionStore;
    constructor(config: SessionConfig);
    get enabled(): boolean;
    isAuthenticated(cookieHeader: string | undefined, authorization: string | undefined): boolean;
}
