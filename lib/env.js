const fs = require("fs");
const path = require("path");

let loaded = false;

function parseValue(value) {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^(['"])(.*)\1$/);
  if (quoted) return quoted[2];
  return trimmed.replaceAll("\\$", "$");
}

function loadEnv() {
  if (loaded) return;
  loaded = true;

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index < 0) continue;

    const key = trimmed.slice(0, index).trim();
    const value = parseValue(trimmed.slice(index + 1));
    if (key) process.env[key] = value;
  }
}

function getEnv(name) {
  loadEnv();
  return process.env[name];
}

module.exports = { getEnv, loadEnv };
