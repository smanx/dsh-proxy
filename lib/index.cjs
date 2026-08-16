"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from2, except, desc) => {
  if (from2 && typeof from2 === "object" || typeof from2 === "function") {
    for (let key of __getOwnPropNames(from2))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from2[key], enumerable: !(desc = __getOwnPropDesc(from2, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/.pnpm/eventemitter3@4.0.7/node_modules/eventemitter3/index.js
var require_eventemitter3 = __commonJS({
  "node_modules/.pnpm/eventemitter3@4.0.7/node_modules/eventemitter3/index.js"(exports2, module2) {
    "use strict";
    var has = Object.prototype.hasOwnProperty;
    var prefix = "~";
    function Events() {
    }
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter.prototype.eventNames = function eventNames() {
      var names = [], events, name2;
      if (this._eventsCount === 0) return names;
      for (name2 in events = this._events) {
        if (has.call(events, name2)) names.push(prefix ? name2.slice(1) : name2);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    };
    EventEmitter.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    };
    EventEmitter.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prefixed = prefix;
    EventEmitter.EventEmitter = EventEmitter;
    if ("undefined" !== typeof module2) {
      module2.exports = EventEmitter;
    }
  }
});

// node_modules/.pnpm/requires-port@1.0.0/node_modules/requires-port/index.js
var require_requires_port = __commonJS({
  "node_modules/.pnpm/requires-port@1.0.0/node_modules/requires-port/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function required(port, protocol) {
      protocol = protocol.split(":")[0];
      port = +port;
      if (!port) return false;
      switch (protocol) {
        case "http":
        case "ws":
          return port !== 80;
        case "https":
        case "wss":
          return port !== 443;
        case "ftp":
          return port !== 21;
        case "gopher":
          return port !== 70;
        case "file":
          return false;
      }
      return port !== 0;
    };
  }
});

// node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/common.js
var require_common = __commonJS({
  "node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/common.js"(exports2) {
    var common = exports2;
    var url = require("url");
    var extend2 = require("util")._extend;
    var required = require_requires_port();
    var upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i;
    var isSSL = /^https|wss/;
    common.isSSL = isSSL;
    common.setupOutgoing = function(outgoing, options, req, forward) {
      outgoing.port = options[forward || "target"].port || (isSSL.test(options[forward || "target"].protocol) ? 443 : 80);
      [
        "host",
        "hostname",
        "socketPath",
        "pfx",
        "key",
        "passphrase",
        "cert",
        "ca",
        "ciphers",
        "secureProtocol"
      ].forEach(
        function(e) {
          outgoing[e] = options[forward || "target"][e];
        }
      );
      outgoing.method = options.method || req.method;
      outgoing.headers = extend2({}, req.headers);
      if (options.headers) {
        extend2(outgoing.headers, options.headers);
      }
      if (options.auth) {
        outgoing.auth = options.auth;
      }
      if (options.ca) {
        outgoing.ca = options.ca;
      }
      if (isSSL.test(options[forward || "target"].protocol)) {
        outgoing.rejectUnauthorized = typeof options.secure === "undefined" ? true : options.secure;
      }
      outgoing.agent = options.agent || false;
      outgoing.localAddress = options.localAddress;
      if (!outgoing.agent) {
        outgoing.headers = outgoing.headers || {};
        if (typeof outgoing.headers.connection !== "string" || !upgradeHeader.test(outgoing.headers.connection)) {
          outgoing.headers.connection = "close";
        }
      }
      var target = options[forward || "target"];
      var targetPath = target && options.prependPath !== false ? target.path || "" : "";
      var outgoingPath = !options.toProxy ? url.parse(req.url).path || "" : req.url;
      outgoingPath = !options.ignorePath ? outgoingPath : "";
      outgoing.path = common.urlJoin(targetPath, outgoingPath);
      if (options.changeOrigin) {
        outgoing.headers.host = required(outgoing.port, options[forward || "target"].protocol) && !hasPort(outgoing.host) ? outgoing.host + ":" + outgoing.port : outgoing.host;
      }
      return outgoing;
    };
    common.setupSocket = function(socket) {
      socket.setTimeout(0);
      socket.setNoDelay(true);
      socket.setKeepAlive(true, 0);
      return socket;
    };
    common.getPort = function(req) {
      var res = req.headers.host ? req.headers.host.match(/:(\d+)/) : "";
      return res ? res[1] : common.hasEncryptedConnection(req) ? "443" : "80";
    };
    common.hasEncryptedConnection = function(req) {
      return Boolean(req.connection.encrypted || req.connection.pair);
    };
    common.urlJoin = function() {
      var args = Array.prototype.slice.call(arguments), lastIndex = args.length - 1, last = args[lastIndex], lastSegs = last.split("?"), retSegs;
      args[lastIndex] = lastSegs.shift();
      retSegs = [
        args.filter(Boolean).join("/").replace(/\/+/g, "/").replace("http:/", "http://").replace("https:/", "https://")
      ];
      retSegs.push.apply(retSegs, lastSegs);
      return retSegs.join("?");
    };
    common.rewriteCookieProperty = function rewriteCookieProperty(header, config, property2) {
      if (Array.isArray(header)) {
        return header.map(function(headerElement) {
          return rewriteCookieProperty(headerElement, config, property2);
        });
      }
      return header.replace(new RegExp("(;\\s*" + property2 + "=)([^;]+)", "i"), function(match, prefix, previousValue) {
        var newValue;
        if (previousValue in config) {
          newValue = config[previousValue];
        } else if ("*" in config) {
          newValue = config["*"];
        } else {
          return match;
        }
        if (newValue) {
          return prefix + newValue;
        } else {
          return "";
        }
      });
    };
    function hasPort(host) {
      return !!~host.indexOf(":");
    }
  }
});

// node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/passes/web-outgoing.js
var require_web_outgoing = __commonJS({
  "node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/passes/web-outgoing.js"(exports2, module2) {
    var url = require("url");
    var common = require_common();
    var redirectRegex = /^201|30(1|2|7|8)$/;
    module2.exports = {
      // <--
      /**
       * If is a HTTP 1.0 request, remove chunk headers
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {proxyResponse} Res Response object from the proxy request
       *
       * @api private
       */
      removeChunked: function removeChunked(req, res, proxyRes) {
        if (req.httpVersion === "1.0") {
          delete proxyRes.headers["transfer-encoding"];
        }
      },
      /**
       * If is a HTTP 1.0 request, set the correct connection header
       * or if connection header not present, then use `keep-alive`
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {proxyResponse} Res Response object from the proxy request
       *
       * @api private
       */
      setConnection: function setConnection(req, res, proxyRes) {
        if (req.httpVersion === "1.0") {
          proxyRes.headers.connection = req.headers.connection || "close";
        } else if (req.httpVersion !== "2.0" && !proxyRes.headers.connection) {
          proxyRes.headers.connection = req.headers.connection || "keep-alive";
        }
      },
      setRedirectHostRewrite: function setRedirectHostRewrite(req, res, proxyRes, options) {
        if ((options.hostRewrite || options.autoRewrite || options.protocolRewrite) && proxyRes.headers["location"] && redirectRegex.test(proxyRes.statusCode)) {
          var target = url.parse(options.target);
          var u = url.parse(proxyRes.headers["location"]);
          if (target.host != u.host) {
            return;
          }
          if (options.hostRewrite) {
            u.host = options.hostRewrite;
          } else if (options.autoRewrite) {
            u.host = req.headers["host"];
          }
          if (options.protocolRewrite) {
            u.protocol = options.protocolRewrite;
          }
          proxyRes.headers["location"] = u.format();
        }
      },
      /**
       * Copy headers from proxyResponse to response
       * set each header in response object.
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {proxyResponse} Res Response object from the proxy request
       * @param {Object} Options options.cookieDomainRewrite: Config to rewrite cookie domain
       *
       * @api private
       */
      writeHeaders: function writeHeaders(req, res, proxyRes, options) {
        var rewriteCookieDomainConfig = options.cookieDomainRewrite, rewriteCookiePathConfig = options.cookiePathRewrite, preserveHeaderKeyCase = options.preserveHeaderKeyCase, rawHeaderKeyMap, setHeader = function(key2, header) {
          if (header == void 0) return;
          if (rewriteCookieDomainConfig && key2.toLowerCase() === "set-cookie") {
            header = common.rewriteCookieProperty(header, rewriteCookieDomainConfig, "domain");
          }
          if (rewriteCookiePathConfig && key2.toLowerCase() === "set-cookie") {
            header = common.rewriteCookieProperty(header, rewriteCookiePathConfig, "path");
          }
          res.setHeader(String(key2).trim(), header);
        };
        if (typeof rewriteCookieDomainConfig === "string") {
          rewriteCookieDomainConfig = { "*": rewriteCookieDomainConfig };
        }
        if (typeof rewriteCookiePathConfig === "string") {
          rewriteCookiePathConfig = { "*": rewriteCookiePathConfig };
        }
        if (preserveHeaderKeyCase && proxyRes.rawHeaders != void 0) {
          rawHeaderKeyMap = {};
          for (var i = 0; i < proxyRes.rawHeaders.length; i += 2) {
            var key = proxyRes.rawHeaders[i];
            rawHeaderKeyMap[key.toLowerCase()] = key;
          }
        }
        Object.keys(proxyRes.headers).forEach(function(key2) {
          var header = proxyRes.headers[key2];
          if (preserveHeaderKeyCase && rawHeaderKeyMap) {
            key2 = rawHeaderKeyMap[key2] || key2;
          }
          setHeader(key2, header);
        });
      },
      /**
       * Set the statusCode from the proxyResponse
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {proxyResponse} Res Response object from the proxy request
       *
       * @api private
       */
      writeStatusCode: function writeStatusCode(req, res, proxyRes) {
        if (proxyRes.statusMessage) {
          res.statusCode = proxyRes.statusCode;
          res.statusMessage = proxyRes.statusMessage;
        } else {
          res.statusCode = proxyRes.statusCode;
        }
      }
    };
  }
});

// node_modules/.pnpm/follow-redirects@1.16.0/node_modules/follow-redirects/debug.js
var require_debug = __commonJS({
  "node_modules/.pnpm/follow-redirects@1.16.0/node_modules/follow-redirects/debug.js"(exports2, module2) {
    var debug;
    module2.exports = function() {
      if (!debug) {
        try {
          debug = require("debug")("follow-redirects");
        } catch (error) {
        }
        if (typeof debug !== "function") {
          debug = function() {
          };
        }
      }
      debug.apply(null, arguments);
    };
  }
});

// node_modules/.pnpm/follow-redirects@1.16.0/node_modules/follow-redirects/index.js
var require_follow_redirects = __commonJS({
  "node_modules/.pnpm/follow-redirects@1.16.0/node_modules/follow-redirects/index.js"(exports2, module2) {
    var url = require("url");
    var URL2 = url.URL;
    var http2 = require("http");
    var https = require("https");
    var Writable = require("stream").Writable;
    var assert = require("assert");
    var debug = require_debug();
    (function detectUnsupportedEnvironment() {
      var looksLikeNode = typeof process !== "undefined";
      var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
      var looksLikeV8 = isFunction(Error.captureStackTrace);
      if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
        console.warn("The follow-redirects package should be excluded from browser builds.");
      }
    })();
    var useNativeURL = false;
    try {
      assert(new URL2(""));
    } catch (error) {
      useNativeURL = error.code === "ERR_INVALID_URL";
    }
    var sensitiveHeaders = [
      "Authorization",
      "Proxy-Authorization",
      "Cookie"
    ];
    var preservedUrlFields = [
      "auth",
      "host",
      "hostname",
      "href",
      "path",
      "pathname",
      "port",
      "protocol",
      "query",
      "search",
      "hash"
    ];
    var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
    var eventHandlers = /* @__PURE__ */ Object.create(null);
    events.forEach(function(event) {
      eventHandlers[event] = function(arg1, arg2, arg3) {
        this._redirectable.emit(event, arg1, arg2, arg3);
      };
    });
    var InvalidUrlError = createErrorType(
      "ERR_INVALID_URL",
      "Invalid URL",
      TypeError
    );
    var RedirectionError = createErrorType(
      "ERR_FR_REDIRECTION_FAILURE",
      "Redirected request failed"
    );
    var TooManyRedirectsError = createErrorType(
      "ERR_FR_TOO_MANY_REDIRECTS",
      "Maximum number of redirects exceeded",
      RedirectionError
    );
    var MaxBodyLengthExceededError = createErrorType(
      "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
      "Request body larger than maxBodyLength limit"
    );
    var WriteAfterEndError = createErrorType(
      "ERR_STREAM_WRITE_AFTER_END",
      "write after end"
    );
    var destroy = Writable.prototype.destroy || noop;
    function RedirectableRequest(options, responseCallback) {
      Writable.call(this);
      this._sanitizeOptions(options);
      this._options = options;
      this._ended = false;
      this._ending = false;
      this._redirectCount = 0;
      this._redirects = [];
      this._requestBodyLength = 0;
      this._requestBodyBuffers = [];
      if (responseCallback) {
        this.on("response", responseCallback);
      }
      var self = this;
      this._onNativeResponse = function(response) {
        try {
          self._processResponse(response);
        } catch (cause) {
          self.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
        }
      };
      this._headerFilter = new RegExp("^(?:" + sensitiveHeaders.concat(options.sensitiveHeaders).map(escapeRegex).join("|") + ")$", "i");
      this._performRequest();
    }
    RedirectableRequest.prototype = Object.create(Writable.prototype);
    RedirectableRequest.prototype.abort = function() {
      destroyRequest(this._currentRequest);
      this._currentRequest.abort();
      this.emit("abort");
    };
    RedirectableRequest.prototype.destroy = function(error) {
      destroyRequest(this._currentRequest, error);
      destroy.call(this, error);
      return this;
    };
    RedirectableRequest.prototype.write = function(data, encoding, callback) {
      if (this._ending) {
        throw new WriteAfterEndError();
      }
      if (!isString(data) && !isBuffer(data)) {
        throw new TypeError("data should be a string, Buffer or Uint8Array");
      }
      if (isFunction(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (data.length === 0) {
        if (callback) {
          callback();
        }
        return;
      }
      if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
        this._requestBodyLength += data.length;
        this._requestBodyBuffers.push({ data, encoding });
        this._currentRequest.write(data, encoding, callback);
      } else {
        this.emit("error", new MaxBodyLengthExceededError());
        this.abort();
      }
    };
    RedirectableRequest.prototype.end = function(data, encoding, callback) {
      if (isFunction(data)) {
        callback = data;
        data = encoding = null;
      } else if (isFunction(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (!data) {
        this._ended = this._ending = true;
        this._currentRequest.end(null, null, callback);
      } else {
        var self = this;
        var currentRequest = this._currentRequest;
        this.write(data, encoding, function() {
          self._ended = true;
          currentRequest.end(null, null, callback);
        });
        this._ending = true;
      }
    };
    RedirectableRequest.prototype.setHeader = function(name2, value) {
      this._options.headers[name2] = value;
      this._currentRequest.setHeader(name2, value);
    };
    RedirectableRequest.prototype.removeHeader = function(name2) {
      delete this._options.headers[name2];
      this._currentRequest.removeHeader(name2);
    };
    RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
      var self = this;
      function destroyOnTimeout(socket) {
        socket.setTimeout(msecs);
        socket.removeListener("timeout", socket.destroy);
        socket.addListener("timeout", socket.destroy);
      }
      function startTimer(socket) {
        if (self._timeout) {
          clearTimeout(self._timeout);
        }
        self._timeout = setTimeout(function() {
          self.emit("timeout");
          clearTimer();
        }, msecs);
        destroyOnTimeout(socket);
      }
      function clearTimer() {
        if (self._timeout) {
          clearTimeout(self._timeout);
          self._timeout = null;
        }
        self.removeListener("abort", clearTimer);
        self.removeListener("error", clearTimer);
        self.removeListener("response", clearTimer);
        self.removeListener("close", clearTimer);
        if (callback) {
          self.removeListener("timeout", callback);
        }
        if (!self.socket) {
          self._currentRequest.removeListener("socket", startTimer);
        }
      }
      if (callback) {
        this.on("timeout", callback);
      }
      if (this.socket) {
        startTimer(this.socket);
      } else {
        this._currentRequest.once("socket", startTimer);
      }
      this.on("socket", destroyOnTimeout);
      this.on("abort", clearTimer);
      this.on("error", clearTimer);
      this.on("response", clearTimer);
      this.on("close", clearTimer);
      return this;
    };
    [
      "flushHeaders",
      "getHeader",
      "setNoDelay",
      "setSocketKeepAlive"
    ].forEach(function(method) {
      RedirectableRequest.prototype[method] = function(a, b) {
        return this._currentRequest[method](a, b);
      };
    });
    ["aborted", "connection", "socket"].forEach(function(property2) {
      Object.defineProperty(RedirectableRequest.prototype, property2, {
        get: function() {
          return this._currentRequest[property2];
        }
      });
    });
    RedirectableRequest.prototype._sanitizeOptions = function(options) {
      if (!options.headers) {
        options.headers = {};
      }
      if (!isArray(options.sensitiveHeaders)) {
        options.sensitiveHeaders = [];
      }
      if (options.host) {
        if (!options.hostname) {
          options.hostname = options.host;
        }
        delete options.host;
      }
      if (!options.pathname && options.path) {
        var searchPos = options.path.indexOf("?");
        if (searchPos < 0) {
          options.pathname = options.path;
        } else {
          options.pathname = options.path.substring(0, searchPos);
          options.search = options.path.substring(searchPos);
        }
      }
    };
    RedirectableRequest.prototype._performRequest = function() {
      var protocol = this._options.protocol;
      var nativeProtocol = this._options.nativeProtocols[protocol];
      if (!nativeProtocol) {
        throw new TypeError("Unsupported protocol " + protocol);
      }
      if (this._options.agents) {
        var scheme = protocol.slice(0, -1);
        this._options.agent = this._options.agents[scheme];
      }
      var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
      request._redirectable = this;
      for (var event of events) {
        request.on(event, eventHandlers[event]);
      }
      this._currentUrl = /^\//.test(this._options.path) ? url.format(this._options) : (
        // When making a request to a proxy, […]
        // a client MUST send the target URI in absolute-form […].
        this._options.path
      );
      if (this._isRedirect) {
        var i = 0;
        var self = this;
        var buffers = this._requestBodyBuffers;
        (function writeNext(error) {
          if (request === self._currentRequest) {
            if (error) {
              self.emit("error", error);
            } else if (i < buffers.length) {
              var buffer = buffers[i++];
              if (!request.finished) {
                request.write(buffer.data, buffer.encoding, writeNext);
              }
            } else if (self._ended) {
              request.end();
            }
          }
        })();
      }
    };
    RedirectableRequest.prototype._processResponse = function(response) {
      var statusCode = response.statusCode;
      if (this._options.trackRedirects) {
        this._redirects.push({
          url: this._currentUrl,
          headers: response.headers,
          statusCode
        });
      }
      var location = response.headers.location;
      if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
        response.responseUrl = this._currentUrl;
        response.redirects = this._redirects;
        this.emit("response", response);
        this._requestBodyBuffers = [];
        return;
      }
      destroyRequest(this._currentRequest);
      response.destroy();
      if (++this._redirectCount > this._options.maxRedirects) {
        throw new TooManyRedirectsError();
      }
      var requestHeaders;
      var beforeRedirect = this._options.beforeRedirect;
      if (beforeRedirect) {
        requestHeaders = Object.assign({
          // The Host header was set by nativeProtocol.request
          Host: response.req.getHeader("host")
        }, this._options.headers);
      }
      var method = this._options.method;
      if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
      // the server is redirecting the user agent to a different resource […]
      // A user agent can perform a retrieval request targeting that URI
      // (a GET or HEAD request if using HTTP) […]
      statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
        this._options.method = "GET";
        this._requestBodyBuffers = [];
        removeMatchingHeaders(/^content-/i, this._options.headers);
      }
      var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
      var currentUrlParts = parseUrl(this._currentUrl);
      var currentHost = currentHostHeader || currentUrlParts.host;
      var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url.format(Object.assign(currentUrlParts, { host: currentHost }));
      var redirectUrl = resolveUrl(location, currentUrl);
      debug("redirecting to", redirectUrl.href);
      this._isRedirect = true;
      spreadUrlObject(redirectUrl, this._options);
      if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
        removeMatchingHeaders(this._headerFilter, this._options.headers);
      }
      if (isFunction(beforeRedirect)) {
        var responseDetails = {
          headers: response.headers,
          statusCode
        };
        var requestDetails = {
          url: currentUrl,
          method,
          headers: requestHeaders
        };
        beforeRedirect(this._options, responseDetails, requestDetails);
        this._sanitizeOptions(this._options);
      }
      this._performRequest();
    };
    function wrap(protocols) {
      var exports3 = {
        maxRedirects: 21,
        maxBodyLength: 10 * 1024 * 1024
      };
      var nativeProtocols = {};
      Object.keys(protocols).forEach(function(scheme) {
        var protocol = scheme + ":";
        var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
        var wrappedProtocol = exports3[scheme] = Object.create(nativeProtocol);
        function request(input, options, callback) {
          if (isURL(input)) {
            input = spreadUrlObject(input);
          } else if (isString(input)) {
            input = spreadUrlObject(parseUrl(input));
          } else {
            callback = options;
            options = validateUrl(input);
            input = { protocol };
          }
          if (isFunction(options)) {
            callback = options;
            options = null;
          }
          options = Object.assign({
            maxRedirects: exports3.maxRedirects,
            maxBodyLength: exports3.maxBodyLength
          }, input, options);
          options.nativeProtocols = nativeProtocols;
          if (!isString(options.host) && !isString(options.hostname)) {
            options.hostname = "::1";
          }
          assert.equal(options.protocol, protocol, "protocol mismatch");
          debug("options", options);
          return new RedirectableRequest(options, callback);
        }
        function get(input, options, callback) {
          var wrappedRequest = wrappedProtocol.request(input, options, callback);
          wrappedRequest.end();
          return wrappedRequest;
        }
        Object.defineProperties(wrappedProtocol, {
          request: { value: request, configurable: true, enumerable: true, writable: true },
          get: { value: get, configurable: true, enumerable: true, writable: true }
        });
      });
      return exports3;
    }
    function noop() {
    }
    function parseUrl(input) {
      var parsed;
      if (useNativeURL) {
        parsed = new URL2(input);
      } else {
        parsed = validateUrl(url.parse(input));
        if (!isString(parsed.protocol)) {
          throw new InvalidUrlError({ input });
        }
      }
      return parsed;
    }
    function resolveUrl(relative, base) {
      return useNativeURL ? new URL2(relative, base) : parseUrl(url.resolve(base, relative));
    }
    function validateUrl(input) {
      if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      return input;
    }
    function spreadUrlObject(urlObject, target) {
      var spread = target || {};
      for (var key of preservedUrlFields) {
        spread[key] = urlObject[key];
      }
      if (spread.hostname.startsWith("[")) {
        spread.hostname = spread.hostname.slice(1, -1);
      }
      if (spread.port !== "") {
        spread.port = Number(spread.port);
      }
      spread.path = spread.search ? spread.pathname + spread.search : spread.pathname;
      return spread;
    }
    function removeMatchingHeaders(regex, headers) {
      var lastValue;
      for (var header in headers) {
        if (regex.test(header)) {
          lastValue = headers[header];
          delete headers[header];
        }
      }
      return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
    }
    function createErrorType(code, message, baseClass) {
      function CustomError(properties) {
        if (isFunction(Error.captureStackTrace)) {
          Error.captureStackTrace(this, this.constructor);
        }
        Object.assign(this, properties || {});
        this.code = code;
        this.message = this.cause ? message + ": " + this.cause.message : message;
      }
      CustomError.prototype = new (baseClass || Error)();
      Object.defineProperties(CustomError.prototype, {
        constructor: {
          value: CustomError,
          enumerable: false
        },
        name: {
          value: "Error [" + code + "]",
          enumerable: false
        }
      });
      return CustomError;
    }
    function destroyRequest(request, error) {
      for (var event of events) {
        request.removeListener(event, eventHandlers[event]);
      }
      request.on("error", noop);
      request.destroy(error);
    }
    function isSubdomain(subdomain, domain) {
      assert(isString(subdomain) && isString(domain));
      var dot = subdomain.length - domain.length - 1;
      return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
    }
    function isArray(value) {
      return value instanceof Array;
    }
    function isString(value) {
      return typeof value === "string" || value instanceof String;
    }
    function isFunction(value) {
      return typeof value === "function";
    }
    function isBuffer(value) {
      return typeof value === "object" && "length" in value;
    }
    function isURL(value) {
      return URL2 && value instanceof URL2;
    }
    function escapeRegex(regex) {
      return regex.replace(/[\]\\/()*+?.$]/g, "\\$&");
    }
    module2.exports = wrap({ http: http2, https });
    module2.exports.wrap = wrap;
  }
});

// node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/passes/web-incoming.js
var require_web_incoming = __commonJS({
  "node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/passes/web-incoming.js"(exports2, module2) {
    var httpNative = require("http");
    var httpsNative = require("https");
    var web_o = require_web_outgoing();
    var common = require_common();
    var followRedirects = require_follow_redirects();
    web_o = Object.keys(web_o).map(function(pass) {
      return web_o[pass];
    });
    var nativeAgents = { http: httpNative, https: httpsNative };
    module2.exports = {
      /**
       * Sets `content-length` to '0' if request is of DELETE type.
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {Object} Options Config object passed to the proxy
       *
       * @api private
       */
      deleteLength: function deleteLength(req, res, options) {
        if ((req.method === "DELETE" || req.method === "OPTIONS") && !req.headers["content-length"]) {
          req.headers["content-length"] = "0";
          delete req.headers["transfer-encoding"];
        }
      },
      /**
       * Sets timeout in request socket if it was specified in options.
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {Object} Options Config object passed to the proxy
       *
       * @api private
       */
      timeout: function timeout(req, res, options) {
        if (options.timeout) {
          req.socket.setTimeout(options.timeout);
        }
      },
      /**
       * Sets `x-forwarded-*` headers if specified in config.
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {Object} Options Config object passed to the proxy
       *
       * @api private
       */
      XHeaders: function XHeaders(req, res, options) {
        if (!options.xfwd) return;
        var encrypted = req.isSpdy || common.hasEncryptedConnection(req);
        var values = {
          for: req.connection.remoteAddress || req.socket.remoteAddress,
          port: common.getPort(req),
          proto: encrypted ? "https" : "http"
        };
        ["for", "port", "proto"].forEach(function(header) {
          req.headers["x-forwarded-" + header] = (req.headers["x-forwarded-" + header] || "") + (req.headers["x-forwarded-" + header] ? "," : "") + values[header];
        });
        req.headers["x-forwarded-host"] = req.headers["x-forwarded-host"] || req.headers["host"] || "";
      },
      /**
       * Does the actual proxying. If `forward` is enabled fires up
       * a ForwardStream, same happens for ProxyStream. The request
       * just dies otherwise.
       *
       * @param {ClientRequest} Req Request object
       * @param {IncomingMessage} Res Response object
       * @param {Object} Options Config object passed to the proxy
       *
       * @api private
       */
      stream: function stream(req, res, options, _, server, clb) {
        server.emit("start", req, res, options.target || options.forward);
        var agents = options.followRedirects ? followRedirects : nativeAgents;
        var http2 = agents.http;
        var https = agents.https;
        if (options.forward) {
          var forwardReq = (options.forward.protocol === "https:" ? https : http2).request(
            common.setupOutgoing(options.ssl || {}, options, req, "forward")
          );
          var forwardError = createErrorHandler(forwardReq, options.forward);
          req.on("error", forwardError);
          forwardReq.on("error", forwardError);
          (options.buffer || req).pipe(forwardReq);
          if (!options.target) {
            return res.end();
          }
        }
        var proxyReq = (options.target.protocol === "https:" ? https : http2).request(
          common.setupOutgoing(options.ssl || {}, options, req)
        );
        proxyReq.on("socket", function(socket) {
          if (server && !proxyReq.getHeader("expect")) {
            server.emit("proxyReq", proxyReq, req, res, options);
          }
        });
        if (options.proxyTimeout) {
          proxyReq.setTimeout(options.proxyTimeout, function() {
            proxyReq.abort();
          });
        }
        req.on("aborted", function() {
          proxyReq.abort();
        });
        var proxyError = createErrorHandler(proxyReq, options.target);
        req.on("error", proxyError);
        proxyReq.on("error", proxyError);
        function createErrorHandler(proxyReq2, url) {
          return function proxyError2(err) {
            if (req.socket.destroyed && err.code === "ECONNRESET") {
              server.emit("econnreset", err, req, res, url);
              return proxyReq2.abort();
            }
            if (clb) {
              clb(err, req, res, url);
            } else {
              server.emit("error", err, req, res, url);
            }
          };
        }
        (options.buffer || req).pipe(proxyReq);
        proxyReq.on("response", function(proxyRes) {
          if (server) {
            server.emit("proxyRes", proxyRes, req, res);
          }
          if (!res.headersSent && !options.selfHandleResponse) {
            for (var i = 0; i < web_o.length; i++) {
              if (web_o[i](req, res, proxyRes, options)) {
                break;
              }
            }
          }
          if (!res.finished) {
            proxyRes.on("end", function() {
              if (server) server.emit("end", req, res, proxyRes);
            });
            if (!options.selfHandleResponse) proxyRes.pipe(res);
          } else {
            if (server) server.emit("end", req, res, proxyRes);
          }
        });
      }
    };
  }
});

// node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/passes/ws-incoming.js
var require_ws_incoming = __commonJS({
  "node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/passes/ws-incoming.js"(exports2, module2) {
    var http2 = require("http");
    var https = require("https");
    var common = require_common();
    module2.exports = {
      /**
       * WebSocket requests must have the `GET` method and
       * the `upgrade:websocket` header
       *
       * @param {ClientRequest} Req Request object
       * @param {Socket} Websocket
       *
       * @api private
       */
      checkMethodAndHeader: function checkMethodAndHeader(req, socket) {
        if (req.method !== "GET" || !req.headers.upgrade) {
          socket.destroy();
          return true;
        }
        if (req.headers.upgrade.toLowerCase() !== "websocket") {
          socket.destroy();
          return true;
        }
      },
      /**
       * Sets `x-forwarded-*` headers if specified in config.
       *
       * @param {ClientRequest} Req Request object
       * @param {Socket} Websocket
       * @param {Object} Options Config object passed to the proxy
       *
       * @api private
       */
      XHeaders: function XHeaders(req, socket, options) {
        if (!options.xfwd) return;
        var values = {
          for: req.connection.remoteAddress || req.socket.remoteAddress,
          port: common.getPort(req),
          proto: common.hasEncryptedConnection(req) ? "wss" : "ws"
        };
        ["for", "port", "proto"].forEach(function(header) {
          req.headers["x-forwarded-" + header] = (req.headers["x-forwarded-" + header] || "") + (req.headers["x-forwarded-" + header] ? "," : "") + values[header];
        });
      },
      /**
       * Does the actual proxying. Make the request and upgrade it
       * send the Switching Protocols request and pipe the sockets.
       *
       * @param {ClientRequest} Req Request object
       * @param {Socket} Websocket
       * @param {Object} Options Config object passed to the proxy
       *
       * @api private
       */
      stream: function stream(req, socket, options, head, server, clb) {
        var createHttpHeader = function(line, headers) {
          return Object.keys(headers).reduce(function(head2, key) {
            var value = headers[key];
            if (!Array.isArray(value)) {
              head2.push(key + ": " + value);
              return head2;
            }
            for (var i = 0; i < value.length; i++) {
              head2.push(key + ": " + value[i]);
            }
            return head2;
          }, [line]).join("\r\n") + "\r\n\r\n";
        };
        common.setupSocket(socket);
        if (head && head.length) socket.unshift(head);
        var proxyReq = (common.isSSL.test(options.target.protocol) ? https : http2).request(
          common.setupOutgoing(options.ssl || {}, options, req)
        );
        if (server) {
          server.emit("proxyReqWs", proxyReq, req, socket, options, head);
        }
        proxyReq.on("error", onOutgoingError);
        proxyReq.on("response", function(res) {
          if (!res.upgrade) {
            socket.write(createHttpHeader("HTTP/" + res.httpVersion + " " + res.statusCode + " " + res.statusMessage, res.headers));
            res.pipe(socket);
          }
        });
        proxyReq.on("upgrade", function(proxyRes, proxySocket, proxyHead) {
          proxySocket.on("error", onOutgoingError);
          proxySocket.on("end", function() {
            server.emit("close", proxyRes, proxySocket, proxyHead);
          });
          socket.on("error", function() {
            proxySocket.end();
          });
          common.setupSocket(proxySocket);
          if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead);
          socket.write(createHttpHeader("HTTP/1.1 101 Switching Protocols", proxyRes.headers));
          proxySocket.pipe(socket).pipe(proxySocket);
          server.emit("open", proxySocket);
          server.emit("proxySocket", proxySocket);
        });
        return proxyReq.end();
        function onOutgoingError(err) {
          if (clb) {
            clb(err, req, socket);
          } else {
            server.emit("error", err, req, socket);
          }
          socket.end();
        }
      }
    };
  }
});

// node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/index.js
var require_http_proxy = __commonJS({
  "node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy/index.js"(exports2, module2) {
    var httpProxy2 = module2.exports;
    var extend2 = require("util")._extend;
    var parse_url = require("url").parse;
    var EE3 = require_eventemitter3();
    var http2 = require("http");
    var https = require("https");
    var web = require_web_incoming();
    var ws = require_ws_incoming();
    httpProxy2.Server = ProxyServer;
    function createRightProxy(type) {
      return function(options) {
        return function(req, res) {
          var passes = type === "ws" ? this.wsPasses : this.webPasses, args = [].slice.call(arguments), cntr = args.length - 1, head, cbl;
          if (typeof args[cntr] === "function") {
            cbl = args[cntr];
            cntr--;
          }
          var requestOptions = options;
          if (!(args[cntr] instanceof Buffer) && args[cntr] !== res) {
            requestOptions = extend2({}, options);
            extend2(requestOptions, args[cntr]);
            cntr--;
          }
          if (args[cntr] instanceof Buffer) {
            head = args[cntr];
          }
          ["target", "forward"].forEach(function(e) {
            if (typeof requestOptions[e] === "string")
              requestOptions[e] = parse_url(requestOptions[e]);
          });
          if (!requestOptions.target && !requestOptions.forward) {
            return this.emit("error", new Error("Must provide a proper URL as target"));
          }
          for (var i = 0; i < passes.length; i++) {
            if (passes[i](req, res, requestOptions, head, this, cbl)) {
              break;
            }
          }
        };
      };
    }
    httpProxy2.createRightProxy = createRightProxy;
    function ProxyServer(options) {
      EE3.call(this);
      options = options || {};
      options.prependPath = options.prependPath === false ? false : true;
      this.web = this.proxyRequest = createRightProxy("web")(options);
      this.ws = this.proxyWebsocketRequest = createRightProxy("ws")(options);
      this.options = options;
      this.webPasses = Object.keys(web).map(function(pass) {
        return web[pass];
      });
      this.wsPasses = Object.keys(ws).map(function(pass) {
        return ws[pass];
      });
      this.on("error", this.onError, this);
    }
    require("util").inherits(ProxyServer, EE3);
    ProxyServer.prototype.onError = function(err) {
      if (this.listeners("error").length === 1) {
        throw err;
      }
    };
    ProxyServer.prototype.listen = function(port, hostname) {
      var self = this, closure = function(req, res) {
        self.web(req, res);
      };
      this._server = this.options.ssl ? https.createServer(this.options.ssl, closure) : http2.createServer(closure);
      if (this.options.ws) {
        this._server.on("upgrade", function(req, socket, head) {
          self.ws(req, socket, head);
        });
      }
      this._server.listen(port, hostname);
      return this;
    };
    ProxyServer.prototype.close = function(callback) {
      var self = this;
      if (this._server) {
        this._server.close(done);
      }
      function done() {
        self._server = null;
        if (callback) {
          callback.apply(null, arguments);
        }
      }
      ;
    };
    ProxyServer.prototype.before = function(type, passName, callback) {
      if (type !== "ws" && type !== "web") {
        throw new Error("type must be `web` or `ws`");
      }
      var passes = type === "ws" ? this.wsPasses : this.webPasses, i = false;
      passes.forEach(function(v, idx) {
        if (v.name === passName) i = idx;
      });
      if (i === false) throw new Error("No such pass");
      passes.splice(i, 0, callback);
    };
    ProxyServer.prototype.after = function(type, passName, callback) {
      if (type !== "ws" && type !== "web") {
        throw new Error("type must be `web` or `ws`");
      }
      var passes = type === "ws" ? this.wsPasses : this.webPasses, i = false;
      passes.forEach(function(v, idx) {
        if (v.name === passName) i = idx;
      });
      if (i === false) throw new Error("No such pass");
      passes.splice(i++, 0, callback);
    };
  }
});

// node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy.js
var require_http_proxy2 = __commonJS({
  "node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/lib/http-proxy.js"(exports2, module2) {
    var ProxyServer = require_http_proxy().Server;
    function createProxyServer(options) {
      return new ProxyServer(options);
    }
    ProxyServer.createProxyServer = createProxyServer;
    ProxyServer.createServer = createProxyServer;
    ProxyServer.createProxy = createProxyServer;
    module2.exports = ProxyServer;
  }
});

// node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/index.js
var require_http_proxy3 = __commonJS({
  "node_modules/.pnpm/http-proxy@1.18.1/node_modules/http-proxy/index.js"(exports2, module2) {
    module2.exports = require_http_proxy2();
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  lanAddresses: () => lanAddresses,
  name: () => name,
  startLanProxy: () => startLanProxy
});
module.exports = __toCommonJS(index_exports);

// node_modules/.pnpm/@deepseek-ai+cosmokit@1.8.2/node_modules/@deepseek-ai/cosmokit/lib/index.js
function isNullable(value) {
  return value === null || value === void 0;
}
function isPlainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}
function filterKeys(object, filter) {
  return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
function mapValues(object, transform) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
function pick(source, keys, forced) {
  if (!keys) return { ...source };
  const result = {};
  for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
  return result;
}
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
(function(Binary2) {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    else return source;
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex;
  function fromHex(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function clone(source, refs = /* @__PURE__ */ new Map()) {
  if (!source || typeof source !== "object") return source;
  if (is("Date", source)) return new Date(source.valueOf());
  if (is("RegExp", source)) return new RegExp(source.source, source.flags);
  if (isArrayBufferLike(source)) return source.slice(0);
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const cached = refs.get(source);
  if (cached) return cached;
  if (Array.isArray(source)) {
    const result2 = [];
    refs.set(source, result2);
    source.forEach((value, index) => {
      result2[index] = Reflect.apply(clone, null, [value, refs]);
    });
    return result2;
  }
  const result = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result);
  for (const key of Reflect.ownKeys(source)) {
    const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
    if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
    Reflect.defineProperty(result, key, descriptor);
  }
  return result;
}
function deepEqual(a, b, strict) {
  if (a === b) return true;
  if (!strict && isNullable(a) && isNullable(b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (!a || !b) return false;
  function check(test, then) {
    return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
  }
  return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
    if (a2.byteLength !== b2.byteLength) return false;
    const viewA = new Uint8Array(a2);
    const viewB = new Uint8Array(b2);
    for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
    return true;
  }) ?? Object.keys({
    ...a,
    ...b
  }).every((key) => deepEqual(a[key], b[key], strict));
}
var Time;
(function(Time2) {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset) {
    timezoneOffset = offset;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date2 = /* @__PURE__ */ new Date(), offset) {
    if (typeof date2 === "number") date2 = new Date(date2);
    if (offset === void 0) offset = timezoneOffset;
    return Math.floor((date2.valueOf() / Time2.minute - offset) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset) {
    const date2 = new Date(value * Time2.day);
    if (offset === void 0) offset = timezoneOffset;
    return new Date(+date2 + offset * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date2) {
    const parsed = parseTime(date2);
    if (parsed) date2 = Date.now() + parsed;
    else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date2}`;
    else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date2}`;
    return date2 ? new Date(date2) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
    else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
    else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
    else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// node_modules/.pnpm/@deepseek-ai+schemastery@fi_6561064e2bd0849611bfbb66084d0b4d/node_modules/@deepseek-ai/schemastery/lib/index.mjs
var kSchema = /* @__PURE__ */ Symbol.for("schemastery");
var kValidationError = /* @__PURE__ */ Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
  options;
  name = "ValidationError";
  constructor(message, options) {
    let prefix = "$";
    for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
    else if (typeof segment === "number") prefix += "[" + segment + "]";
    else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
    if (prefix.startsWith(".")) prefix = prefix.slice(1);
    super((prefix === "$" ? "" : `${prefix} `) + message);
    this.options = options;
  }
  static is(error) {
    return !!error?.[kValidationError];
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
var Schema = function(options) {
  const schema = function(data, options2 = {}) {
    return Schema.resolve(data, schema, options2)[0];
  };
  if (options.refs) {
    const refs = mapValues(options.refs, (options2) => new Schema(options2));
    const getRef = (uid) => refs[uid];
    for (const key in refs) {
      const options2 = refs[key];
      options2.sKey = getRef(options2.sKey);
      options2.inner = getRef(options2.inner);
      options2.list = options2.list && options2.list.map(getRef);
      options2.dict = options2.dict && mapValues(options2.dict, getRef);
    }
    return refs[options.uid];
  }
  Object.assign(schema, options);
  if (typeof schema.callback === "string") try {
    schema.callback = new Function("return " + schema.callback)();
  } catch {
  }
  Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
  Object.setPrototypeOf(schema, Schema.prototype);
  schema.meta ||= {};
  schema.toString = schema.toString.bind(schema);
  return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
  return {
    version: 1,
    vendor: "schemastery",
    validate: (value) => {
      try {
        return { value: Schema.resolve(value, this, {})[0] };
      } catch (error) {
        if (ValidationError.is(error)) return { issues: [{
          message: error.message,
          path: error.options.path
        }] };
        throw error;
      }
    }
  };
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
  if (globalThis.__schemastery_refs__) {
    globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
    return this.uid;
  }
  globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
  globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
  const result = {
    uid: this.uid,
    refs: globalThis.__schemastery_refs__
  };
  globalThis.__schemastery_refs__ = void 0;
  return result;
};
Schema.prototype.set = function set(key, value) {
  this.dict[key] = value;
  return this;
};
Schema.prototype.push = function push(value) {
  this.list.push(value);
  return this;
};
function mergeDesc(original, messages) {
  const result = typeof original === "string" ? { "": original } : { ...original };
  for (const locale in messages) {
    const value = messages[locale];
    if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
    else if (typeof value === "string") result[locale] = value;
  }
  return result;
}
function getInner(value) {
  return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
  return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
  const schema = Schema(this);
  const desc = mergeDesc(schema.meta.description, messages);
  if (Object.keys(desc).length) schema.meta.description = desc;
  if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
    return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
  });
  if (schema.list) schema.list = schema.list.map((inner, index) => {
    return inner.i18n(mapValues(messages, (data = {}) => {
      if (Array.isArray(getInner(data))) return getInner(data)[index];
      if (Array.isArray(data)) return data[index];
      return extractKeys(data);
    }));
  });
  if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
    if (getInner(data)) return getInner(data);
    return extractKeys(data);
  }));
  if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
  return schema;
};
Schema.prototype.extra = function extra(key, value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
};
for (const key of [
  "required",
  "disabled",
  "collapse",
  "hidden",
  "loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
Schema.prototype.deprecated = function deprecated() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "deprecated",
    type: "danger"
  });
  return schema;
};
Schema.prototype.experimental = function experimental() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "experimental",
    type: "warning"
  });
  return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
  const schema = Schema(this);
  const pattern2 = pick(regexp, ["source", "flags"]);
  schema.meta = {
    ...schema.meta,
    pattern: pattern2
  };
  return schema;
};
Schema.prototype.simplify = function simplify(value) {
  if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
  if (isNullable(value)) return value;
  if (this.type === "object" || this.type === "dict") {
    const result = {};
    for (const key in value) {
      const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
      if (this.type === "dict" || !isNullable(item)) result[key] = item;
    }
    if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
    return result;
  } else if (this.type === "array" || this.type === "tuple") {
    const result = [];
    value.forEach((value2, index) => {
      const schema = this.type === "array" ? this.inner : this.list[index];
      const item = schema ? schema.simplify(value2) : value2;
      result.push(item);
    });
    return result;
  } else if (this.type === "intersect") {
    const result = {};
    for (const item of this.list) Object.assign(result, item.simplify(value));
    return result;
  } else if (this.type === "union") for (const schema of this.list) try {
    Schema.resolve(value, schema, {});
    return schema.simplify(value);
  } catch {
  }
  return value;
};
Schema.prototype.toString = function toString(inline) {
  return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra2) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    role,
    extra: extra2
  };
  return schema;
};
for (const key of [
  "default",
  "link",
  "comment",
  "description",
  "max",
  "min",
  "step"
]) Object.assign(Schema.prototype, { [key](value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
var resolvers = {};
Schema.extend = function extend(type, resolve3) {
  resolvers[type] = resolve3;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
  if (!schema) return [data];
  if (options.ignore?.(data, schema)) return [data];
  if (isNullable(data) && schema.type !== "lazy") {
    if (schema.meta.required) throw new ValidationError(`missing required value`, options);
    let current = schema;
    let fallback = schema.meta.default;
    while (current?.type === "intersect" && isNullable(fallback)) {
      current = current.list[0];
      fallback = current?.meta.default;
    }
    if (isNullable(fallback)) return [data];
    data = clone(fallback);
  }
  const callback = resolvers[schema.type];
  if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
  try {
    return callback(data, schema, options, strict);
  } catch (error) {
    if (!schema.meta.loose) throw error;
    return [schema.meta.default];
  }
};
Schema.from = function from(source) {
  if (isNullable(source)) return Schema.any();
  else if ([
    "string",
    "number",
    "boolean"
  ].includes(typeof source)) return Schema.const(source).required();
  else if (source[kSchema]) return source;
  else if (typeof source === "function") switch (source) {
    case String:
      return Schema.string().required();
    case Number:
      return Schema.number().required();
    case Boolean:
      return Schema.boolean().required();
    case Function:
      return Schema.function().required();
    default:
      return Schema.is(source).required();
  }
  else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
  const toJSON2 = () => {
    if (!schema.inner[kSchema]) {
      schema.inner = schema.builder();
      schema.inner.meta = {
        ...schema.meta,
        ...schema.inner.meta
      };
    }
    return schema.inner.toJSON();
  };
  const schema = new Schema({
    type: "lazy",
    builder,
    inner: { toJSON: toJSON2 }
  });
  return schema;
};
Schema.natural = function natural() {
  return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
  return Schema.number().step(0.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
  return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
    const date2 = new Date(value);
    if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
    return date2;
  }, true)]);
};
Schema.regExp = function regExp(flag = "") {
  return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
    try {
      return new RegExp(value, flag);
    } catch (e) {
      throw new ValidationError(e.message, options);
    }
  }, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
  return Schema.union([
    Schema.is(ArrayBuffer),
    Schema.is(SharedArrayBuffer),
    Schema.transform(Schema.any(), (value, options) => {
      if (Binary.isSource(value)) return Binary.fromSource(value);
      throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
    }, true),
    ...encoding ? [Schema.transform(Schema.string(), (value, options) => {
      try {
        return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
      } catch (e) {
        throw new ValidationError(e.message, options);
      }
    }, true)] : []
  ]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
  if (!schema.inner[kSchema]) {
    schema.inner = schema.builder();
    schema.inner.meta = {
      ...schema.meta,
      ...schema.inner.meta
    };
  }
  return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
  return [data];
});
Schema.extend("never", (data, _, options) => {
  throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
  if (deepEqual(data, value)) return [value];
  throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
  const { max = Infinity, min = -Infinity } = meta;
  if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
  if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
  if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
  if (meta.pattern) {
    const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
    if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
  }
  checkWithinRange(data.length, meta, "string length", options);
  return [data];
});
function decimalShift(data, digits) {
  const str = data.toString();
  if (str.includes("e")) return data * Math.pow(10, digits);
  const index = str.indexOf(".");
  if (index === -1) return data * Math.pow(10, digits);
  const frac = str.slice(index + 1);
  const integer = str.slice(0, index);
  if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
  return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
  step = Math.abs(step);
  if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
  const index = step.toString().indexOf(".");
  const digits = step.toString().slice(index + 1).length;
  return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
  if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
  checkWithinRange(data, meta, "number", options);
  const { step } = meta;
  if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
  return [data];
});
Schema.extend("boolean", (data, _, options) => {
  if (typeof data === "boolean") return [data];
  throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
  let value = 0, keys = [];
  if (typeof data === "number") {
    value = data;
    for (const key in bits) if (data & bits[key]) keys.push(key);
  } else if (Array.isArray(data)) {
    keys = data;
    for (const key of keys) {
      if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
      if (key in bits) value |= bits[key];
    }
  } else throw new ValidationError(`expected number or array but got ${data}`, options);
  if (value === meta.default) return [value];
  return [value, keys];
});
Schema.extend("function", (data, _, options) => {
  if (typeof data === "function") return [data];
  throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
  if (typeof constructor === "function") {
    if (data instanceof constructor) return [data];
    throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
  } else {
    if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
    let prototype = Object.getPrototypeOf(data);
    while (prototype) {
      if (prototype.constructor?.name === constructor) return [data];
      prototype = Object.getPrototypeOf(prototype);
    }
    throw new ValidationError(`expected ${constructor} but got ${data}`, options);
  }
});
function property(data, key, schema, options) {
  try {
    const [value, adapted] = Schema.resolve(data[key], schema, {
      ...options,
      path: [...options.path || [], key]
    });
    if (adapted !== void 0) data[key] = adapted;
    return value;
  } catch (e) {
    if (!options?.autofix) throw e;
    delete data[key];
    return schema.meta.default;
  }
}
Schema.extend("array", (data, { inner, meta }, options) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
  return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in data) {
    let rKey;
    try {
      rKey = Schema.resolve(key, sKey, options)[0];
    } catch (error) {
      if (strict) continue;
      throw error;
    }
    result[rKey] = property(data, key, inner, options);
    data[rKey] = data[key];
    if (key !== rKey) delete data[key];
  }
  return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  const result = list.map((inner, index) => property(data, index, inner, options));
  if (strict) return [result];
  result.push(...data.slice(list.length));
  return [result];
});
function merge(result, data) {
  for (const key in data) {
    if (key in result) continue;
    result[key] = data[key];
  }
}
Schema.extend("object", (data, { dict }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in dict) {
    const value = property(data, key, dict[key], options);
    if (!isNullable(value) || key in data) result[key] = value;
  }
  if (!strict) merge(result, data);
  return [result];
});
Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
  const messages = [];
  for (const inner of list) try {
    return Schema.resolve(data, inner, options, strict);
  } catch (error) {
    messages.push(error);
  }
  throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
  if (!list.length) return [data];
  let result;
  for (const inner of list) {
    const value = Schema.resolve(data, inner, options, true)[0];
    if (isNullable(value)) continue;
    if (isNullable(result)) result = value;
    else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    else if (typeof value === "object") merge(result ??= {}, value);
    else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
  }
  if (!strict && isPlainObject(data)) merge(result, data);
  return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
  const [result, adapted = data] = Schema.resolve(data, inner, options, true);
  if (preserve) return [callback(result)];
  else return [callback(result), callback(adapted)];
});
var formatters = {};
function defineMethod(name2, keys, format) {
  formatters[name2] = format;
  Object.assign(Schema, { [name2](...args) {
    const schema = new Schema({ type: name2 });
    keys.forEach((key, index) => {
      switch (key) {
        case "sKey":
          schema.sKey = args[index] ?? Schema.string();
          break;
        case "inner":
          schema.inner = Schema.from(args[index]);
          break;
        case "list":
          schema.list = args[index].map(Schema.from);
          break;
        case "dict":
          schema.dict = mapValues(args[index], Schema.from);
          break;
        case "bits":
          schema.bits = {};
          for (const key2 in args[index]) {
            if (typeof args[index][key2] !== "number") continue;
            schema.bits[key2] = args[index][key2];
          }
          break;
        case "callback": {
          const callback = schema.callback = args[index];
          callback["toJSON"] ||= () => callback.toString();
          break;
        }
        case "constructor": {
          const constructor = schema.constructor = args[index];
          if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
          break;
        }
        default:
          schema[key] = args[index];
      }
    });
    if (name2 === "object" || name2 === "dict") schema.meta.default = {};
    else if (name2 === "array" || name2 === "tuple") schema.meta.default = [];
    else if (name2 === "bitset") schema.meta.default = 0;
    return schema;
  } });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
  if (typeof constructor === "function") return constructor.name;
  else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
  if (Object.keys(dict).length === 0) return "{}";
  return `{ ${Object.entries(dict).map(([key, inner]) => {
    return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
  }).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
  const result = list.map(({ toString: format }) => format()).join(" | ");
  return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
  return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
  "inner",
  "callback",
  "preserve"
], ({ inner }, isInner) => inner.toString(isInner));

// node_modules/.pnpm/@deepseek-ai+dsh-home-paths_b68b9ced0869bd6d14d23f32c4693ca8/node_modules/@deepseek-ai/dsh-home-paths/lib/index.js
var import_node_os = require("node:os");
var import_node_path = require("node:path");
var DSH_HOME_DIR_NAME = ".dsh";
var DEFAULT_DSH_HOME_DISPLAY = `~/${DSH_HOME_DIR_NAME}`;
var DSH_HOME_ENV = "DSH_HOME";
function defaultDshHome() {
  return (0, import_node_path.join)((0, import_node_os.homedir)(), DSH_HOME_DIR_NAME);
}
function expandHomePath(path) {
  if (path === "~") return (0, import_node_os.homedir)();
  if (path.startsWith("~/") || path.startsWith("~\\")) return (0, import_node_path.join)((0, import_node_os.homedir)(), path.slice(2));
  return path;
}
function resolveDshHome(configured, env = process.env) {
  const fromEnv = env[DSH_HOME_ENV];
  return (0, import_node_path.resolve)(expandHomePath(configured ?? (fromEnv !== void 0 && fromEnv.trim().length > 0 ? fromEnv : defaultDshHome())));
}
function dshHomePath(...segments) {
  return (0, import_node_path.join)(resolveDshHome(), ...segments);
}

// src/proxy.ts
var import_node_http = __toESM(require("node:http"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_http_proxy = __toESM(require_http_proxy3(), 1);

// src/session.ts
var import_node_crypto = require("node:crypto");
var SESSION_COOKIE = "dsh_lan_session";
function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && (0, import_node_crypto.timingSafeEqual)(ba, bb);
}
function hmac(secret, payload) {
  return (0, import_node_crypto.createHmac)("sha256", secret).update(payload).digest();
}
function b64url(value) {
  return Buffer.from(value).toString("base64url");
}
function unb64url(text) {
  try {
    return Buffer.from(text, "base64url");
  } catch {
    return null;
  }
}
var SessionStore = class {
  constructor(config) {
    this.config = config;
  }
  config;
  secret = (0, import_node_crypto.randomBytes)(32);
  issue(username, now = Date.now()) {
    const expiresAt = Math.floor(now / 1e3) + this.config.sessionTtlSeconds;
    const payload = `${expiresAt}.${username}`;
    return `${b64url(payload)}.${b64url(hmac(this.secret, payload))}`;
  }
  verify(token, now = Date.now()) {
    const dot = token.lastIndexOf(".");
    if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: "malformed" };
    const payload = unb64url(token.slice(0, dot));
    if (payload === null) return { ok: false, reason: "malformed" };
    const text = payload.toString("utf8");
    const sep = text.indexOf(".");
    if (sep <= 0) return { ok: false, reason: "malformed" };
    const expiresAt = Number(text.slice(0, sep));
    if (!Number.isFinite(expiresAt)) return { ok: false, reason: "malformed" };
    const sig = unb64url(token.slice(dot + 1));
    if (sig === null) return { ok: false, reason: "malformed" };
    const expected = hmac(this.secret, text);
    if (sig.length !== expected.length || !(0, import_node_crypto.timingSafeEqual)(sig, expected)) {
      return { ok: false, reason: "tampered" };
    }
    if (expiresAt <= Math.floor(now / 1e3)) return { ok: false, reason: "expired" };
    return { ok: true, username: text.slice(sep + 1) };
  }
};
function readSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) return part.slice(eq + 1).trim();
  }
  return null;
}
function checkBasicAuth(authorization, username, password) {
  const match = /^Basic\s+(.+)$/i.exec(authorization ?? "");
  if (!match) return false;
  let decoded;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return false;
  return safeEqual(decoded.slice(0, sep), username) && safeEqual(decoded.slice(sep + 1), password);
}
var Authenticator = class {
  constructor(config) {
    this.config = config;
    this.sessions = new SessionStore(config);
  }
  config;
  sessions;
  /** Password login is active only when both username and password are set. */
  get enabled() {
    return this.config.username !== "" && this.config.password !== "";
  }
  isAuthenticated(cookieHeader, authorization) {
    if (!this.enabled) return true;
    const token = readSessionCookie(cookieHeader);
    if (token !== null && this.sessions.verify(token).ok) return true;
    return checkBasicAuth(authorization, this.config.username, this.config.password);
  }
};

// src/login.ts
function loginPage(error, sessionTtlHours) {
  const banner = error ? '<div class="error">\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5\u3002</div>' : "";
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DSH \u5C40\u57DF\u7F51\u8BBF\u95EE</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0d1117;
        color: #e6edf3;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      }
      .card {
        width: min(92vw, 360px);
        padding: 32px 28px;
        border: 1px solid #2d333b;
        border-radius: 12px;
        background: #161b22;
        box-shadow: 0 8px 32px rgba(0, 0, 0, .4);
      }
      h1 { margin: 0 0 4px; font-size: 20px; }
      .sub { margin: 0 0 20px; color: #8b949e; font-size: 13px; }
      label { display: block; margin: 14px 0 6px; font-size: 13px; color: #c9d1d9; }
      input {
        width: 100%;
        padding: 9px 11px;
        border: 1px solid #30363d;
        border-radius: 8px;
        background: #0d1117;
        color: #e6edf3;
        font-size: 14px;
      }
      input:focus { outline: none; border-color: #2f81f7; }
      button {
        width: 100%;
        margin-top: 22px;
        padding: 10px;
        border: 0;
        border-radius: 8px;
        background: #2f81f7;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
      }
      button:hover { background: #388bfd; }
      .error {
        margin-bottom: 14px;
        padding: 9px 11px;
        border: 1px solid #f85149;
        border-radius: 8px;
        background: rgba(248, 81, 73, .12);
        color: #ff7b72;
        font-size: 13px;
      }
      .hint { margin-top: 18px; color: #8b949e; font-size: 12px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <form class="card" method="post" action="/login">
      <h1>DeepSeek Harness</h1>
      <p class="sub">\u5C40\u57DF\u7F51\u8BBF\u95EE\u9700\u767B\u5F55</p>
      ${banner}
      <label for="username">\u7528\u6237\u540D</label>
      <input id="username" name="username" autocomplete="username" required autofocus />
      <label for="password">\u5BC6\u7801</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">\u767B\u5F55</button>
      <p class="hint">\u4F1A\u8BDD\u6709\u6548\u671F ${sessionTtlHours} \u5C0F\u65F6\uFF1B\u4EE3\u7406\u670D\u52A1\u91CD\u542F\u540E\u9700\u91CD\u65B0\u767B\u5F55\u3002\u811A\u672C\u6216\u5DE5\u5177\u53EF\u4F7F\u7528 Basic Auth \u8BF7\u6C42\u5934\u8BBF\u95EE\u3002</p>
    </form>
  </body>
</html>
`;
}
function parseUrlencoded(body) {
  const out = {};
  for (const pair of body.split("&")) {
    if (pair === "") continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
    let key;
    let value;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    } catch {
      key = rawKey;
      value = rawValue;
    }
    out[key] = value;
  }
  return out;
}

// src/polyfill.ts
var RANDOM_UUID_POLYFILL = '<script>(function(){try{if(typeof crypto!=="undefined"&&crypto&&typeof crypto.randomUUID!=="function"){crypto.randomUUID=function(){var b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;var h="";for(var i=0;i<16;i++){h+=b[i].toString(16).padStart(2,"0")}return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20)}}}catch(e){}})();</script>';
function injectPolyfill(html, polyfill = RANDOM_UUID_POLYFILL) {
  const head = html.toLowerCase().indexOf("<head");
  if (head !== -1) {
    const end = html.indexOf(">", head);
    if (end !== -1) return html.slice(0, end + 1) + polyfill + html.slice(end + 1);
    return polyfill + html;
  }
  return polyfill + html;
}

// src/proxy.ts
var MAX_LOGIN_BODY_BYTES = 16 * 1024;
var UNAUTHORIZED_JSON = '{"error":"unauthorized"}';
var AUTH_REALM = "dsh-lan-proxy";
function lanAddresses(port) {
  const ips = [];
  for (const ifaces of Object.values(import_node_os2.default.networkInterfaces())) {
    for (const entry of ifaces ?? []) {
      if (entry.family === "IPv4" && !entry.internal) ips.push(entry.address);
    }
  }
  return ips.map((ip) => `http://${ip}:${port}`);
}
function startLanProxy(options) {
  const {
    listenHost,
    listenPort,
    upstreamHost,
    upstreamPort,
    username,
    password,
    sessionTtlSeconds,
    log = () => {
    }
  } = options;
  const targetOrigin = `http://${upstreamHost}:${upstreamPort}`;
  const auth = new Authenticator({ username, password, sessionTtlSeconds });
  const proxy = import_http_proxy.default.createProxyServer({
    target: targetOrigin,
    ws: true,
    changeOrigin: true
  });
  proxy.on("error", (err, _req, res) => {
    log("error", `upstream ${targetOrigin} error: ${err.message}`);
    if (res && "writeHead" in res && !res.headersSent) {
      try {
        res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
        res.end("502 Bad Gateway");
      } catch {
      }
    }
  });
  proxy.on("proxyRes", (proxyRes, _req, res) => {
    const contentType = String(proxyRes.headers["content-type"] ?? "");
    if (!contentType.includes("text/html") || proxyRes.headers["content-encoding"]) return;
    delete proxyRes.headers["content-length"];
    res.removeHeader("content-length");
    let injected = false;
    const origWrite = res.write.bind(res);
    res.write = (chunk, ...rest) => {
      if (!injected) {
        injected = true;
        const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
        chunk = Buffer.from(injectPolyfill(text, RANDOM_UUID_POLYFILL));
      }
      return origWrite(chunk, ...rest);
    };
  });
  const alignOrigin = (req) => {
    if (req.headers.origin) req.headers.origin = targetOrigin;
  };
  const redirect = (res, location) => {
    res.writeHead(302, { location });
    res.end();
  };
  const deny = (res) => {
    res.writeHead(401, {
      "content-type": "application/json",
      "www-authenticate": `Basic realm="${AUTH_REALM}"`
    });
    res.end(UNAUTHORIZED_JSON);
  };
  const handleLogin = (req, res) => {
    if (req.method === "POST") {
      let body = "";
      let tooBig = false;
      req.on("data", (chunk) => {
        body += chunk.toString("utf8");
        if (body.length > MAX_LOGIN_BODY_BYTES) tooBig = true;
      });
      req.on("end", () => {
        if (tooBig) {
          redirect(res, "/login?error=1");
          return;
        }
        if (!auth.enabled) {
          redirect(res, "/");
          return;
        }
        const form = parseUrlencoded(body);
        const credentialsOk = safeEqual(form.username ?? "", username) && safeEqual(form.password ?? "", password);
        if (!credentialsOk) {
          redirect(res, "/login?error=1");
          return;
        }
        const token = auth.sessions.issue(form.username);
        res.writeHead(302, {
          location: "/",
          "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionTtlSeconds}`
        });
        res.end();
      });
      return;
    }
    if (auth.isAuthenticated(req.headers.cookie, req.headers.authorization)) {
      redirect(res, "/");
      return;
    }
    const error = new URL(req.url ?? "/", "http://proxy.local").searchParams.has("error");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(loginPage(error, Math.max(1, Math.round(sessionTtlSeconds / 3600))));
  };
  const handleLogout = (_req, res) => {
    res.writeHead(302, {
      location: "/login",
      "set-cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    });
    res.end();
  };
  const server = import_node_http.default.createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://proxy.local").pathname;
    if (pathname === "/login") {
      handleLogin(req, res);
      return;
    }
    if (pathname === "/logout") {
      handleLogout(req, res);
      return;
    }
    if (!auth.isAuthenticated(req.headers.cookie, req.headers.authorization)) {
      if (pathname.startsWith("/api/")) {
        deny(res);
        return;
      }
      const accept = String(req.headers.accept ?? "");
      if (accept.includes("text/html")) {
        redirect(res, "/login");
        return;
      }
      deny(res);
      return;
    }
    alignOrigin(req);
    proxy.web(req, res);
  });
  const upgradedSockets = /* @__PURE__ */ new Set();
  server.on("upgrade", (req, socket, head) => {
    if (!auth.isAuthenticated(req.headers.cookie, req.headers.authorization)) {
      socket.end(`HTTP/1.1 401 Unauthorized\r
www-authenticate: Basic realm="${AUTH_REALM}"\r
Connection: close\r
\r
`);
      return;
    }
    upgradedSockets.add(socket);
    socket.once("close", () => upgradedSockets.delete(socket));
    alignOrigin(req);
    proxy.ws(req, socket, head);
  });
  const ready = new Promise((resolve3, reject) => {
    const onListenError = (err) => {
      log("error", `cannot listen on ${listenHost}:${listenPort}: ${err.code ?? err.message}`);
      reject(err);
    };
    server.once("error", onListenError);
    server.listen(listenPort, listenHost, () => {
      server.off("error", onListenError);
      server.on("error", (err) => log("error", `proxy server error: ${err.message}`));
      resolve3(server.address().port);
    });
  });
  const close = async () => {
    for (const socket of upgradedSockets) socket.destroy();
    upgradedSockets.clear();
    await new Promise((resolveClose) => {
      server.close(() => resolveClose());
      const timer = setTimeout(() => {
        server.closeAllConnections();
      }, 250);
    });
  };
  return {
    ready,
    close,
    describeUrls: (boundPort) => ({
      local: `http://127.0.0.1:${boundPort}`,
      lan: lanAddresses(boundPort)
    })
  };
}

// src/settings.ts
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");
function normalizeRuntimeSettings(raw) {
  if (typeof raw !== "object" || raw === null) return {};
  const source = raw;
  const out = {};
  if (typeof source.upstreamPort === "number" && Number.isInteger(source.upstreamPort)) {
    out.upstreamPort = source.upstreamPort;
  }
  if (typeof source.username === "string") out.username = source.username;
  if (typeof source.password === "string") out.password = source.password;
  return out;
}
var RuntimeSettingsFile = class {
  constructor(filePath) {
    this.filePath = filePath;
  }
  filePath;
  read() {
    let text;
    try {
      text = (0, import_node_fs.readFileSync)(this.filePath, "utf8");
    } catch {
      return {};
    }
    try {
      return normalizeRuntimeSettings(JSON.parse(text));
    } catch {
      return {};
    }
  }
  write(settings) {
    (0, import_node_fs.mkdirSync)((0, import_node_path2.dirname)(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    (0, import_node_fs.writeFileSync)(temp, JSON.stringify(settings, null, 2) + "\n", "utf8");
    (0, import_node_fs.renameSync)(temp, this.filePath);
  }
};
var MAX_USERNAME_LENGTH = 64;
var MAX_PASSWORD_LENGTH = 128;
function validateUpdate(payload, listenPort) {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, message: "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F\u5BF9\u8C61" };
  }
  const input = payload;
  const patch = {};
  if (input.upstreamPort !== void 0) {
    const port = input.upstreamPort;
    if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) {
      return { ok: false, message: `\u8F6C\u53D1\u76EE\u6807\u7AEF\u53E3\u65E0\u6548\uFF1A${String(port)}\uFF08\u9700\u8981 1\u201365535 \u7684\u6574\u6570\uFF09` };
    }
    if (port === listenPort) {
      return { ok: false, message: `\u8F6C\u53D1\u76EE\u6807\u7AEF\u53E3\u4E0D\u80FD\u4E0E\u76D1\u542C\u7AEF\u53E3\u76F8\u540C\uFF08\u90FD\u662F ${port}\uFF09` };
    }
    patch.upstreamPort = port;
  }
  if (input.username !== void 0) {
    if (typeof input.username !== "string") return { ok: false, message: "\u7528\u6237\u540D\u5FC5\u987B\u662F\u5B57\u7B26\u4E32" };
    if (input.username.length > MAX_USERNAME_LENGTH) {
      return { ok: false, message: `\u7528\u6237\u540D\u8FC7\u957F\uFF08\u6700\u591A ${MAX_USERNAME_LENGTH} \u4E2A\u5B57\u7B26\uFF09` };
    }
    patch.username = input.username;
  }
  if (input.password !== void 0) {
    if (typeof input.password !== "string") return { ok: false, message: "\u5BC6\u7801\u5FC5\u987B\u662F\u5B57\u7B26\u4E32" };
    if (input.password.length > MAX_PASSWORD_LENGTH) {
      return { ok: false, message: `\u5BC6\u7801\u8FC7\u957F\uFF08\u6700\u591A ${MAX_PASSWORD_LENGTH} \u4E2A\u5B57\u7B26\uFF09` };
    }
    patch.password = input.password;
  }
  if (patch.upstreamPort === void 0 && patch.username === void 0 && patch.password === void 0) {
    return { ok: false, message: "\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u4FEE\u6539" };
  }
  return {
    ok: true,
    patch
  };
}

// src/controller.ts
var PROBE_TIMEOUT_MS = 1500;
var PROBE_CACHE_MS = 3e3;
var ProxyController = class {
  constructor(opts) {
    this.opts = opts;
    this.log = opts.log;
    this.settings = new RuntimeSettingsFile(opts.settingsFile);
    this.options = { ...opts.base };
    const persisted = this.settings.read();
    if (persisted.upstreamPort !== void 0) this.options.upstreamPort = persisted.upstreamPort;
    if (persisted.username !== void 0) this.options.username = persisted.username;
    if (persisted.password !== void 0) this.options.password = persisted.password;
  }
  opts;
  handle = null;
  boundPort = null;
  probeCache = null;
  settings;
  log;
  options;
  /** Whether a persisted runtime override exists (drives the status flag). */
  persisted() {
    const current = this.settings.read();
    return current.upstreamPort !== void 0 || current.username !== void 0 || current.password !== void 0;
  }
  /**
   * Start the proxy (idempotent). Listen errors — the port is already taken,
   * e.g. by the standalone dsh-proxy — are logged loudly but never thrown, so
   * a failed forwarder can never take down the web app boot.
   */
  async start() {
    if (this.handle !== null) return;
    const log = this.log;
    const handle = startLanProxy({
      listenHost: this.options.listenHost,
      listenPort: this.options.listenPort,
      upstreamHost: this.options.upstreamHost,
      upstreamPort: this.options.upstreamPort,
      username: this.options.username,
      password: this.options.password,
      sessionTtlSeconds: this.options.sessionTtlSeconds,
      log
    });
    this.handle = handle;
    try {
      const bound = await handle.ready;
      this.boundPort = bound;
      const urls = handle.describeUrls(bound);
      log("info", `dsh-lan-proxy: listening on ${this.options.listenHost}:${bound} -> http://${this.options.upstreamHost}:${this.options.upstreamPort}`);
      log("info", `dsh-lan-proxy: \u672C\u673A\u8BBF\u95EE ${urls.local}`);
      for (const url of urls.lan) log("info", `dsh-lan-proxy: \u5C40\u57DF\u7F51\u8BBF\u95EE ${url}`);
      if (this.options.username !== "" && this.options.password !== "") {
        log("info", `dsh-lan-proxy: password login enabled (username: ${this.options.username}); sessions last ${Math.round(this.options.sessionTtlSeconds / 3600)}h and are invalidated on restart`);
      } else if (this.options.username !== "" || this.options.password !== "") {
        log("warn", "dsh-lan-proxy: password login NOT enabled \u2014 username and password must BOTH be set (only one is configured); the LAN surface is open");
      } else {
        log("warn", "dsh-lan-proxy: password login is disabled (username and password are both empty); the LAN surface is open");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("error", `dsh-lan-proxy: failed to listen on ${this.options.listenHost}:${this.options.listenPort}: ${message} \u2014 stop any other dsh-proxy on this port, or change listenPort`);
      this.handle = null;
    }
  }
  /** Stop the proxy and every upgraded socket. */
  async stop() {
    const handle = this.handle;
    this.handle = null;
    this.boundPort = null;
    if (handle !== null) await handle.close();
  }
  /** Stop and start again with the current effective options (the "restart the forwarding service" verb). */
  async restart() {
    await this.stop();
    await this.start();
  }
  /**
   * Stop the proxy AFTER the caller's response has flushed back. The stop RPC
   * answer travels through the proxy itself when the settings page is reached
   * via the LAN URL, so closing the listener before the response is written
   * would drop it; the listener is torn down shortly afterwards instead.
   * @param delayMs - grace before the listener closes (defaults to 300ms).
   * @returns the status as it will be once stopped.
   */
  stopDeferred(delayMs = 300) {
    const stopped = { ...this.status(), proxyListening: false };
    const timer = setTimeout(() => {
      void this.stop();
    }, delayMs);
    timer.unref?.();
    return stopped;
  }
  /**
   * Current read-only status for the settings page. `upstreamReachable`
   * reflects the most recent probe (false until the first probe runs).
   */
  status() {
    return {
      listenHost: this.options.listenHost,
      listenPort: this.boundPort ?? this.options.listenPort,
      proxyListening: this.boundPort !== null,
      upstreamHost: this.options.upstreamHost,
      upstreamPort: this.options.upstreamPort,
      upstreamReachable: this.probeCache?.reachable ?? false,
      username: this.options.username,
      authEnabled: this.options.username !== "" || this.options.password !== "",
      sessionTtlHours: Math.round(this.options.sessionTtlSeconds / 3600),
      persisted: this.persisted()
    };
  }
  /**
   * Status with a fresh upstream reachability probe (cached for a few
   * seconds so repeated settings-page loads do not hammer the target).
   */
  async refreshStatus() {
    await this.probeUpstream();
    return this.status();
  }
  /**
   * Probe whether the target upstream service answers HTTP. Any response —
   * even an error status — counts as reachable; only connection failures and
   * timeouts turn the light red.
   */
  async probeUpstream() {
    const now = Date.now();
    if (this.probeCache !== null && now - this.probeCache.at < PROBE_CACHE_MS) {
      return this.probeCache.reachable;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    let reachable = false;
    try {
      const res = await fetch(
        `http://${this.options.upstreamHost}:${this.options.upstreamPort}/favicon.svg`,
        { signal: controller.signal, redirect: "manual" }
      );
      reachable = true;
      await res.body?.cancel().catch(() => {
      });
    } catch {
      reachable = false;
    } finally {
      clearTimeout(timer);
    }
    this.probeCache = { at: now, reachable };
    return reachable;
  }
  /**
   * Apply an update payload: validate, persist, then restart the forwarding
   * service with the new effective options.
   * @param payload - raw RPC payload from the settings page.
   * @returns the new status, or a user-facing rejection message.
   */
  async update(payload) {
    const check = validateUpdate(payload, this.boundPort ?? this.options.listenPort);
    if (!check.ok) return { ok: false, message: check.message };
    const patch = check.patch;
    const next = { ...this.settings.read(), ...patch };
    this.settings.write(next);
    if (patch.upstreamPort !== void 0) this.options.upstreamPort = patch.upstreamPort;
    if (patch.username !== void 0) this.options.username = patch.username;
    if (patch.password !== void 0) this.options.password = patch.password;
    await this.restart();
    this.probeCache = null;
    this.log("info", "dsh-lan-proxy: settings updated via the settings page; forwarding service restarted");
    const bothSet = this.options.username !== "" && this.options.password !== "";
    const anySet = this.options.username !== "" || this.options.password !== "";
    return {
      ok: true,
      result: {
        status: await this.refreshStatus(),
        message: anySet && !bothSet ? "\u5DF2\u4FDD\u5B58\u5E76\u91CD\u542F\u8F6C\u53D1\u670D\u52A1\uFF08\u6CE8\u610F\uFF1A\u9700\u540C\u65F6\u8BBE\u7F6E\u7528\u6237\u540D\u548C\u5BC6\u7801\u624D\u4F1A\u542F\u7528\u5BC6\u7801\u767B\u5F55\uFF09" : "\u5DF2\u4FDD\u5B58\u5E76\u91CD\u542F\u8F6C\u53D1\u670D\u52A1"
      }
    };
  }
};

// src/contract.ts
var RPC_CHANNEL = "/dsh-lan-proxy";
var RPC_STATUS_ENDPOINT = "status";
var RPC_UPDATE_ENDPOINT = "update";
var RPC_START_ENDPOINT = "start";
var RPC_STOP_ENDPOINT = "stop";

// src/index.ts
var name = "dsh-lan-proxy";
var inject = ["webServer", "connection"];
var Config = Schema.object({
  listenHost: Schema.string().default("0.0.0.0"),
  listenPort: Schema.natural().max(65535).default(3081),
  upstreamHost: Schema.string().default("127.0.0.1"),
  upstreamPort: Schema.natural().max(65535).default(0),
  username: Schema.string().default(""),
  password: Schema.string().default(""),
  sessionTtlHours: Schema.natural().max(720).default(12)
});
function apply(ctx, config) {
  const resolved = Config(config ?? {});
  const log = (level, message) => {
    ctx.logger[level](message);
  };
  const controller = new ProxyController({
    base: {
      listenHost: resolved.listenHost,
      listenPort: resolved.listenPort,
      upstreamHost: resolved.upstreamHost,
      upstreamPort: resolved.upstreamPort || ctx.webServer.port || 3080,
      username: resolved.username,
      password: resolved.password,
      sessionTtlSeconds: resolved.sessionTtlHours * 3600
    },
    settingsFile: dshHomePath("dsh-lan-proxy.json"),
    log
  });
  ctx.effect(
    async () => {
      await controller.start();
      return () => controller.stop();
    },
    "dsh-lan-proxy.proxy"
  );
  ctx.effect(
    () => {
      const dispose = ctx.connection.rpc.handle(
        RPC_CHANNEL,
        async (endpoint, payload) => {
          if (endpoint === RPC_STATUS_ENDPOINT) {
            return { ok: true, value: await controller.refreshStatus() };
          }
          if (endpoint === RPC_START_ENDPOINT) {
            await controller.start();
            return { ok: true, value: await controller.refreshStatus() };
          }
          if (endpoint === RPC_STOP_ENDPOINT) {
            return { ok: true, value: controller.stopDeferred() };
          }
          if (endpoint === RPC_UPDATE_ENDPOINT) {
            const outcome = await controller.update(payload);
            if (outcome.ok) return { ok: true, value: outcome.result };
            return {
              ok: false,
              error: { code: "bad-request", message: outcome.message, details: { issues: [] } }
            };
          }
          return {
            ok: false,
            error: {
              code: "bad-request",
              message: `unknown endpoint ${JSON.stringify(endpoint)}`,
              details: { issues: [] }
            }
          };
        },
        // The channel is loopback-only: through the proxy (Host rewritten to
        // loopback) and direct loopback both pass; nothing else may mutate
        // the proxy's credentials.
        { authority: "loopback" }
      );
      return () => void dispose();
    },
    "dsh-lan-proxy.rpc"
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  lanAddresses,
  name,
  startLanProxy
});
/*! Bundled license information:

http-proxy/lib/http-proxy/passes/web-outgoing.js:
http-proxy/lib/http-proxy/passes/web-incoming.js:
  (*!
   * Array of passes.
   *
   * A `pass` is just a function that is executed on `req, res, options`
   * so that you can easily add new checks while still keeping the base
   * flexible.
   *)

http-proxy/lib/http-proxy/passes/ws-incoming.js:
  (*!
   * Array of passes.
   *
   * A `pass` is just a function that is executed on `req, socket, options`
   * so that you can easily add new checks while still keeping the base
   * flexible.
   *)

http-proxy/index.js:
  (*!
   * Caron dimonio, con occhi di bragia
   * loro accennando, tutte le raccoglie;
   * batte col remo qualunque s’adagia 
   *
   * Charon the demon, with the eyes of glede,
   * Beckoning to them, collects them all together,
   * Beats with his oar whoever lags behind
   *          
   *          Dante - The Divine Comedy (Canto III)
   *)
*/
//# sourceMappingURL=index.cjs.map
