/**
 * main.js
 * Wires the UI together. All logic runs locally in the browser.
 */

import "./styles.css";
import { PRESETS, presetToText } from "./presets.js";
import { validateMessage } from "./validator.js";
import { detectAndRedact } from "./redactor.js";
import { generateCodeFromText } from "./code-generator.js";
import { renderDiagram } from "./diagram.js";

/* ---------------- element refs ---------------- */
const editor = document.getElementById("editor");
const presetsEl = document.getElementById("presets");
const noticeEl = document.getElementById("notice");
const editorStatus = document.getElementById("editorStatus");
const diagnosticsEl = document.getElementById("diagnostics");
const summaryEl = document.getElementById("summary");
const diagramEl = document.getElementById("diagram");
const codeOutput = document.getElementById("codeOutput");
const codeNote = document.getElementById("codeNote");

const btnFormat = document.getElementById("btnFormat");
const btnValidate = document.getElementById("btnValidate");
const btnCopy = document.getElementById("btnCopy");
const btnExport = document.getElementById("btnExport");
const btnRedact = document.getElementById("btnRedact");
const btnClear = document.getElementById("btnClear");
const btnCopyCode = document.getElementById("btnCopyCode");
const tabs = Array.from(document.querySelectorAll(".tab"));

let currentLang = "typescript";
let noticeTimer = null;

/* ---------------- helpers ---------------- */
function showNotice(message, kind = "info") {
  noticeEl.hidden = false;
  noticeEl.className = `notice is-${kind}`;
  noticeEl.textContent = message;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    noticeEl.hidden = true;
  }, 6000);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    temp.remove();
    return ok;
  }
}

function downloadJson(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- presets ---------------- */
function buildPresets() {
  let lastGroup = null;
  PRESETS.forEach((preset) => {
    if (preset.group !== lastGroup) {
      const label = document.createElement("span");
      label.className = "preset-group-label";
      label.dataset.group = preset.group.toLowerCase();
      label.textContent = preset.group;
      presetsEl.appendChild(label);
      lastGroup = preset.group;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.textContent = preset.label;
    btn.dataset.preset = preset.id;
    btn.dataset.group = preset.group.toLowerCase();
    btn.addEventListener("click", () => loadPreset(preset));
    presetsEl.appendChild(btn);
  });
}

function loadPreset(preset) {
  editor.value = presetToText(preset);
  runValidation({ silent: true });
  updateLive();
  editor.focus();
  showNotice(`Loaded preset: ${preset.label}`, "success");
}

/* ---------------- diagnostics ---------------- */
function renderDiagnostics(result) {
  diagnosticsEl.innerHTML = "";

  const errorCount = result.checks.filter((c) => c.level === "error").length;
  const warnCount = result.checks.filter((c) => c.level === "warn").length;

  const summary = document.createElement("div");
  summary.className = `diag-summary ${result.ok ? "ok" : "error"}`;
  if (result.ok && warnCount === 0) {
    summary.textContent = "All checks passed.";
  } else if (result.ok) {
    summary.textContent = `Passed with ${warnCount} warning${warnCount === 1 ? "" : "s"}.`;
  } else {
    summary.textContent = `${errorCount} error${errorCount === 1 ? "" : "s"} found.`;
  }
  diagnosticsEl.appendChild(summary);

  const icons = { ok: "✓", warn: "!", error: "✕", info: "i" };
  result.checks.forEach((check) => {
    const row = document.createElement("div");
    row.className = `check ${check.level}`;
    row.innerHTML = `
      <span class="icon">${icons[check.level] || "i"}</span>
      <span class="body">
        <span class="check-title">${escapeHtml(check.title)}</span>
        <span class="check-detail">${escapeHtml(check.detail || "")}</span>
      </span>`;
    diagnosticsEl.appendChild(row);
  });
}

function renderSummary(result) {
  if (!result.summary) {
    summaryEl.innerHTML = '<p class="empty-state">No summary available for this message.</p>';
    return;
  }
  const s = result.summary;
  const typeClass = ["request", "response", "notification", "error"].includes(s.type) ? s.type : "unknown";
  summaryEl.innerHTML = `
    <table class="summary-table">
      <tbody>
        <tr><th>Message type</th><td><span class="type-pill ${typeClass}">${escapeHtml(s.type)}</span></td></tr>
        <tr><th>JSON-RPC version</th><td>${escapeHtml(s.jsonrpc)}</td></tr>
        <tr><th>Request ID</th><td>${escapeHtml(s.id)}</td></tr>
        <tr><th>Method</th><td>${escapeHtml(s.method)}</td></tr>
        <tr><th>Result / error status</th><td>${escapeHtml(s.resultStatus)}</td></tr>
        <tr><th>Parameters</th><td>${escapeHtml(s.paramsSummary)}</td></tr>
        <tr><th>Detected protocol version</th><td>${escapeHtml(s.protocolVersion)}</td></tr>
      </tbody>
    </table>`;
}

/* ---------------- code + diagram (live) ---------------- */
function updateCode() {
  codeOutput.textContent = generateCodeFromText(editor.value, currentLang);
  codeNote.textContent =
    currentLang === "python"
      ? "Generated Python example using the official `mcp` SDK. Install with: pip install mcp. Not executed or tested against a real server."
      : "Generated TypeScript example using `@modelcontextprotocol/sdk`. Install with: npm install @modelcontextprotocol/sdk. Not executed or tested against a real server.";
}

function updateLive() {
  updateCode();
  let parsed = null;
  let type = "unknown";
  try {
    parsed = JSON.parse(editor.value);
    const r = validateMessage(editor.value);
    type = r.type;
  } catch {
    parsed = null;
  }
  renderDiagram(diagramEl, parsed, type);
  updateEditorStatus();
}

function updateEditorStatus() {
  const text = editor.value;
  if (!text.trim()) {
    editorStatus.textContent = "Ready";
    return;
  }
  const lines = text.split("\n").length;
  let status = `${text.length} chars · ${lines} lines`;
  try {
    JSON.parse(text);
    status += " · JSON valid";
  } catch {
    status += " · JSON invalid";
  }
  editorStatus.textContent = status;
}

/* ---------------- actions ---------------- */
function runValidation(opts = {}) {
  const result = validateMessage(editor.value);
  renderDiagnostics(result);
  renderSummary(result);
  renderDiagram(diagramEl, result.parsed, result.type);

  if (!opts.silent) {
    if (result.ok) {
      showNotice("Message is structurally valid.", "success");
    } else {
      showNotice("Validation found problems. See diagnostics.", "error");
    }
  }
  return result;
}

function formatJson() {
  if (!editor.value.trim()) {
    showNotice("Nothing to format.", "warning");
    return;
  }
  try {
    const parsed = JSON.parse(editor.value);
    editor.value = JSON.stringify(parsed, null, 2);
    updateLive();
    showNotice("JSON formatted.", "success");
  } catch (err) {
    showNotice(`Cannot format: ${err.message}`, "error");
  }
}

async function copyMessage() {
  if (!editor.value.trim()) {
    showNotice("Nothing to copy.", "warning");
    return;
  }
  const ok = await copyToClipboard(editor.value);
  showNotice(ok ? "Message copied to clipboard." : "Copy failed — select and copy manually.", ok ? "success" : "error");
}

function exportJson() {
  if (!editor.value.trim()) {
    showNotice("Nothing to export.", "warning");
    return;
  }
  try {
    JSON.parse(editor.value);
  } catch (err) {
    showNotice(`Cannot export invalid JSON: ${err.message}`, "error");
    return;
  }
  downloadJson("mcp-message.json", editor.value);
  showNotice("Exported mcp-message.json", "success");
}

function autoRedact() {
  const result = detectAndRedact(editor.value);
  if (!result.ok) {
    showNotice(result.error || "Redaction failed.", "error");
    return;
  }
  editor.value = result.text;
  updateLive();
  runValidation({ silent: true });
  if (result.count === 0) {
    showNotice("No obvious secrets detected. Pattern matching cannot find every secret.", "warning");
  } else {
    showNotice(
      `Redacted ${result.count} potential secret${result.count === 1 ? "" : "s"}. Review the result — pattern matching is not exhaustive.`,
      "success"
    );
  }
}

function clearEditor() {
  editor.value = "";
  diagnosticsEl.innerHTML = '<p class="empty-state">Validate a message to see diagnostics here.</p>';
  summaryEl.innerHTML = '<p class="empty-state">Message details will appear after validation.</p>';
  renderDiagram(diagramEl, null, "unknown");
  updateCode();
  updateEditorStatus();
  editor.focus();
  showNotice("Editor cleared.", "info");
}

async function copyCode() {
  const ok = await copyToClipboard(codeOutput.textContent);
  showNotice(ok ? "Code copied to clipboard." : "Copy failed — select and copy manually.", ok ? "success" : "error");
}

/* ---------------- events ---------------- */
btnFormat.addEventListener("click", formatJson);
btnValidate.addEventListener("click", () => runValidation());
btnCopy.addEventListener("click", copyMessage);
btnExport.addEventListener("click", exportJson);
btnRedact.addEventListener("click", autoRedact);
btnClear.addEventListener("click", clearEditor);
btnCopyCode.addEventListener("click", copyCode);

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentLang = tab.dataset.lang;
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    updateCode();
  });
});

let inputTimer = null;
editor.addEventListener("input", () => {
  updateEditorStatus();
  if (inputTimer) clearTimeout(inputTimer);
  inputTimer = setTimeout(updateLive, 200);
});

editor.addEventListener("keydown", (event) => {
  // Tab inserts two spaces instead of moving focus.
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    updateEditorStatus();
  }
});

/* ---------------- init ---------------- */
buildPresets();
renderDiagram(diagramEl, null, "unknown");
updateCode();
updateEditorStatus();
