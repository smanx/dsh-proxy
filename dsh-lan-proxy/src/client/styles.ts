/**
 * The settings-section stylesheet, hand-written as a template string and
 * injected once by the plugin body: the web server serves exactly one file per
 * client plugin, so no separate CSS artifact may exist. Colors come from the
 * shared `--dsw-alias-*` design platform, but every reference carries a literal
 * fallback (the same pattern the harness itself uses) so the section stays
 * legible even where a token is not defined in the current theme context.
 * Class names carry the `dsh_lanproxy` prefix to stay unique in the shell.
 */

/** Stable `<style>` element id (idempotent injection across HMR re-runs). */
export const STYLE_ID = 'dsh-lanproxy-style'

/** The settings section's injected stylesheet text. */
export const cssText = `
.dsh_lanproxy_section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.dsh_lanproxy_heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dsh_lanproxy_title {
  margin: 0;
  color: var(--dsw-alias-label-primary, #e6edf3);
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}
.dsh_lanproxy_subtitle {
  margin: 0;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l2, #30363d);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, #161b22);
}
.dsh_lanproxy_cardTitle {
  color: var(--dsw-alias-label-primary, #e6edf3);
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}
.dsh_lanproxy_cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}
.dsh_lanproxy_controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh_lanproxy_cardDesc {
  margin: -4px 0 0;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  font-size: 12px;
  line-height: 18px;
}
.dsh_lanproxy_row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}
.dsh_lanproxy_rowLabel {
  color: var(--dsw-alias-label-secondary, #c9d1d9);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_rowValue {
  color: var(--dsw-alias-label-primary, #e6edf3);
  font-size: 13px;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dsh_lanproxy_portStatus {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dsh_lanproxy_dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.dsh_lanproxy_dotOn {
  background: var(--dsw-alias-state-success-primary, #3fb950);
  box-shadow: 0 0 0 3px var(--dsw-alias-state-success-secondary, rgba(35, 134, 54, 0.25));
}
.dsh_lanproxy_dotOff {
  background: var(--dsw-alias-state-error-primary, #f85149);
  box-shadow: 0 0 0 3px var(--dsw-alias-state-error-secondary, rgba(248, 81, 73, 0.15));
}
.dsh_lanproxy_portValue {
  color: var(--dsw-alias-label-primary, #e6edf3);
  font-variant-numeric: tabular-nums;
}
.dsh_lanproxy_statusText {
  font-size: 12px;
  line-height: 18px;
}
.dsh_lanproxy_statusTextOn {
  color: var(--dsw-alias-state-success-primary, #3fb950);
}
.dsh_lanproxy_statusTextOff {
  color: var(--dsw-alias-state-error-primary, #f85149);
}
.dsh_lanproxy_badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
}
.dsh_lanproxy_badgeOn {
  color: var(--dsw-alias-state-success-primary, #3fb950);
  background: var(--dsw-alias-state-success-secondary, rgba(35, 134, 54, 0.25));
}
.dsh_lanproxy_badgeOff {
  color: var(--dsw-alias-state-error-primary, #f85149);
  background: var(--dsw-alias-state-error-secondary, rgba(248, 81, 73, 0.15));
}
.dsh_lanproxy_form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.dsh_lanproxy_field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.dsh_lanproxy_fieldLabel {
  color: var(--dsw-alias-label-secondary, #c9d1d9);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_fieldHint {
  color: var(--dsw-alias-label-tertiary, #8b949e);
  font-size: 12px;
  line-height: 18px;
}
.dsh_lanproxy_input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l2, #30363d);
  border-radius: 8px;
  /* bg-layer-0 does not exist in the design platform; bg-layer-2 is the
     token the harness itself uses for inputs and raised surfaces. */
  background: var(--dsw-alias-bg-layer-2, #21262d);
  color: var(--dsw-alias-label-primary, #e6edf3);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_input:focus {
  outline: none;
  border-color: var(--dsw-alias-accent, #2f81f7);
}
.dsh_lanproxy_passwordWrap {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}
.dsh_lanproxy_passwordInput {
  padding-right: 36px;
}
.dsh_lanproxy_eye {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  cursor: pointer;
}
.dsh_lanproxy_eye:hover {
  color: var(--dsw-alias-label-primary, #e6edf3);
  background: var(--dsw-alias-bg-layer-2, #21262d);
}
.dsh_lanproxy_eye svg {
  width: 16px;
  height: 16px;
}
.dsh_lanproxy_statusError {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}
.dsh_lanproxy_actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}
/* Primary button (启动 / 应用): filled accent with a visible border. */
.dsh_lanproxy_button {
  padding: 7px 14px;
  border: 1px solid var(--dsw-alias-accent, #2f81f7);
  border-radius: 8px;
  background: var(--dsw-alias-accent, #2f81f7);
  color: var(--dsw-alias-fg-on-accent, #ffffff);
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.dsh_lanproxy_button:hover:not(:disabled) {
  background: var(--dsw-alias-accent-hover, #388bfd);
  border-color: var(--dsw-alias-accent-hover, #388bfd);
}
.dsh_lanproxy_button:active:not(:disabled) {
  background: var(--dsw-alias-accent-active, #1f6feb);
  border-color: var(--dsw-alias-accent-active, #1f6feb);
}
.dsh_lanproxy_button:disabled {
  opacity: 0.5;
  cursor: default;
  border-color: var(--dsw-alias-border-l2, #30363d);
  background: var(--dsw-alias-bg-layer-2, #21262d);
  color: var(--dsw-alias-label-tertiary, #8b949e);
}
/* Secondary button (停止): outline style with its own border. */
.dsh_lanproxy_buttonStop {
  background: var(--dsw-alias-bg-layer-1, #161b22);
  border: 1px solid var(--dsw-alias-border-l2, #30363d);
  color: var(--dsw-alias-label-primary, #e6edf3);
}
.dsh_lanproxy_buttonStop:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2, #21262d);
  border-color: var(--dsw-alias-label-tertiary, #8b949e);
}
.dsh_lanproxy_buttonStop:active:not(:disabled) {
  background: var(--dsw-alias-bg-layer-0, #0d1117);
}
.dsh_lanproxy_buttonStop:disabled {
  opacity: 0.5;
  cursor: default;
}
.dsh_lanproxy_message {
  margin: 0;
  color: var(--dsw-alias-state-success-primary, #3fb950);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_error {
  margin: 0;
  color: var(--dsw-alias-state-error-primary, #f85149);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary, #8b949e);
  font-size: 12px;
  line-height: 18px;
}
`

/** Inject the stylesheet once (idempotent). */
export function adoptStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
}
