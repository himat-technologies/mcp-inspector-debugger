/**
 * redactor.js
 * Detect common credential patterns in a JSON message and replace the
 * *values* with [REDACTED], leaving the surrounding JSON structure intact.
 *
 * NOTE: Pattern matching cannot detect every secret. Always review the result
 * manually before exporting or sharing a message.
 */

const REDACTED = "[REDACTED]";

// Value-based patterns: matched anywhere a secret-looking string appears.
const VALUE_PATTERNS = [
  { name: "OpenAI API key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g },
  { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{16,}\b/g },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "AWS access key id", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "Bearer token", regex: /\bBearer\s+[A-Za-z0-9\-._~+/]{10,}=*/gi }
];

// Key-based detection: redact when the property name clearly marks a secret.
// Note: "token" and "secret" substrings intentionally also cover names like
// "authToken", "access_token" and "client_secret".
const SECRET_KEY_PATTERN =
  /(api[_-]?key|apikey|secret|token|password|passwd|pwd|access[_-]?key|client[_-]?secret|authorization|private[_-]?key|credential)/i;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Check whether a string value looks like a secret by pattern. */
function matchSecretValue(value) {
  for (const pattern of VALUE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(value)) {
      pattern.regex.lastIndex = 0;
      return pattern.name;
    }
  }
  return null;
}

/** Redact a single string value, preserving non-secret surrounding text. */
function redactValue(value) {
  let result = value;
  for (const pattern of VALUE_PATTERNS) {
    // Reset because these regexes are global/shared.
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    result = result.replace(regex, REDACTED);
  }
  return result;
}

function walk(value, keyName, matches) {
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, keyName, matches));
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = walk(value[key], key, matches);
    }
    return out;
  }
  if (typeof value === "string") {
    // 1) Key-based redaction.
    if (SECRET_KEY_PATTERN.test(keyName || "") && value !== REDACTED && value.trim().length >= 6) {
      matches.push({ key: keyName, reason: "sensitive field name", value });
      return REDACTED;
    }
    // 2) Value-based redaction.
    const patternName = matchSecretValue(value);
    if (patternName) {
      matches.push({ key: keyName || "(value)", reason: patternName, value });
      return redactValue(value);
    }
  }
  return value;
}

/**
 * Detect and redact secrets.
 * @param {string} text raw editor text
 * @returns {{ok:boolean, text:string, count:number, matches:Array, error?:string}}
 */
export function detectAndRedact(text) {
  if (!text || text.trim() === "") {
    return { ok: false, text, count: 0, matches: [], error: "Nothing to redact." };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      text,
      count: 0,
      matches: [],
      error: "Cannot auto-redact invalid JSON. Fix the JSON syntax first."
    };
  }

  const matches = [];
  const redacted = walk(parsed, "", matches);
  const output = JSON.stringify(redacted, null, 2);

  return { ok: true, text: output, count: matches.length, matches };
}

export { REDACTED };
