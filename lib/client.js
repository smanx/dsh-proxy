window.__ModuleLoader__.load({ id: 'dsh-lan-proxy', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/SettingsSection.tsx
var import_react = require("react");

// src/contract.ts
var RPC_CHANNEL = "/dsh-lan-proxy";
var RPC_STATUS_ENDPOINT = "status";
var RPC_UPDATE_ENDPOINT = "update";

// src/client/SettingsSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function StatusRow(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_rowLabel", children: props.label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_rowValue", children: props.value })
  ] });
}
function SettingsSection({ rpc, t }) {
  const [status, setStatus] = (0, import_react.useState)(null);
  const [unreachable, setUnreachable] = (0, import_react.useState)(false);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [message, setMessage] = (0, import_react.useState)(null);
  const [upstreamPort, setUpstreamPort] = (0, import_react.useState)("");
  const [username, setUsername] = (0, import_react.useState)("");
  const [password, setPassword] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    void rpc.call(RPC_CHANNEL, RPC_STATUS_ENDPOINT, void 0).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setStatus(result.value);
      } else {
        setUnreachable(true);
      }
    }).catch(() => {
      if (!cancelled) setUnreachable(true);
    });
    return () => {
      cancelled = true;
    };
  }, [rpc]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {};
      if (upstreamPort.trim() !== "") {
        const port = Number(upstreamPort.trim());
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          setError(t("form.invalidPort"));
          return;
        }
        if (status !== null && port === status.listenPort) {
          setError(t("form.portConflict"));
          return;
        }
        payload.upstreamPort = port;
      }
      if (username.trim() !== "") payload.username = username.trim();
      if (password !== "") payload.password = password;
      if (payload.upstreamPort === void 0 && payload.username === void 0 && payload.password === void 0) {
        setError(t("form.nothingToSave"));
        return;
      }
      const result = await rpc.call(RPC_CHANNEL, RPC_UPDATE_ENDPOINT, payload);
      if (result.ok) {
        const value = result.value;
        setStatus(value.status);
        setMessage(value.message);
        setUpstreamPort("");
        setUsername("");
        setPassword("");
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(`${t("form.failed")}\uFF1A${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };
  const authBadge = status === null || status.authEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_badge dsh_lanproxy_badgeOn", children: t("status.authOn") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_badge dsh_lanproxy_badgeOff", children: t("status.authOff") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh_lanproxy_section", "aria-labelledby": "dsh-lanproxy-settings-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { id: "dsh-lanproxy-settings-title", className: "dsh_lanproxy_title", children: t("nav") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_subtitle", children: t("form.subtitle") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_lanproxy_cardTitle", children: t("status.title") }),
      unreachable || status === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_error", children: t("status.unreachable") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, { label: t("status.listenHost"), value: status.listenHost }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, { label: t("status.listenPort"), value: String(status.listenPort) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, { label: t("status.upstream"), value: `${status.upstreamHost}:${status.upstreamPort}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, { label: t("status.auth"), value: authBadge }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, { label: t("status.sessionTtl"), value: `${status.sessionTtlHours} ${t("hours")}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_hint", children: status.persisted ? t("status.persistedOn") : t("status.persistedOff") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "dsh_lanproxy_card dsh_lanproxy_form", onSubmit: (event) => {
      void submit(event);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_lanproxy_cardTitle", children: t("form.title") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh_lanproxy_fieldLabel", htmlFor: "dsh-lanproxy-upstream-port", children: t("form.upstreamPort") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: "dsh-lanproxy-upstream-port",
            className: "dsh_lanproxy_input",
            type: "number",
            min: 1,
            max: 65535,
            inputMode: "numeric",
            placeholder: t("form.upstreamPortHint"),
            value: upstreamPort,
            onChange: (event) => {
              setUpstreamPort(event.target.value);
            }
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh_lanproxy_fieldLabel", htmlFor: "dsh-lanproxy-username", children: t("form.username") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: "dsh-lanproxy-username",
            className: "dsh_lanproxy_input",
            type: "text",
            autoComplete: "username",
            placeholder: t("form.usernameHint"),
            value: username,
            onChange: (event) => {
              setUsername(event.target.value);
            }
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh_lanproxy_fieldLabel", htmlFor: "dsh-lanproxy-password", children: t("form.password") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: "dsh-lanproxy-password",
            className: "dsh_lanproxy_input",
            type: "password",
            autoComplete: "new-password",
            placeholder: t("form.passwordHint"),
            value: password,
            onChange: (event) => {
              setPassword(event.target.value);
            }
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "dsh_lanproxy_button", disabled: saving, children: saving ? t("form.saving") : t("form.save") }),
        message !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_message", children: message }) : null,
        error !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_error", children: error }) : null
      ] })
    ] })
  ] });
}

// src/client/locales.ts
var NS = "dsh-lan-proxy";
var zh = {
  "nav": "\u5C40\u57DF\u7F51\u4EE3\u7406",
  "status.title": "\u8FD0\u884C\u72B6\u6001",
  "status.listenHost": "\u76D1\u542C\u5730\u5740",
  "status.listenPort": "\u5F53\u524D\u76D1\u542C\u7AEF\u53E3",
  "status.upstream": "\u8F6C\u53D1\u76EE\u6807",
  "status.auth": "\u8BBF\u95EE\u8BA4\u8BC1",
  "status.authOn": "\u5DF2\u542F\u7528",
  "status.authOff": "\u5DF2\u5173\u95ED\uFF08\u5C40\u57DF\u7F51\u5F00\u653E\u8BBF\u95EE\uFF09",
  "status.sessionTtl": "\u4F1A\u8BDD\u6709\u6548\u671F",
  "status.persistedOn": "\u5B58\u5728\u5DF2\u4FDD\u5B58\u7684\u8FD0\u884C\u914D\u7F6E\uFF08\u4F18\u5148\u4E8E cordis \u914D\u7F6E\uFF09",
  "status.persistedOff": "\u4F7F\u7528 cordis \u914D\u7F6E",
  "status.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "status.unreachable": "\u65E0\u6CD5\u8FDE\u63A5\u4EE3\u7406\u670D\u52A1\uFF0C\u8BF7\u786E\u8BA4\u63D2\u4EF6\u5DF2\u542F\u7528\u5E76\u91CD\u542F\u8FC7 dsh web\u3002",
  "form.title": "\u4FEE\u6539\u8BBE\u7F6E",
  "form.subtitle": "\u4FDD\u5B58\u540E\u4F1A\u91CD\u542F\u8F6C\u53D1\u670D\u52A1\uFF1B\u91CD\u542F\u540E\u6240\u6709\u5DF2\u767B\u5F55\u4F1A\u8BDD\u5C06\u5931\u6548\uFF0C\u9700\u91CD\u65B0\u767B\u5F55\u3002",
  "form.upstreamPort": "\u8F6C\u53D1\u76EE\u6807\u7AEF\u53E3\uFF08DSH \u670D\u52A1\u7AEF\u53E3\uFF09",
  "form.upstreamPortHint": "\u7559\u7A7A\u4FDD\u6301\u4E0D\u53D8",
  "form.username": "\u7528\u6237\u540D",
  "form.usernameHint": "\u7559\u7A7A\u4FDD\u6301\u4E0D\u53D8",
  "form.password": "\u5BC6\u7801",
  "form.passwordHint": "\u7559\u7A7A\u4FDD\u6301\u4E0D\u53D8\uFF1B\u7528\u6237\u540D\u4E0E\u5BC6\u7801\u540C\u65F6\u4E3A\u7A7A\u5C06\u5173\u95ED\u8BA4\u8BC1",
  "form.save": "\u4FDD\u5B58\u5E76\u91CD\u542F",
  "form.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "form.invalidPort": "\u7AEF\u53E3\u5FC5\u987B\u662F 1\u201365535 \u7684\u6574\u6570",
  "form.portConflict": "\u8F6C\u53D1\u76EE\u6807\u7AEF\u53E3\u4E0D\u80FD\u4E0E\u76D1\u542C\u7AEF\u53E3\u76F8\u540C",
  "form.nothingToSave": "\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u4FEE\u6539",
  "form.updated": "\u5DF2\u4FDD\u5B58\u5E76\u91CD\u542F\u8F6C\u53D1\u670D\u52A1",
  "form.failed": "\u4FDD\u5B58\u5931\u8D25",
  "hours": "\u5C0F\u65F6"
};
var en = {
  "nav": "LAN Proxy",
  "status.title": "Status",
  "status.listenHost": "Listen address",
  "status.listenPort": "Running port",
  "status.upstream": "Forward target",
  "status.auth": "Access auth",
  "status.authOn": "Enabled",
  "status.authOff": "Disabled (open LAN access)",
  "status.sessionTtl": "Session lifetime",
  "status.persistedOn": "A saved runtime config overrides the cordis config",
  "status.persistedOff": "Using the cordis config",
  "status.loading": "Loading\u2026",
  "status.unreachable": "Cannot reach the proxy service \u2014 make sure the plugin is enabled and dsh web was restarted.",
  "form.title": "Edit settings",
  "form.subtitle": "Saving restarts the forwarding service; all active sessions are invalidated and users must log in again.",
  "form.upstreamPort": "Forward target port (DSH service port)",
  "form.upstreamPortHint": "Leave empty to keep current",
  "form.username": "Username",
  "form.usernameHint": "Leave empty to keep current",
  "form.password": "Password",
  "form.passwordHint": "Leave empty to keep current; an empty pair disables auth",
  "form.save": "Save & restart",
  "form.saving": "Saving\u2026",
  "form.invalidPort": "Port must be an integer between 1 and 65535",
  "form.portConflict": "Forward target port must differ from the listen port",
  "form.nothingToSave": "Nothing to save",
  "form.updated": "Saved and the forwarding service restarted",
  "form.failed": "Save failed",
  "hours": "h"
};

// src/client/styles.ts
var STYLE_ID = "dsh-lanproxy-style";
var cssText = `
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
  color: var(--dsw-alias-label-primary);
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
}
.dsh_lanproxy_subtitle {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsh_lanproxy_cardTitle {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}
.dsh_lanproxy_cardDesc {
  margin: -4px 0 0;
  color: var(--dsw-alias-label-tertiary);
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
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_rowValue {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dsh_lanproxy_badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
}
.dsh_lanproxy_badgeOn {
  color: var(--dsw-alias-fg-positive);
  background: var(--dsw-alias-bg-positive);
}
.dsh_lanproxy_badgeOff {
  color: var(--dsw-alias-fg-danger);
  background: var(--dsw-alias-bg-danger);
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
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_fieldHint {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_lanproxy_input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-0);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_input:focus {
  outline: none;
  border-color: var(--dsw-alias-accent);
}
.dsh_lanproxy_actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}
.dsh_lanproxy_button {
  padding: 7px 14px;
  border: 0;
  border-radius: 8px;
  background: var(--dsw-alias-accent);
  color: var(--dsw-alias-fg-on-accent);
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}
.dsh_lanproxy_button:disabled {
  opacity: 0.55;
  cursor: default;
}
.dsh_lanproxy_message {
  margin: 0;
  color: var(--dsw-alias-fg-positive);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_error {
  margin: 0;
  color: var(--dsw-alias-fg-danger);
  font-size: 13px;
  line-height: 20px;
}
.dsh_lanproxy_hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
`;
function adoptStyles() {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = cssText;
  document.head.appendChild(style);
}

// src/client/index.ts
var inject = ["slots", "locale", "connection"];
function apply(ctx) {
  adoptStyles();
  console.info("[dsh-lan-proxy] bundle loaded");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-lan-proxy: dictionaries");
  const t = ctx.locale.bind(NS);
  const connection = ctx.get("connection");
  const rpc = connection.rpc;
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-lan-proxy",
    order: 70,
    label: () => t("nav"),
    locale: NS,
    inject: () => ({ rpc })
  }, SettingsSection));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
