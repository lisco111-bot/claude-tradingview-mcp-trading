#!/usr/bin/env node

import "dotenv/config";
import { readFileSync, existsSync } from "fs";

console.log("=== DEBUG SCRIPT ===");
console.log("Environment Variables:");
console.log("RAILWAY_APP_ID:", process.env.RAILWAY_APP_ID || "Not set");
console.log("RAILWAY_ENVIRONMENT:", process.env.RAILWAY_ENVIRONMENT || "Not set");
console.log("NODE_ENV:", process.env.NODE_ENV || "Not set");
console.log("\nChecking for .env file:");
console.log(".env exists:", existsSync(".env"));
console.log("\nEnvironment Variables from .env:");
if (existsSync(".env")) {
  const content = readFileSync(".env", "utf8");
  const lines = content.split("\n");
  lines.forEach(line => {
    if (line.includes("=") && !line.startsWith("#")) {
      const [key, value] = line.split("=");
      if (key.includes("API_KEY") || key.includes("SECRET") || key.includes("PASSPHRASE")) {
        console.log(`${key}: ${value ? "***" : "empty"}`);
      }
    }
  });
}

console.log("\nChecking required environment variables:");
const required = ["BINANCE_API_KEY", "BINANCE_SECRET_KEY", "BINANCE_PASSPHRASE"];
required.forEach(key => {
  console.log(`${key}: ${process.env[key] ? "***" : "missing"}`);
});

console.log("\nBot version:", readFileSync("package.json", "utf8").match(/"version":\s*"([^"]+)"/)?.[1] || "unknown");