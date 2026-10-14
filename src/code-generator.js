/**
 * code-generator.js
 * Generate beginner-friendly MCP integration snippets (TypeScript / Python)
 * from the message currently in the editor.
 *
 * The generated examples are illustrative only. They have NOT been executed or
 * tested against a real MCP server. Review and adapt package paths, transport
 * configuration and error handling for your own project.
 */

import { classifyMessage } from "./validator.js";

function safeParams(parsed) {
  return parsed && typeof parsed === "object" && parsed.params && typeof parsed.params === "object"
    ? parsed.params
    : {};
}

function jsonBlock(value, indent) {
  const text = JSON.stringify(value, null, 2);
  const pad = " ".repeat(indent);
  return text.split("\n").join("\n" + pad);
}

/* ------------------------------------------------------------------ *
 * TypeScript
 * ------------------------------------------------------------------ */

function tsRequestSnippet(method, params) {
  const call = tsHighLevelCall(method, params);
  return `// Install the official SDK:
//   npm install @modelcontextprotocol/sdk
//
// This example connects to a local MCP server over stdio and performs a
// "${method}" call. It is illustrative and has not been run against a real server.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.js"],
  });

  const client = new Client({ name: "mcp-inspector-client", version: "1.0.0" });

  try {
    await client.connect(transport);

${call}
  } catch (error) {
    console.error("MCP request failed:", error);
  } finally {
    await client.close();
  }
}

main();`;
}

function tsHighLevelCall(method, params) {
  const pad = "    ";
  switch (method) {
    case "initialize":
      return `${pad}// client.connect() performs the initialize handshake for you.
${pad}console.log("Connected and initialised.");`;
    case "notifications/initialized":
      return `${pad}// The SDK sends notifications/initialized automatically after connect().
${pad}console.log("Initialised notification is handled by the SDK.");`;
    case "tools/list":
      return `${pad}const tools = await client.listTools();
${pad}console.log(tools);`;
    case "tools/call": {
      const name = params.name || "tool_name";
      const args = params.arguments || {};
      return `${pad}const result = await client.callTool({
${pad}  name: ${JSON.stringify(name)},
${pad}  arguments: ${jsonBlock(args, pad.length + 2)},
${pad}});
${pad}console.log(result);`;
    }
    case "resources/list":
      return `${pad}const resources = await client.listResources();
${pad}console.log(resources);`;
    case "resources/read": {
      const uri = params.uri || "file:///example/readme.md";
      return `${pad}const resource = await client.readResource({ uri: ${JSON.stringify(uri)} });
${pad}console.log(resource);`;
    }
    case "prompts/list":
      return `${pad}const prompts = await client.listPrompts();
${pad}console.log(prompts);`;
    case "prompts/get": {
      const name = params.name || "prompt_name";
      const args = params.arguments || {};
      return `${pad}const prompt = await client.getPrompt({
${pad}  name: ${JSON.stringify(name)},
${pad}  arguments: ${jsonBlock(args, pad.length + 2)},
${pad}});
${pad}console.log(prompt);`;
    }
    default:
      return `${pad}// Custom method: send an explicit request and provide a result schema.
${pad}const result = await client.request(
${pad}  { method: ${JSON.stringify(method)}, params: ${jsonBlock(params, pad.length + 2)} },
${pad}  /* result schema, e.g. z.object({}).passthrough() using zod */
${pad});
${pad}console.log(result);`;
  }
}

function tsResponseSnippet(parsed, type) {
  const label = type === "error" ? "error response" : "response";
  return `// Install the official SDK:
//   npm install @modelcontextprotocol/sdk
//
// This example returns the current ${label} from a low-level MCP server.
// It is illustrative and has not been run against a real server. Replace the
// transport with the one your server uses (stdio, SSE, streamable HTTP, ...).

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const message = ${jsonBlock(parsed, 0)};

async function main(transport) {
  try {
    await transport.send(message);
    console.log("Sent ${label}.");
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}

// main(transport);`;
}

function generateTypeScript(parsed, type) {
  if ((type === "request" || type === "notification") && typeof parsed.method === "string") {
    return tsRequestSnippet(parsed.method, safeParams(parsed));
  }
  return tsResponseSnippet(parsed, type);
}

/* ------------------------------------------------------------------ *
 * Python
 * ------------------------------------------------------------------ */

function pyRequestSnippet(method, params) {
  const call = pyHighLevelCall(method, params);
  return `# Install the official SDK:
#   pip install mcp
#
# This example connects to a local MCP server over stdio and performs a
# "${method}" call. It is illustrative and has not been run against a real server.

import asyncio

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main() -> None:
    server_params = StdioServerParameters(
        command="python",
        args=["server.py"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            try:
                await session.initialize()

${call}
            except Exception as error:  # noqa: BLE001
                print(f"MCP request failed: {error}")


if __name__ == "__main__":
    asyncio.run(main())`;
}

function pyHighLevelCall(method, params) {
  const pad = " " * 12;
  switch (method) {
    case "initialize":
      return `${pad}print("Connected and initialised.")`;
    case "notifications/initialized":
      return `${pad}# The SDK sends notifications/initialized automatically after initialize().
${pad}print("Initialised notification is handled by the SDK.")`;
    case "tools/list":
      return `${pad}tools = await session.list_tools()
${pad}print(tools)`;
    case "tools/call": {
      const name = params.name || "tool_name";
      const args = params.arguments || {};
      return `${pad}result = await session.call_tool(
${pad}    ${JSON.stringify(name)},
${pad}    arguments=${pyDict(args, pad.length + 4)},
${pad})
${pad}print(result)`;
    }
    case "resources/list":
      return `${pad}resources = await session.list_resources()
${pad}print(resources)`;
    case "resources/read": {
      const uri = params.uri || "file:///example/readme.md";
      return `${pad}resource = await session.read_resource(${JSON.stringify(uri)})
${pad}print(resource)`;
    }
    case "prompts/list":
      return `${pad}prompts = await session.list_prompts()
${pad}print(prompts)`;
    case "prompts/get": {
      const name = params.name || "prompt_name";
      const args = params.arguments || {};
      return `${pad}prompt = await session.get_prompt(
${pad}    ${JSON.stringify(name)},
${pad}    arguments=${pyDict(args, pad.length + 4)},
${pad})
${pad}print(prompt)`;
    }
    default:
      return `${pad}# Custom method: use a low-level request via the session.
${pad}# result = await session.send_request(...)
${pad}print(${JSON.stringify(method)})`;
  }
}

/** Very small JSON -> Python literal helper for dicts/lists/primitives. */
function pyDict(value, indent) {
  const pad = " " * indent;
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => `${pad}    ${pyDict(v, indent + 4)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return "{}";
  const lines = keys.map((k) => `${pad}    ${JSON.stringify(k)}: ${pyDict(value[k], indent + 4)}`);
  return `{\n${lines.join(",\n")}\n${pad}}`;
}

function pyResponseSnippet(parsed, type) {
  const label = type === "error" ? "error response" : "response";
  return `# Install the official SDK:
#   pip install mcp
#
# This example sends the current ${label} from a low-level MCP server.
# It is illustrative and has not been run against a real server. Replace the
# transport with the one your server uses (stdio, SSE, streamable HTTP, ...).

import asyncio
import json

message = json.loads(r"""${JSON.stringify(parsed, null, 2)}""")


async def main(transport) -> None:
    try:
        await transport.send(message)
        print("Sent ${label}.")
    except Exception as error:  # noqa: BLE001
        print(f"Failed to send message: {error}")


# asyncio.run(main(transport))`;
}

function generatePython(parsed, type) {
  if ((type === "request" || type === "notification") && typeof parsed.method === "string") {
    return pyRequestSnippet(parsed.method, safeParams(parsed));
  }
  return pyResponseSnippet(parsed, type);
}

/**
 * Generate code for the current message.
 * @param {object} parsed parsed JSON message
 * @param {string} lang "typescript" | "python"
 * @returns {string}
 */
export function generateCode(parsed, lang) {
  const type = classifyMessage(parsed);
  if (lang === "python") return generatePython(parsed, type);
  return generateTypeScript(parsed, type);
}

/**
 * Generate code even when the editor text is not yet valid JSON, by trying to
 * parse it; returns a helpful placeholder if it cannot.
 */
export function generateCodeFromText(text, lang) {
  try {
    const parsed = JSON.parse(text);
    return generateCode(parsed, lang);
  } catch {
    return lang === "python"
      ? "# Enter a valid JSON-RPC message (or choose a preset) to generate Python code."
      : "// Enter a valid JSON-RPC message (or choose a preset) to generate TypeScript code.";
  }
}
