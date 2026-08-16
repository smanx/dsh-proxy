window.__ModuleLoader__.load({ id: 'dsh-proxy', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
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
var RPC_CHANNEL = "/dsh-proxy";
var RPC_STATUS_ENDPOINT = "status";
var RPC_UPDATE_ENDPOINT = "update";
var RPC_START_ENDPOINT = "start";
var RPC_STOP_ENDPOINT = "stop";

// src/client/SettingsSection.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function StatusRow(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_rowLabel", children: props.label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_rowValue", children: props.value })
  ] });
}
function PortStatus(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh_lanproxy_portStatus", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: props.ok ? "dsh_lanproxy_dot dsh_lanproxy_dotOn" : "dsh_lanproxy_dot dsh_lanproxy_dotOff" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_portValue", children: props.port }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: props.ok ? "dsh_lanproxy_statusText dsh_lanproxy_statusTextOn" : "dsh_lanproxy_statusText dsh_lanproxy_statusTextOff", children: props.ok ? props.okText : props.failText })
  ] });
}
function EyeIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "3" })
  ] });
}
function EyeOffIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "2", x2: "22", y1: "2", y2: "22" })
  ] });
}
function SettingsSection({ rpc, t }) {
  const [phase, setPhase] = (0, import_react.useState)("loading");
  const phaseRef = (0, import_react.useRef)("loading");
  const [status, setStatus] = (0, import_react.useState)(null);
  const [statusError, setStatusError] = (0, import_react.useState)(null);
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [controlling, setControlling] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [message, setMessage] = (0, import_react.useState)(null);
  const [controlError, setControlError] = (0, import_react.useState)(null);
  const [controlMessage, setControlMessage] = (0, import_react.useState)(null);
  const [showPassword, setShowPassword] = (0, import_react.useState)(false);
  const [listenPort, setListenPort] = (0, import_react.useState)("");
  const [username, setUsername] = (0, import_react.useState)("");
  const [password, setPassword] = (0, import_react.useState)("");
  const formSeededRef = (0, import_react.useRef)(false);
  const applyPhase = (0, import_react.useCallback)((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const applyStatusToForm = (0, import_react.useCallback)((next) => {
    setListenPort(String(next.listenPort));
    setUsername(next.username);
    setPassword(next.password ?? "");
  }, []);
  const loadStatus = (0, import_react.useCallback)(async () => {
    applyPhase("loading");
    setStatusError(null);
    try {
      const result = await rpc.call(RPC_CHANNEL, RPC_STATUS_ENDPOINT, {});
      if (result.ok) {
        const next = result.value;
        setStatus(next);
        applyPhase("ok");
        if (!formSeededRef.current) {
          applyStatusToForm(next);
          formSeededRef.current = true;
        }
      } else {
        setStatusError(result.error.message);
        applyPhase("error");
      }
    } catch (err) {
      console.error("[dsh-proxy] status RPC failed:", err);
      setStatusError(err instanceof Error ? err.message : String(err));
      applyPhase("error");
    }
  }, [rpc, applyPhase, applyStatusToForm]);
  (0, import_react.useEffect)(() => {
    void loadStatus();
    const timer = window.setTimeout(() => {
      if (phaseRef.current === "error") void loadStatus();
    }, 2e3);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);
  const runControl = (0, import_react.useCallback)(async (action) => {
    setControlling(true);
    setControlError(null);
    setControlMessage(null);
    try {
      const result = await rpc.call(
        RPC_CHANNEL,
        action === "start" ? RPC_START_ENDPOINT : RPC_STOP_ENDPOINT,
        {}
      );
      if (result.ok) {
        setStatus(result.value);
        setControlMessage(action === "start" ? t("control.started") : t("control.stopped"));
      } else {
        setControlError(result.error.message);
      }
    } catch (err) {
      console.error(`[dsh-proxy] ${action} RPC failed:`, err);
      setControlError(`${t("control.failed")}\uFF1A${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setControlling(false);
    }
  }, [rpc, t]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const port = Number(listenPort.trim());
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        setError(t("form.invalidPort"));
        return;
      }
      if (status !== null && port === status.upstreamPort) {
        setError(t("form.portConflict"));
        return;
      }
      const payload = {
        listenPort: port,
        username: username.trim(),
        password
      };
      const result = await rpc.call(RPC_CHANNEL, RPC_UPDATE_ENDPOINT, payload);
      if (result.ok) {
        const value = result.value;
        setStatus(value.status);
        applyPhase("ok");
        setMessage(t(value.notice === "credentials-partial" ? "form.updatedPartial" : "form.updated"));
        applyStatusToForm(value.status);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      console.error("[dsh-proxy] update RPC failed:", err);
      setError(`${t("form.failed")}\uFF1A${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };
  const authBadge = status === null || status.authEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_badge dsh_lanproxy_badgeOn", children: t("status.authOn") }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh_lanproxy_badge dsh_lanproxy_badgeOff", children: t("status.authOff") });
  const statusCard = phase === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_hint", children: t("status.loading") }) : phase === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_statusError", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_error", children: t("status.unreachable") }),
    statusError !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_hint", children: statusError }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsh_lanproxy_button", onClick: () => {
      void loadStatus();
    }, children: t("status.retry") })
  ] }) : status !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      StatusRow,
      {
        label: t("status.proxyPort"),
        value: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortStatus, { port: `${status.listenHost}:${status.listenPort}`, ok: status.proxyListening, okText: t("status.proxyRunning"), failText: t("status.proxyStopped") })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      StatusRow,
      {
        label: t("status.targetPort"),
        value: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortStatus, { port: `${status.upstreamHost}:${status.upstreamPort}`, ok: status.upstreamReachable, okText: t("status.targetReachable"), failText: t("status.targetUnreachable") })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, { label: t("status.username"), value: status.username }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, { label: t("status.auth"), value: authBadge }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_hint", children: status.persisted ? t("status.persistedOn") : t("status.persistedOff") })
  ] }) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh_lanproxy_section", "aria-labelledby": "dsh-lanproxy-settings-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { id: "dsh-lanproxy-settings-title", className: "dsh_lanproxy_title", children: t("nav") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_subtitle", children: t("form.subtitle") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_cardHeader", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_lanproxy_cardTitle", children: t("status.title") }),
        phase === "ok" && status !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_controls", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dsh_lanproxy_button",
              disabled: controlling || status.proxyListening,
              onClick: () => {
                void runControl("start");
              },
              children: t("control.start")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dsh_lanproxy_button dsh_lanproxy_buttonStop",
              disabled: controlling || !status.proxyListening,
              onClick: () => {
                void runControl("stop");
              },
              children: t("control.stop")
            }
          )
        ] }) : null
      ] }),
      statusCard,
      controlMessage !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_message", children: controlMessage }) : null,
      controlError !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh_lanproxy_error", children: controlError }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "dsh_lanproxy_card dsh_lanproxy_form", onSubmit: (event) => {
      void submit(event);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh_lanproxy_cardTitle", children: t("form.title") }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh_lanproxy_fieldLabel", htmlFor: "dsh-lanproxy-listen-port", children: t("form.listenPort") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: "dsh-lanproxy-listen-port",
            className: "dsh_lanproxy_input",
            type: "number",
            min: 1,
            max: 65535,
            inputMode: "numeric",
            placeholder: t("form.listenPortHint"),
            value: listenPort,
            onChange: (event) => {
              setListenPort(event.target.value);
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh_lanproxy_passwordWrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              id: "dsh-lanproxy-password",
              className: "dsh_lanproxy_input dsh_lanproxy_passwordInput",
              type: showPassword ? "text" : "password",
              autoComplete: "new-password",
              placeholder: t("form.passwordHint"),
              value: password,
              onChange: (event) => {
                setPassword(event.target.value);
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dsh_lanproxy_eye",
              "aria-label": showPassword ? t("form.hidePassword") : t("form.showPassword"),
              title: showPassword ? t("form.hidePassword") : t("form.showPassword"),
              onClick: () => {
                setShowPassword((visible) => !visible);
              },
              children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOffIcon, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeIcon, {})
            }
          )
        ] })
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
var NS = "dsh-proxy";
var zh = {
  "nav": "\u5C40\u57DF\u7F51\u4EE3\u7406",
  "status.title": "\u8FD0\u884C\u72B6\u6001",
  "status.proxyPort": "\u4EE3\u7406\u670D\u52A1\u7AEF\u53E3",
  "status.proxyRunning": "\u8FD0\u884C\u4E2D",
  "status.proxyStopped": "\u672A\u8FD0\u884C",
  "status.targetPort": "\u9ED8\u8BA4\u670D\u52A1\u7AEF\u53E3",
  "status.targetReachable": "\u53EF\u8BBF\u95EE",
  "status.targetUnreachable": "\u4E0D\u53EF\u8BBF\u95EE",
  "status.username": "\u5F53\u524D\u7528\u6237\u540D",
  "status.auth": "\u5BC6\u7801\u767B\u5F55",
  "status.authOn": "\u5DF2\u542F\u7528",
  "status.authOff": "\u672A\u542F\u7528\uFF08\u5C40\u57DF\u7F51\u5F00\u653E\u8BBF\u95EE\uFF09",
  "status.persistedOn": "\u5B58\u5728\u5DF2\u4FDD\u5B58\u7684\u8FD0\u884C\u914D\u7F6E\uFF08\u4F18\u5148\u4E8E cordis \u914D\u7F6E\uFF09",
  "status.persistedOff": "\u4F7F\u7528 cordis \u914D\u7F6E",
  "status.loading": "\u52A0\u8F7D\u4E2D\u2026",
  "status.unreachable": "\u65E0\u6CD5\u8FDE\u63A5\u4EE3\u7406\u670D\u52A1\uFF0C\u8BF7\u786E\u8BA4\u63D2\u4EF6\u5DF2\u542F\u7528\u5E76\u91CD\u542F\u8FC7 dsh web\u3002",
  "status.retry": "\u91CD\u8BD5",
  "control.start": "\u542F\u52A8",
  "control.stop": "\u505C\u6B62",
  "control.started": "\u4EE3\u7406\u670D\u52A1\u5DF2\u542F\u52A8",
  "control.stopped": "\u4EE3\u7406\u670D\u52A1\u5DF2\u505C\u6B62",
  "control.failed": "\u64CD\u4F5C\u5931\u8D25",
  "form.title": "\u4FEE\u6539\u8BBE\u7F6E",
  "form.subtitle": "\u542F\u7528\u5BC6\u7801\u767B\u5F55\u540E\uFF0C\u6D4F\u89C8\u5668\u4F1A\u5F39\u51FA\u539F\u751F Basic Auth \u767B\u5F55\u6846\uFF1B\u4FDD\u5B58\u4FEE\u6539\u4F1A\u91CD\u542F\u8F6C\u53D1\u670D\u52A1\u3002",
  "form.listenPort": "\u4EE3\u7406\u670D\u52A1\u7AEF\u53E3\uFF08\u76D1\u542C\u7AEF\u53E3\uFF09",
  "form.listenPortHint": "1\u201365535",
  "form.username": "\u7528\u6237\u540D",
  "form.usernameHint": "\u6E05\u7A7A\u5373\u8BBE\u4E3A\u7A7A",
  "form.password": "\u5BC6\u7801",
  "form.passwordHint": "\u6E05\u7A7A\u5373\u8BBE\u4E3A\u7A7A\uFF1B\u7528\u6237\u540D\u4E0E\u5BC6\u7801\u9700\u540C\u65F6\u975E\u7A7A\u624D\u4F1A\u542F\u7528\u5BC6\u7801\u767B\u5F55",
  "form.showPassword": "\u663E\u793A\u5BC6\u7801",
  "form.hidePassword": "\u9690\u85CF\u5BC6\u7801",
  "form.save": "\u5E94\u7528",
  "form.saving": "\u5E94\u7528\u4E2D\u2026",
  "form.invalidPort": "\u7AEF\u53E3\u5FC5\u987B\u662F 1\u201365535 \u7684\u6574\u6570",
  "form.portConflict": "\u4EE3\u7406\u670D\u52A1\u7AEF\u53E3\u4E0D\u80FD\u4E0E\u9ED8\u8BA4\u670D\u52A1\u7AEF\u53E3\u76F8\u540C",
  "form.updated": "\u5DF2\u4FDD\u5B58\u5E76\u91CD\u542F\u8F6C\u53D1\u670D\u52A1",
  "form.updatedPartial": "\u5DF2\u4FDD\u5B58\u5E76\u91CD\u542F\u8F6C\u53D1\u670D\u52A1\uFF08\u6CE8\u610F\uFF1A\u9700\u540C\u65F6\u8BBE\u7F6E\u7528\u6237\u540D\u548C\u5BC6\u7801\u624D\u4F1A\u542F\u7528\u5BC6\u7801\u767B\u5F55\uFF09",
  "form.failed": "\u4FDD\u5B58\u5931\u8D25"
};
var en = {
  "nav": "LAN Proxy",
  "status.title": "Status",
  "status.proxyPort": "Proxy port",
  "status.proxyRunning": "Running",
  "status.proxyStopped": "Not running",
  "status.targetPort": "Default service port",
  "status.targetReachable": "Reachable",
  "status.targetUnreachable": "Unreachable",
  "status.username": "Username",
  "status.auth": "Password login",
  "status.authOn": "Enabled",
  "status.authOff": "Not enabled (open access)",
  "status.persistedOn": "A saved runtime config overrides the cordis config",
  "status.persistedOff": "Using the cordis config",
  "status.loading": "Loading\u2026",
  "status.unreachable": "Cannot reach the proxy service \u2014 make sure the plugin is enabled and dsh web was restarted.",
  "status.retry": "Retry",
  "control.start": "Start",
  "control.stop": "Stop",
  "control.started": "Proxy service started",
  "control.stopped": "Proxy service stopped",
  "control.failed": "Action failed",
  "form.title": "Edit settings",
  "form.subtitle": "With password login enabled, the browser shows its native Basic Auth dialog; saving restarts the forwarding service.",
  "form.listenPort": "Proxy port (listen)",
  "form.listenPortHint": "1\u201365535",
  "form.username": "Username",
  "form.usernameHint": "Empty to set blank",
  "form.password": "Password",
  "form.passwordHint": "Empty to set blank; password login requires BOTH username and password",
  "form.showPassword": "Show password",
  "form.hidePassword": "Hide password",
  "form.save": "Apply",
  "form.saving": "Applying\u2026",
  "form.invalidPort": "Port must be an integer between 1 and 65535",
  "form.portConflict": "Proxy port must differ from the default service port",
  "form.updated": "Saved and the forwarding service restarted",
  "form.updatedPartial": "Saved and restarted (note: password login requires BOTH username and password)",
  "form.failed": "Save failed"
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
  box-shadow: 0 0 0 3px rgba(63, 185, 80, 0.2);
}
.dsh_lanproxy_dotOff {
  background: var(--dsw-alias-state-error-primary, #f85149);
  box-shadow: 0 0 0 3px rgba(248, 81, 73, 0.2);
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
/* Badges: text color only, no tinted background (the user asked for the
   status text color without the red/green fill). */
.dsh_lanproxy_badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
  background: transparent;
}
.dsh_lanproxy_badgeOn {
  color: var(--dsw-alias-state-success-primary, #3fb950);
}
.dsh_lanproxy_badgeOff {
  color: var(--dsw-alias-state-error-primary, #f85149);
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
  box-sizing: border-box;
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
/* Primary button (\u542F\u52A8 / \u5E94\u7528): filled accent with a visible border. */
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
/* Secondary button (\u505C\u6B62): outline style with its own border. */
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
  console.info("[dsh-proxy] bundle loaded");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-proxy: dictionaries");
  const t = ctx.locale.bind(NS);
  const connection = ctx.get("connection");
  const rpc = connection.rpc;
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-proxy",
    order: 70,
    label: () => t("nav"),
    locale: NS,
    inject: () => ({ rpc })
  }, SettingsSection));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
