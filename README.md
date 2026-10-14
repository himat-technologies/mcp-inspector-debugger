# MCP Inspector & Protocol Message Debugger

A lightweight, **local-first** web tool for working with MCP (Model Context
Protocol) / JSON-RPC 2.0 messages. Paste a message, validate its structure,
inspect the parsed details, auto-redact secrets, visualise the protocol flow,
and generate TypeScript or Python integration code — all in your browser.

Built with plain **HTML, CSS and vanilla JavaScript**, bundled with
[Vite](https://vitejs.dev/) for a simple local dev server. No backend, no
database, no accounts, no API keys, and **no message content is ever sent over
the network**.

> **Live demo:** [https://himat.tech/free-tools/mcp-inspector-debugger](https://himat.tech/free-tools/mcp-inspector-debugger)

---

## Table of contents

1. [Features](#features)
2. [Technologies used](#technologies-used)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [How to run locally](#how-to-run-locally)
6. [How to use each feature](#how-to-use-each-feature)
7. [Example MCP JSON-RPC messages](#example-mcp-json-rpc-messages)
8. [Validation limitations](#validation-limitations)
9. [Secret redaction limitations](#secret-redaction-limitations)
10. [Project folder structure](#project-folder-structure)
11. [Privacy and security notes](#privacy-and-security-notes)
12. [Troubleshooting](#troubleshooting)
13. [Building for production](#building-for-production)
14. [License](#license)
15. [HiMat Technologies](#himat-technologies)

---

## Features

- **MCP JSON-RPC message editor** — a large editable text area with
  **Format**, **Validate**, **Copy**, **Export**, and **Clear** controls.
- **12 quick MCP presets** — initialize, notifications/initialized, tools,
  resources, prompts, and a method-not-found error, ready to load and edit.
- **Protocol validation** — recognises requests, responses, notifications and
  error responses; checks the JSON-RPC envelope, id types, method/params
  structure, result/error structure and standard error codes. Results are shown
  as colour-coded diagnostics (green = pass, amber = warning, red = error,
  blue = information).
- **Parsed message details** — a plain-English summary of the message type,
  version, id, method, result/error status, parameters and detected protocol
  version.
- **Secret detection & auto-redaction** — one click replaces obvious secrets
  (OpenAI `sk-` keys, GitHub `ghp_` tokens, Bearer tokens, and sensitive field
  names such as `apiKey`, `access_token`, `client_secret`, …) with
  `[REDACTED]`, while keeping the JSON valid.
- **TypeScript & Python code generator** — generates a snippet for the *current*
  message using the official MCP SDKs, with install instructions and basic error
  handling. Each language has a **Copy Code** button.
- **Protocol sequence diagram** — a lightweight HTML/CSS flow (Client →
  Request → Server → Response → Client) that changes for notifications,
  responses and errors.
- **Responsive UI** — works on desktop and mobile; clean cards, readable
  typography, and restrained colours.

---

## Technologies used

- **HTML5** — page structure.
- **CSS3** — styling (no framework, no preprocessor).
- **Vanilla JavaScript (ES modules)** — all application logic.
- **Vite** — local development server and production bundler (only dependency).
- **Official MCP SDKs** — referenced *only* inside the generated example code
  (`@modelcontextprotocol/sdk` for TypeScript, `mcp` for Python). They are **not**
  installed or executed by this project.

---

## Prerequisites

- [Node.js](https://nodejs.org/) **18 or newer** (includes `npm`). Vite 5
  requires Node 18+.
- A modern browser (Chrome, Edge, Firefox, or Safari).
- No global packages are required.

Check your versions:

```bash
node --version
npm --version
```

---

## Installation

Open a terminal in the project folder and install the single dev dependency:

```bash
npm install
```

That's it — nothing else to configure.

---

## How to run locally

Start the development server:

```bash
npm run dev
```

Vite prints a local URL, by default:

```text
  VITE v5.x.x  ready in ... ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **http://localhost:5173/** in your browser. The page reloads automatically
when you edit files. Press `Ctrl + C` in the terminal to stop the server.

> The tool is a pure static site. You could also open `index.html` through any
> static web server, but the Vite dev server is the recommended workflow.

---

## How to use each feature

### 1. Load a preset
Click any chip under **Quick MCP Presets** (grouped as Lifecycle, Tools,
Resources, Prompts, Errors). The editor is filled with a realistic message and
validation runs immediately.

### 2. Edit the message
Type or paste JSON directly into the editor. The **status line** above the
editor shows character/line count and whether the JSON is currently valid.
Pressing `Tab` inserts two spaces instead of moving focus.

### 3. Validate
Click **Validate Message**. The **Validation Diagnostics** panel lists each
check with a colour-coded icon, and **Parsed Message Details** shows a summary.
The flow diagram updates at the same time.

### 4. Format / Copy / Export / Clear
- **Format JSON** — pretty-prints the current JSON (2-space indent).
- **Copy Message** — copies the editor content to the clipboard.
- **Export JSON** — downloads the editor content as `mcp-message.json`
  (refuses to export invalid JSON).
- **Clear Editor** — empties the editor and resets all panels.

### 5. Auto-redact secrets
Click **Auto-Redact Secrets**. Detected secret *values* are replaced with
`[REDACTED]` and a notice reports how many were found. Review the result before
copying or exporting. (See the limitations below.)

### 6. Generate code
Use the **TypeScript** / **Python** tabs in the **Code Generator** card. The
snippet is regenerated from the current message. Click **Copy Code** to copy it.
Install instructions are included as comments in the generated code:
- TypeScript: `npm install @modelcontextprotocol/sdk`
- Python: `pip install mcp`

### 7. Read the flow diagram
The **Protocol Flow Diagram** card shows the client/server exchange for the
current message:
- **Requests** show a request path and a response path back to the client.
- **Notifications** show a single one-way arrow (no reply).
- **Errors** show a failed/error-response path.
- **Responses** show the reply coming back from the server.

---

## Example MCP JSON-RPC messages

**`initialize` request**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "roots": { "listChanged": true } },
    "clientInfo": { "name": "example-client", "version": "1.0.0" }
  }
}
```

**`initialize` response**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": { "listChanged": true } },
    "serverInfo": { "name": "example-server", "version": "1.0.0" }
  }
}
```

**`notifications/initialized` (notification — no id)**

```json
{ "jsonrpc": "2.0", "method": "notifications/initialized" }
```

**`tools/call` request**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": { "name": "get_weather", "arguments": { "location": "Bengaluru" } }
}
```

**Method-not-found error response**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "error": { "code": -32601, "message": "Method not found" }
}
```

These are the same examples available as preset buttons in the UI.

---

## Validation limitations

> **This tool performs basic structural validation only. It is NOT a full MCP
> specification compliance checker.**

What it **can** verify:

- That the text is valid JSON.
- That the JSON-RPC envelope has `"jsonrpc": "2.0"`.
- That the message is shaped like a request, response, notification or error.
- That `id` is a valid type (string, number, or null) and warns about `null` or
  fractional ids.
- That `method` is a non-empty string, and that `params` (if present) is an
  object or array.
- That a response contains exactly one of `result` / `error`.
- That an error object has a numeric `code` and a string `message`, and whether
  the code is a standard JSON-RPC code (`-32700`, `-32600`, `-32601`, `-32602`,
  `-32603`), a reserved server-error code, or application-specific.
- A best-effort check of a few well-known MCP methods (`initialize`,
  `tools/call`, `resources/read`, `resources/subscribe`, `prompts/get`).

What it **cannot** verify:

- Full JSON Schemas for every MCP type (e.g. the exact shape of a tool
  `inputSchema`, resource contents, prompt messages, capability objects, etc.).
- Semantic correctness or whether results match a request.
- Authentication, transport, or session state.
- The full list of MCP methods and their exact required/optional fields.

**Definite errors** (red) are reported separately from **informational
warnings** (amber) and **informational notes** (blue). Treat green checks as
"this aspect looks structurally fine", not as a guarantee of correctness.

---

## Secret redaction limitations

> **Pattern matching cannot detect every secret.** Always review a redacted
> message before sharing it.

What it detects:

- **OpenAI-style keys** — strings beginning with `sk-` (including `sk-proj-`).
- **GitHub tokens** — `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`.
- **Bearer tokens** — `Bearer <token>` sequences.
- **Slack tokens** — `xoxb-`, `xoxa-`, `xoxp-`, `xoxr-`, `xoxs-`.
- **AWS access key ids** — `AKIA...`.
- **Google API keys** — `AIza...`.
- **Sensitive field names** — values under keys such as `apiKey`, `api_key`,
  `secret`, `token`, `password`, `access_token`, `client_secret`,
  `authorization`, `private_key`, `credential`, etc.
- Redacts only the **values**, not whole objects, and keeps the JSON valid.

What it **cannot** guarantee:

- Unusual, custom, or weakly-identified secret formats.
- Secrets split across multiple fields, base64-encoded, or obfuscated.
- Non-string secrets.

Redaction re-serialises the JSON, so insignificant whitespace/formatting may be
normalised (the data itself is unchanged except for redacted values). **No
payload is ever uploaded** — redaction runs entirely in your browser.

---

## Project folder structure

```text
mcp-inspector-debugger/
├── index.html            # Page markup and layout
├── package.json          # Scripts and the single dev dependency (Vite)
├── README.md             # This file
├── LICENSE               # MIT license
├── .gitignore
├── src/
│   ├── main.js           # UI wiring and event handling
│   ├── styles.css        # All styling
│   ├── presets.js        # Example MCP messages
│   ├── validator.js      # JSON-RPC / MCP structural validation
│   ├── redactor.js       # Secret detection and redaction
│   ├── code-generator.js # TypeScript / Python snippet generation
│   └── diagram.js        # HTML/CSS protocol flow diagram
└── public/
    └── favicon.svg       # Site icon
```

Keeping validation, redaction, code generation and diagram logic in separate
modules keeps the UI code small and the logic easy to test or modify.

---

## Privacy and security notes

- **Everything runs in the browser.** There is no backend and no server that
  receives your messages.
- **No external network requests** are made by the application: no analytics, no
  tracking, no ads, no fonts or scripts loaded from CDNs.
- If you open the page with the browser DevTools Network tab, you will only see
  your own local files being loaded.
- **Nothing is persisted.** Messages are not written to `localStorage`,
  `sessionStorage`, IndexedDB, or cookies — only held in memory while the tab is
  open.
- **Never paste real production secrets** into any online tool you do not fully
  trust. This tool is local, but you should still treat credentials carefully;
  export redacted copies only.
- The generated code is **illustrative and has not been executed or tested**
  against a real MCP server.

---

## Troubleshooting

**`npm install` fails or `vite` is not found**
- Ensure Node.js 18+ is installed (`node --version`).
- Delete `node_modules` and `package-lock.json`, then run `npm install` again.

**Port 5173 is already in use**
- Vite automatically picks the next free port and prints it. Or specify one:
  ```bash
  npm run dev -- --port 5175
  ```

**The page is blank or an action does nothing**
- Open the browser DevTools console (F12) and check for errors.
- Make sure you started the server with `npm run dev` and opened the printed
  local URL (not the `index.html` file path directly).

**"Copy" does nothing**
- Some browsers block the clipboard API outside a secure context. Use
  `http://localhost` (which is treated as secure). A manual fallback is used if
  the API is unavailable.

**"Format" / "Export" refuses my message**
- These require valid JSON. Click **Validate Message** to see the syntax error,
  fix it, then try again.

**`npm audit` reports vulnerabilities**
- They come from Vite's bundled dev-only tooling and do not affect the built
  static site. Avoid `npm audit fix --force`, which can instal breaking major
  versions.

---

## Building for production

Create an optimised static build:

```bash
npm run build
```

Output is written to the `dist/` folder. Preview it locally with:

```bash
npm run preview
```

You can deploy the contents of `dist/` to any static host (GitHub Pages,
Netlify, Cloudflare Pages, etc.). Because the app is fully client-side, no
server runtime is required.

---

## License

Released under the **MIT License**. See [LICENSE](./LICENSE).

---

## HiMat Technologies

This project is provided as a free developer tool by **HiMat Technologies**.

- Website: [https://himat.co.in](https://himat.co.in)
- Live Demo: [https://himat.tech/free-tools/mcp-inspector-debugger](https://himat.tech/free-tools/mcp-inspector-debugger)
- GitHub: [https://github.com/Himat-developers](https://github.com/Himat-developers)
- LinkedIn: [https://www.linkedin.com/in/himat-technologies-14b1051b4](https://www.linkedin.com/in/himat-technologies-14b1051b4)
- Instagram: [https://www.instagram.com/himat_technologies?stkn=djdmcGxweWtwYWI0](https://www.instagram.com/himat_technologies?stkn=djdmcGxweWtwYWI0)
- Facebook: [https://www.facebook.com/people/Himat-technologies/61593829197445/](https://www.facebook.com/people/Himat-technologies/61593829197445/)
- Email: [info@himat.co.in](mailto:info@himat.co.in)
- Contact: [+91 94452 34023](tel:+919445234023)

Inspired by the original free tool at
[https://himat.tech/free-tools/mcp-inspector-debugger](https://himat.tech/free-tools/mcp-inspector-debugger).
