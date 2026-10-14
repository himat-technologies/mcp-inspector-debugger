/**
 * validator.js
 * JSON-RPC 2.0 / MCP message validation.
 *
 * IMPORTANT: This module performs *basic structural* validation only. It does
 * NOT implement the full MCP specification and must not be presented as a
 * compliance checker. It recognises the common message shapes, checks the
 * JSON-RPC 2.0 envelope, verifies standard error codes and validates a handful
 * of well-known MCP method requirements.
 */

const STANDARD_ERROR_CODES = {
  "-32700": "Parse error",
  "-32600": "Invalid Request",
  "-32601": "Method not found",
  "-32602": "Invalid params",
  "-32603": "Internal error"
};

const MCP_METHOD_REQUIREMENTS = {
  "initialize": (params) => {
    if (!isPlainObject(params)) return "the initialize request should include a params object";
    if (typeof params.protocolVersion !== "string")
      return "params.protocolVersion (string) is expected";
    if (!isPlainObject(params.capabilities))
      return "params.capabilities (object) is expected";
    if (!isPlainObject(params.clientInfo))
      return "params.clientInfo (object) is expected";
    return null;
  },
  "tools/call": (params) => {
    if (!isPlainObject(params)) return "params must be an object";
    if (typeof params.name !== "string" || params.name.length === 0)
      return "params.name (string) is required for tools/call";
    if (params.arguments !== undefined && !isPlainObject(params.arguments))
      return "params.arguments must be an object when present";
    return null;
  },
  "resources/read": (params) => {
    if (!isPlainObject(params)) return "params must be an object";
    if (typeof params.uri !== "string" || params.uri.length === 0)
      return "params.uri (string) is required for resources/read";
    return null;
  },
  "resources/subscribe": (params) => {
    if (!isPlainObject(params)) return "params must be an object";
    if (typeof params.uri !== "string") return "params.uri (string) is required";
    return null;
  },
  "prompts/get": (params) => {
    if (!isPlainObject(params)) return "params must be an object";
    if (typeof params.name !== "string" || params.name.length === 0)
      return "params.name (string) is required for prompts/get";
    return null;
  }
};

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidId(id) {
  return (
    typeof id === "string" ||
    (typeof id === "number" && Number.isFinite(id)) ||
    id === null
  );
}

/** Classify a parsed JSON-RPC message. */
export function classifyMessage(msg) {
  if (!isPlainObject(msg)) return "unknown";
  const hasMethod = typeof msg.method === "string";
  const hasId = Object.prototype.hasOwnProperty.call(msg, "id");

  if (hasMethod) {
    // A message with a method and no id is a notification.
    if (!hasId) return "notification";
    return "request";
  }
  if (Object.prototype.hasOwnProperty.call(msg, "error")) return "error";
  if (Object.prototype.hasOwnProperty.call(msg, "result")) return "response";
  return "unknown";
}

/** Build an ordered list of checks for a parsed message. */
function runChecks(msg, type) {
  const checks = [];

  // --- jsonrpc version -------------------------------------------------
  if (msg.jsonrpc === "2.0") {
    checks.push({ level: "ok", title: 'JSON-RPC version', detail: 'jsonrpc is "2.0".' });
  } else if (msg.jsonrpc === undefined) {
    checks.push({
      level: "error",
      title: "Missing jsonrpc field",
      detail: 'Every JSON-RPC 2.0 message must contain "jsonrpc": "2.0".'
    });
  } else {
    checks.push({
      level: "error",
      title: "Invalid JSON-RPC version",
      detail: `Expected "2.0" but found ${JSON.stringify(msg.jsonrpc)}.`
    });
  }

  // --- message type ----------------------------------------------------
  if (type === "request") {
    checks.push({ level: "ok", title: "Message type: request", detail: "Has a method and an id." });
  } else if (type === "notification") {
    checks.push({ level: "ok", title: "Message type: notification", detail: "Has a method and no id (one-way message)." });
  } else if (type === "response") {
    checks.push({ level: "ok", title: "Message type: response", detail: "Has a result and an id." });
  } else if (type === "error") {
    checks.push({ level: "ok", title: "Message type: error response", detail: "Has an error object and an id." });
  } else {
    checks.push({
      level: "error",
      title: "Unrecognised message structure",
      detail: "A JSON-RPC message must be a request (method+id), notification (method), or response (result/error)."
    });
  }

  // --- id --------------------------------------------------------------
  const hasId = Object.prototype.hasOwnProperty.call(msg, "id");
  if (type === "notification") {
    if (hasId) {
      checks.push({
        level: "error",
        title: "Notification must not have an id",
        detail: "Notifications are one-way messages and must omit the id field."
      });
    } else {
      checks.push({ level: "ok", title: "Notification id", detail: "No id present, as expected." });
    }
  } else if (type === "request" || type === "response" || type === "error") {
    if (!hasId) {
      checks.push({
        level: "error",
        title: "Missing id",
        detail: "Requests and responses require an id."
      });
    } else if (!isValidId(msg.id)) {
      checks.push({
        level: "error",
        title: "Invalid id type",
        detail: "id must be a string, a number, or null."
      });
    } else if (msg.id === null) {
      checks.push({
        level: "warn",
        title: "id is null",
        detail: "null is a valid id but is discouraged because it can be confused with a missing id."
      });
    } else if (typeof msg.id === "number" && !Number.isInteger(msg.id)) {
      checks.push({
        level: "warn",
        title: "Fractional id",
        detail: "Non-integer numeric ids are valid but discouraged."
      });
    } else {
      checks.push({ level: "ok", title: "Valid id", detail: `id = ${JSON.stringify(msg.id)}` });
    }
  }

  // --- method ----------------------------------------------------------
  if (type === "request" || type === "notification") {
    if (typeof msg.method !== "string" || msg.method.length === 0) {
      checks.push({ level: "error", title: "Invalid method", detail: "method must be a non-empty string." });
    } else {
      checks.push({ level: "ok", title: "Method present", detail: `method = "${msg.method}"` });
      if (msg.method.startsWith("notifications/") && type === "request") {
        checks.push({
          level: "warn",
          title: "notifications/ method sent as a request",
          detail: "Methods under notifications/ are typically one-way notifications and should not expect a response."
        });
      }
      if (!msg.method.startsWith("notifications/") && type === "notification") {
        checks.push({
          level: "info",
          title: "Non-standard notification method",
          detail: "This method does not use the notifications/ prefix. It may still be valid but is not a standard MCP notification."
        });
      }
    }

    // params structure
    if (Object.prototype.hasOwnProperty.call(msg, "params")) {
      if (Array.isArray(msg.params) || isPlainObject(msg.params)) {
        checks.push({ level: "ok", title: "params structure", detail: "params is a structured value (array or object)." });
      } else {
        checks.push({
          level: "error",
          title: "Invalid params",
          detail: "params, when present, must be an object or an array."
        });
      }
    }
  }

  // --- result / error --------------------------------------------------
  if (type === "response" || type === "error") {
    const hasResult = Object.prototype.hasOwnProperty.call(msg, "result");
    const hasError = Object.prototype.hasOwnProperty.call(msg, "error");
    if (hasResult && hasError) {
      checks.push({
        level: "error",
        title: "Both result and error present",
        detail: "A response must contain exactly one of result or error, never both."
      });
    } else {
      checks.push({ level: "ok", title: "Exactly one of result/error", detail: "Response shape looks correct." });
    }
  }

  if (type === "response") {
    checks.push({ level: "ok", title: "Result present", detail: "Message contains a result value." });
  }

  if (type === "error") {
    const err = msg.error;
    if (!isPlainObject(err)) {
      checks.push({ level: "error", title: "Invalid error object", detail: "error must be an object." });
    } else {
      if (typeof err.code !== "number") {
        checks.push({ level: "error", title: "Invalid error code", detail: "error.code must be a number." });
      } else {
        const known = STANDARD_ERROR_CODES[String(err.code)];
        if (known) {
          checks.push({ level: "ok", title: "Standard error code", detail: `${err.code} — ${known}` });
        } else if (err.code >= -32099 && err.code <= -32000) {
          checks.push({ level: "ok", title: "Server-error code", detail: `${err.code} is within the reserved server-error range (-32000 to -32099).` });
        } else if (err.code >= -32768 && err.code <= -32000) {
          checks.push({ level: "info", title: "Reserved error code range", detail: `${err.code} is in the JSON-RPC reserved range but not a standard code.` });
        } else {
          checks.push({ level: "info", title: "Application error code", detail: `${err.code} is not a reserved JSON-RPC code, so it is treated as an application-specific error.` });
        }
      }
      if (typeof err.message !== "string" || err.message.length === 0) {
        checks.push({ level: "error", title: "Missing error message", detail: "error.message must be a non-empty string." });
      } else {
        checks.push({ level: "ok", title: "Error message present", detail: err.message });
      }
      if (err.data !== undefined) {
        checks.push({ level: "info", title: "Error data present", detail: "Optional error.data field found." });
      }
    }
  }

  return checks;
}

/** Method-specific MCP checks (informational, best-effort). */
function runMethodChecks(msg, type) {
  const checks = [];
  if ((type === "request" || type === "notification") && typeof msg.method === "string") {
    const requirement = MCP_METHOD_REQUIREMENTS[msg.method];
    if (requirement) {
      const problem = requirement(msg.params);
      if (problem) {
        checks.push({
          level: type === "notification" ? "info" : "warn",
          title: `MCP requirement: ${msg.method}`,
          detail: problem
        });
      } else {
        checks.push({
          level: "ok",
          title: `MCP requirement: ${msg.method}`,
          detail: "Recognised method with the expected parameter shape."
        });
      }
    } else if (!msg.method.startsWith("notifications/")) {
      checks.push({
        level: "info",
        title: "Custom method",
        detail: `"${msg.method}" is not a built-in MCP method we check. It may be valid for your server.`
      });
    }
  }
  return checks;
}

export { STANDARD_ERROR_CODES };

/**
 * Validate raw editor text.
 * @param {string} text
 * @returns {{
 *   ok: boolean,
 *   parsed: any,
 *   type: string,
 *   checks: Array<{level:string,title:string,detail:string}>,
 *   summary: object|null
 * }}
 */
export function validateMessage(text) {
  if (!text || text.trim() === "") {
    return {
      ok: false,
      parsed: null,
      type: "unknown",
      checks: [{ level: "error", title: "Empty message", detail: "Paste or write an MCP JSON-RPC message, or choose a preset." }],
      summary: null
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      parsed: null,
      type: "unknown",
      checks: [{ level: "error", title: "Invalid JSON syntax", detail: err.message }],
      summary: null
    };
  }

  const checks = [];

  if (Array.isArray(parsed)) {
    checks.push({
      level: "warn",
      title: "JSON array detected",
      detail: "MCP / JSON-RPC messages are usually single objects. Batch arrays are allowed by JSON-RPC 2.0 but are uncommon in MCP."
    });
    if (parsed.length === 0) {
      checks.push({ level: "error", title: "Empty batch", detail: "An empty array is not a valid JSON-RPC batch." });
      return finalize(false, parsed, "unknown", checks, null);
    }
    // Validate the first item as the representative message.
    const first = parsed[0];
    const type = classifyMessage(first);
    checks.push(...runChecks(first, type));
    checks.push(...runMethodChecks(first, type));
    const hasError = checks.some((c) => c.level === "error");
    return finalize(!hasError, parsed, type, checks, buildSummary(first, type, checks));
  }

  if (!isPlainObject(parsed)) {
    checks.push({
      level: "error",
      title: "Invalid message root",
      detail: "A JSON-RPC message must be a JSON object."
    });
    return finalize(false, parsed, "unknown", checks, null);
  }

  const type = classifyMessage(parsed);
  checks.push(...runChecks(parsed, type));
  checks.push(...runMethodChecks(parsed, type));

  const hasError = checks.some((c) => c.level === "error");
  return finalize(!hasError, parsed, type, checks, buildSummary(parsed, type, checks));
}

function finalize(ok, parsed, type, checks, summary) {
  return { ok, parsed, type, checks, summary };
}

/** Human-readable summary of a validated message. */
function buildSummary(msg, type, checks) {
  const hasId = Object.prototype.hasOwnProperty.call(msg, "id");
  let resultStatus = "—";
  if (type === "response") resultStatus = "Success (result present)";
  else if (type === "error") resultStatus = `Error ${msg.error && msg.error.code !== undefined ? msg.error.code : ""}`.trim();

  let protocolVersion = "—";
  if (msg.params && typeof msg.params.protocolVersion === "string") protocolVersion = msg.params.protocolVersion;
  else if (msg.result && typeof msg.result.protocolVersion === "string") protocolVersion = msg.result.protocolVersion;
  else if (type === "notification") protocolVersion = "N/A (notification)";

  let paramsSummary = "—";
  if (Object.prototype.hasOwnProperty.call(msg, "params")) {
    if (Array.isArray(msg.params)) paramsSummary = `Array (${msg.params.length} item${msg.params.length === 1 ? "" : "s"})`;
    else if (isPlainObject(msg.params)) {
      const keys = Object.keys(msg.params);
      paramsSummary = keys.length ? `Object { ${keys.join(", ")} }` : "Empty object";
    }
  }

  return {
    type,
    jsonrpc: msg.jsonrpc !== undefined ? String(msg.jsonrpc) : "missing",
    id: hasId ? JSON.stringify(msg.id) : "—",
    method: typeof msg.method === "string" ? msg.method : "—",
    resultStatus,
    paramsSummary,
    protocolVersion,
    errorCount: checks.filter((c) => c.level === "error").length,
    warningCount: checks.filter((c) => c.level === "warn").length
  };
}
