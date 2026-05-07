#!/usr/bin/env node

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";

console.log("=== Starting Bot with Safe Environment Checks ===");

// Check if we're in Railway
const isRailway = process.env.RAILWAY_APP_ID || process.env.RAILWAY_ENVIRONMENT;

if (isRailway) {
  console.log("✅ Detected Railway environment");

  // Create a minimal .env file if it doesn't exist
  if (!existsSync(".env")) {
    console.log("⚠️  No .env found - creating minimal one");
    writeFileSync(".env", `
# Railway Environment - Using environment variables
BINANCE_API_KEY=${process.env.BINANCE_API_KEY || ''}
BINANCE_SECRET_KEY=${process.env.BINANCE_SECRET_KEY || ''}
BINANCE_PASSPHRASE=${process.env.BINANCE_PASSPHRASE || ''}
DELTA_API_KEY=${process.env.DELTA_API_KEY || ''}
DELTA_SECRET_KEY=${process.env.DELTA_SECRET_KEY || ''}
DELTA_PASSPHRASE=${process.env.DELTA_PASSPHRASE || ''}
`);
  }
} else {
  console.log("🖥️  Local environment detected");
}

// Import and run the bot
import("./bot.js").then(bot => {
  console.log("🚀 Starting bot...");
  bot.run().catch(err => {
    console.error("Bot error:", err);
    process.exit(1);
  });
}).catch(err => {
  console.error("Failed to load bot:", err);
  process.exit(1);
});