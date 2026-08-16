/**
 * `crypto.randomUUID` polyfill for the proxied DSH frontend, plus the pure
 * injection helper.
 *
 * The DSH client uses `crypto.randomUUID()` for RPC ids, but that API exists
 * only in secure contexts (https or localhost). A LAN page served over plain
 * http://<lan-ip>:port is a non-secure context, so randomUUID is undefined
 * and every RPC fails. `crypto.getRandomValues` IS available in non-secure
 * contexts, so the polyfill re-implements UUIDv4 on top of it.
 */
export const RANDOM_UUID_POLYFILL =
  '<script>(function(){try{if(typeof crypto!=="undefined"&&crypto&&typeof crypto.randomUUID!=="function"){crypto.randomUUID=function(){var b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h="";for(var i=0;i<16;i++){h+=b[i].toString(16).padStart(2,"0")}return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}}}catch(e){}})();</script>'

/**
 * Insert the polyfill right after the opening `<head ...>` tag so it executes
 * before any module script; prepend when the document has no head.
 * @param html - the served index.html body.
 * @param polyfill - script to inject (defaults to the randomUUID shim).
 * @returns the modified body.
 */
export function injectPolyfill(html: string, polyfill: string = RANDOM_UUID_POLYFILL): string {
  const head = html.toLowerCase().indexOf('<head')
  if (head !== -1) {
    const end = html.indexOf('>', head)
    if (end !== -1) return html.slice(0, end + 1) + polyfill + html.slice(end + 1)
    return polyfill + html
  }
  return polyfill + html
}
