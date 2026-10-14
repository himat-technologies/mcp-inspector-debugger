/**
 * diagram.js
 * Build a lightweight HTML/CSS protocol flow diagram for the current message.
 * No external libraries or services are used.
 */

import { classifyMessage } from "./validator.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function node(kind, title, subtitle) {
  const sub = subtitle ? `<span class="sub">${escapeHtml(subtitle)}</span>` : "";
  return `<div class="flow-node ${kind}">${escapeHtml(title)}${sub}</div>`;
}

function arrow(direction, label, kind) {
  const symbol = direction === "down" ? "&darr;" : "&uarr;";
  return `<div class="flow-arrow ${kind || ""}"><span>${symbol}</span><span class="label">${escapeHtml(label)}</span></div>`;
}

/**
 * Render the diagram into the given container element.
 * @param {HTMLElement} container
 * @param {object|null} parsed
 * @param {string} type one of request|response|notification|error|unknown
 */
export function renderDiagram(container, parsed, type) {
  if (!parsed || typeof parsed !== "object") {
    container.innerHTML =
      '<p class="diagram-empty">Enter a valid message (or pick a preset) to see the protocol flow.</p>';
    return;
  }

  const detected = type && type !== "unknown" ? type : classifyMessage(parsed);
  const method = typeof parsed.method === "string" ? parsed.method : null;

  let html = '<div class="flow">';

  if (detected === "notification") {
    html += node("client", "MCP Client", "sender");
    html += arrow("down", `notification: ${method || "method"} (one-way, no response)`, "oneway");
    html += node("server", "MCP Server", "handles notification");
    html += '<p class="diagram-empty" style="margin-top:6px;">Notifications do not receive a reply.</p>';
  } else if (detected === "request") {
    html += node("client", "MCP Client", "sends request");
    html += arrow("down", `request: ${method || "method"}`, "request");
    html += node("server", "MCP Server", "processes request");
    html += arrow("up", "response (result) ", "response");
    html += node("client", "MCP Client", "receives response");
  } else if (detected === "error") {
    const code = parsed.error && parsed.error.code !== undefined ? parsed.error.code : "?";
    const message = parsed.error && parsed.error.message ? parsed.error.message : "error";
    html += node("client", "MCP Client", "sent request");
    html += arrow("down", "request", "request");
    html += node("server", `MCP Server`, "failed to process");
    html += arrow("up", `error ${code}: ${message}`, "failed");
    html += node("client", "MCP Client", "handles error");
  } else if (detected === "response") {
    html += node("client", "MCP Client", "sent request");
    html += arrow("down", "request", "request");
    html += node("server", "MCP Server", "produced result");
    html += arrow("up", "response (result)", "response");
    html += node("client", "MCP Client", "receives response");
  } else {
    html += node("client", "MCP Client", "");
    html += arrow("down", "JSON-RPC message", "");
    html += node("server", "MCP Server", "");
  }

  html += "</div>";
  container.innerHTML = html;
}
