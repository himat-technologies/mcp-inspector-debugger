/**
 * presets.js
 * Example MCP / JSON-RPC messages that populate the editor.
 * Each preset is a plain object so it is always valid JSON.
 */

export const PRESETS = [
  {
    id: "initialize-request",
    label: "initialize (request)",
    group: "Lifecycle",
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: "example-client",
          version: "1.0.0"
        }
      }
    }
  },
  {
    id: "initialize-response",
    label: "initialize (response)",
    group: "Lifecycle",
    data: {
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true }
        },
        serverInfo: {
          name: "example-server",
          version: "1.0.0"
        }
      }
    }
  },
  {
    id: "initialized-notification",
    label: "notifications/initialized",
    group: "Lifecycle",
    data: {
      jsonrpc: "2.0",
      method: "notifications/initialized"
    }
  },
  {
    id: "tools-list-request",
    label: "tools/list (request)",
    group: "Tools",
    data: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    }
  },
  {
    id: "tools-list-response",
    label: "tools/list (response)",
    group: "Tools",
    data: {
      jsonrpc: "2.0",
      id: 2,
      result: {
        tools: [
          {
            name: "get_weather",
            description: "Get the current weather for a location.",
            inputSchema: {
              type: "object",
              properties: {
                location: { type: "string", description: "City name" }
              },
              required: ["location"]
            }
          }
        ]
      }
    }
  },
  {
    id: "tools-call-request",
    label: "tools/call (request)",
    group: "Tools",
    data: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_weather",
        arguments: {
          location: "Bengaluru"
        }
      }
    }
  },
  {
    id: "tools-call-response",
    label: "tools/call (response)",
    group: "Tools",
    data: {
      jsonrpc: "2.0",
      id: 3,
      result: {
        content: [
          {
            type: "text",
            text: "The weather in Bengaluru is 27°C and clear."
          }
        ]
      }
    }
  },
  {
    id: "resources-list-request",
    label: "resources/list (request)",
    group: "Resources",
    data: {
      jsonrpc: "2.0",
      id: 4,
      method: "resources/list",
      params: {}
    }
  },
  {
    id: "resources-read-request",
    label: "resources/read (request)",
    group: "Resources",
    data: {
      jsonrpc: "2.0",
      id: 5,
      method: "resources/read",
      params: {
        uri: "file:///example/readme.md"
      }
    }
  },
  {
    id: "prompts-list-request",
    label: "prompts/list (request)",
    group: "Prompts",
    data: {
      jsonrpc: "2.0",
      id: 6,
      method: "prompts/list",
      params: {}
    }
  },
  {
    id: "prompts-get-request",
    label: "prompts/get (request)",
    group: "Prompts",
    data: {
      jsonrpc: "2.0",
      id: 7,
      method: "prompts/get",
      params: {
        name: "code_review",
        arguments: {
          language: "typescript"
        }
      }
    }
  },
  {
    id: "method-not-found-error",
    label: "method-not-found (error)",
    group: "Errors",
    data: {
      jsonrpc: "2.0",
      id: 8,
      error: {
        code: -32601,
        message: "Method not found"
      }
    }
  }
];

/** Return a pretty-printed JSON string for a preset. */
export function presetToText(preset) {
  return JSON.stringify(preset.data, null, 2);
}
