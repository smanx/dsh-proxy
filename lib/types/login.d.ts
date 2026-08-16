/**
 * The self-contained login page served by the proxy (no external assets), and
 * a tolerant urlencoded form parser. The page is deliberately dependency-free
 * so it works even when the upstream DSH app is down.
 */
/** Render the login page. `error` shows the failed-login banner. */
export declare function loginPage(error: boolean, sessionTtlHours: number): string;
/**
 * Parse an application/x-www-form-urlencoded body. Malformed percent
 * sequences decode to the empty string instead of throwing.
 */
export declare function parseUrlencoded(body: string): Record<string, string>;
