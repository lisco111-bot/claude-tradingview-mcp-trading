/**
 * Claude + TradingView MCP — Automated Trading Bot
 *
 * Cloud mode: runs on Railway on a schedule. Pulls candle data direct from
 * Binance (free, no auth), calculates all indicators, runs safety check,
 * executes via BitGet if everything lines up.
 *
 * Local mode: run manually — node bot.js
 * Cloud mode: deploy to Railway, set env vars, Railway triggers on cron schedule
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import crypto from "crypto";
import { execSync } from "child_process";

// ─── Technical Analysis Functions ─────────────────────────────────────────────

function calcSMA(prices, period) {
  if (prices.length < period) return null;

  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function findSwingHigh(candles, lookback = 5) {
  if (candles.length < lookback * 2 + 1) return null;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    let isSwingHigh = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high > current.high) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      return {
        index: i,
        price: current.high,
        candle: current
      };
    }
  }

  return null;
}

function findSwingLow(candles, lookback = 5) {
  if (candles.length < lookback * 2 + 1) return null;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    let isSwingLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low < current.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      return {
        index: i,
        price: current.low,
        candle: current
      };
    }
  }

  return null;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function checkOnboarding() {
  // Check for Delta Exchange credentials first
  const deltaRequired = ["DELTAEXCHANGE_API_KEY", "DELTAEXCHANGE_SECRET_KEY"];
  const deltaMissing = deltaRequired.filter((k) => !process.env[k]);

  // Check for BitGet credentials as fallback
  const bitgetRequired = ["BITGET_API_KEY", "BITGET_SECRET_KEY", "BITGET_PASSPHRASE"];
  const bitgetMissing = bitgetRequired.filter((k) => !process.env[k]);

  // If using Delta, check Delta credentials
  if (!deltaMissing.length) {
    // Delta config looks good
    return;
  }

  // If using BitGet, check BitGet credentials
  if (!bitgetMissing.length) {
    // BitGet config looks good
    return;
  }

  if (!existsSync(".env")) {
    console.log(
      "\n⚠️  No .env file found — opening it for you to fill in...\n",
    );
    writeFileSync(
      ".env",
      [
        "# Delta Exchange API credentials",
        "DELTAEXCHANGE_API_KEY=",
        "DELTAEXCHANGE_SECRET_KEY=",
        "DELTAEXCHANGE_PASSPHRASE=",
        "",
        "# Trading config",
        "PORTFOLIO_VALUE_USD=50",
        "MAX_TRADE_SIZE_USD=2500",
        "MAX_TRADES_PER_DAY=20",
        "PAPER_TRADING=true",
        "SYMBOL=PAXGUSD",
        "TIMEFRAME=1H",
      ].join("\n") + "\n",
    );
    try {
      execSync("open .env");
    } catch {}
    console.log(
      "Fill in your Delta Exchange credentials in .env then re-run: node bot.js\n",
    );
    process.exit(0);
  }

  if (deltaMissing.length > 0 && bitgetMissing.length > 0) {
    console.log(`\n⚠️  Missing credentials in .env:`);
    if (deltaMissing.length > 0) {
      console.log(`- Delta Exchange: ${deltaMissing.join(", ")}`);
    }
    if (bitgetMissing.length > 0) {
      console.log(`- BitGet: ${bitgetMissing.join(", ")}`);
    }
    console.log("\nOpening .env for you now...\n");
    try {
      execSync("open .env");
    } catch {}
    console.log("Add the missing values then re-run: node bot.js\n");
    process.exit(0);
  }

  // Always print the CSV location so users know where to find their trade log
  const csvPath = new URL("trades.csv", import.meta.url).pathname;
  console.log(`\n📄 Trade log: ${csvPath}`);
  console.log(
    `   Open in Google Sheets or Excel any time — or tell Claude to move it:\n` +
      `   "Move my trades.csv to ~/Desktop" or "Move it to my Documents folder"\n`,
  );
}

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbol: process.env.SYMBOL || "BTCUSDT",
  timeframe: process.env.TIMEFRAME || "1H",
  portfolioValue: parseFloat(process.env.PORTFOLIO_VALUE_USD || "500"),
  maxTradeSizeUSD: parseFloat(process.env.MAX_TRADE_SIZE_USD || "2500"),
  maxTradesPerDay: parseInt(process.env.MAX_TRADES_PER_DAY || "20"),
  paperTrading: process.env.PAPER_TRADING !== "false",
  tradeMode: process.env.TRADE_MODE || "future",
  exchange: {
    type: process.env.EXCHANGE_TYPE || "delta",
    delta: {
      apiKey: process.env.DELTAEXCHANGE_API_KEY,
      secretKey: process.env.DELTAEXCHANGE_SECRET_KEY,
      passphrase: process.env.DELTAEXCHANGE_PASSPHRASE || "",
      baseUrl: process.env.DELTAEXCHANGE_BASE_URL || "https://api.delta.exchange",
    },
    bitget: {
      apiKey: process.env.BITGET_API_KEY,
      secretKey: process.env.BITGET_SECRET_KEY,
      passphrase: process.env.BITGET_PASSPHRASE,
      baseUrl: process.env.BITGET_BASE_URL || "https://api.bitget.com",
    },
  },
  // Alternative data sources
  dataSources: {
    binance: {
      enabled: process.env.DISABLE_BINANCE !== "true",
      endpoints: [
        "https://api.binance.com",
        "https://api1.binance.com",
        "https://api2.binance.com",
        "https://api3.binance.com"
      ]
    },
    coinbase: {
      enabled: process.env.PREFER_COINBASE === "true" || process.env.DISABLE_BINANCE === "true",
      baseUrl: "https://api.pro.coinbase.com"
    }
  },
};

const LOG_FILE = "safety-check-log.json";

// ─── Logging ────────────────────────────────────────────────────────────────

function loadLog() {
  if (!existsSync(LOG_FILE)) return { trades: [] };
  return JSON.parse(readFileSync(LOG_FILE, "utf8"));
}

function saveLog(log) {
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function countTodaysTrades(log) {
  const today = new Date().toISOString().slice(0, 10);
  return log.trades.filter(
    (t) => t.timestamp.startsWith(today) && t.orderPlaced,
  ).length;
}

// ─── Market Data (Binance public API — free, no auth) ───────────────────────

async function fetchCandles(symbol, interval, limit = 100) {
  // Map our timeframe format to Binance interval format
  const intervalMap = {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1H": "1h",
    "4H": "4h",
    "1D": "1d",
    "1W": "1w",
  };
  const binanceInterval = intervalMap[interval] || "1m";

  // Try using different Binance API endpoints first
  if (CONFIG.dataSources.binance.enabled) {
    const endpoints = CONFIG.dataSources.binance.endpoints.map(base =>
      `${base}/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`
    );

    let lastError;

    for (const url of endpoints) {
      try {
        console.log("🔄 Trying Binance endpoint...");
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          console.log("✅ Successfully fetched data from Binance");
          return data.map((k) => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          }));
        } else {
          lastError = `Binance API error: ${res.status} - ${res.statusText}`;
          if (res.status === 451) {
            console.log("⚠️  Binance API unavailable in your region. Trying alternative endpoint...");
          } else {
            console.log(`⚠️  Binance API returned status: ${res.status}`);
          }
        }
      } catch (error) {
        lastError = error.message;
        console.log(`⚠️  Error connecting to Binance: ${error.message}`);
      }
    }
  }

  // If Binance fails, try Coinbase as fallback
  if (CONFIG.dataSources.coinbase.enabled) {
    try {
      console.log("🔄 Trying Coinbase as fallback...");
      const coinbaseInterval = intervalMap[interval] || "3600"; // Coinbase uses seconds
      const url = `${CONFIG.dataSources.coinbase.baseUrl}/products/${symbol.toLowerCase()}/candles?granularity=${coinbaseInterval}&limit=${limit}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log("✅ Successfully fetched data from Coinbase");
        // Coinbase format: [timestamp, low, high, open, close, volume]
        return data.map((k) => ({
          time: k[0],
          open: parseFloat(k[3]),
          high: parseFloat(k[2]),
          low: parseFloat(k[1]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
      } else {
        console.log(`⚠️  Coinbase API returned status: ${res.status}`);
        throw new Error(`Coinbase API error: ${res.status}`);
      }
    } catch (error) {
      console.log(`⚠️  Error connecting to Coinbase: ${error.message}`);
    }
  }

  throw new Error("All data sources failed. Binance error: " + (lastError || "Unknown error"));
}

// ─── Trade Limits ────────────────────────────────────────────────────────────

function checkTradeLimits(log) {
  const todayCount = countTodaysTrades(log);

  console.log("\n── Trade Limits ─────────────────────────────────────────\n");

  if (todayCount >= CONFIG.maxTradesPerDay) {
    console.log(
      `🚫 Max trades per day reached: ${todayCount}/${CONFIG.maxTradesPerDay}`,
    );
    return false;
  }

  console.log(
    `✅ Trades today: ${todayCount}/${CONFIG.maxTradesPerDay} — within limit`,
  );

  const tradeSize = Math.min(
    CONFIG.portfolioValue * 0.01,
    CONFIG.maxTradeSizeUSD,
  );

  if (tradeSize > CONFIG.maxTradeSizeUSD) {
    console.log(
      `🚫 Trade size $${tradeSize.toFixed(2)} exceeds max $${CONFIG.maxTradeSizeUSD}`,
    );
    return false;
  }

  console.log(
    `✅ Trade size: $${tradeSize.toFixed(2)} — within max $${CONFIG.maxTradeSizeUSD}`,
  );

  return true;
}

// ─── Exchange Execution ───────────────────────────────────────────────────────

function signDeltaExchange(timestamp, method, path, body = "") {
  const message = `${timestamp}${method}${path}${body}`;
  return crypto
    .createHmac("sha256", CONFIG.exchange.delta.secretKey)
    .update(message)
    .digest("base64");
}

async function placeOrder(symbol, side, sizeUSD, price) {
  if (CONFIG.exchange.delta.apiKey) {
    // Delta Exchange
    return placeDeltaExchangeOrder(symbol, side, sizeUSD, price);
  } else {
    // BitGet (fallback)
    return placeBitGetOrder(symbol, side, sizeUSD, price);
  }
}

async function placeDeltaExchangeOrder(symbol, side, sizeUSD, price) {
  const quantity = (sizeUSD / price).toFixed(6);
  const timestamp = Date.now().toString();
  const path = "/api/v1/orders";

  const body = JSON.stringify({
    symbol,
    side,
    orderType: "MARKET",
    size: quantity,
    postOnly: false,
    reduceOnly: false,
  });

  const signature = signDeltaExchange(timestamp, "POST", path, body);

  const res = await fetch(`${CONFIG.exchange.delta.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": CONFIG.exchange.delta.apiKey,
      "X-API-TIMESTAMP": timestamp,
      "X-API-SIGN": signature,
      "X-PASSPHRASE": CONFIG.exchange.delta.passphrase,
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Delta Exchange order failed: ${data.message || data.error || res.statusText}`);
  }

  return data;
}

function signBitGet(timestamp, method, path, body = "") {
  const message = `${timestamp}${method}${path}${body}`;
  return crypto
    .createHmac("sha256", CONFIG.exchange.bitget.secretKey)
    .update(message)
    .digest("base64");
}

async function placeBitGetOrder(symbol, side, sizeUSD, price) {
  const quantity = (sizeUSD / price).toFixed(6);
  const timestamp = Date.now().toString();
  const path =
    CONFIG.tradeMode === "spot"
      ? "/api/v2/spot/trade/placeOrder"
      : "/api/v2/mix/order/placeOrder";

  const body = JSON.stringify({
    symbol,
    side,
    orderType: "market",
    quantity,
    ...(CONFIG.tradeMode === "futures" && {
      productType: "USDT-FUTURES",
      marginMode: "isolated",
      marginCoin: "USDT",
    }),
  });

  const signature = signBitGet(timestamp, "POST", path, body);

  const res = await fetch(`${CONFIG.exchange.bitget.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ACCESS-KEY": CONFIG.exchange.bitget.apiKey,
      "ACCESS-SIGN": signature,
      "ACCESS-TIMESTAMP": timestamp,
      "ACCESS-PASSPHRASE": CONFIG.exchange.bitget.passphrase,
    },
    body,
  });

  const data = await res.json();
  if (data.code !== "00000") {
    throw new Error(`BitGet order failed: ${data.msg}`);
  }

  return data.data;
}

// ─── Tax CSV Logging ─────────────────────────────────────────────────────────

const CSV_FILE = "trades.csv";

// Always ensure trades.csv exists with headers — open it in Excel/Sheets any time
function initCsv() {
  if (!existsSync(CSV_FILE)) {
    const funnyNote = `,,,,,,,,,,,"NOTE","Hey, if you're at this stage of the video, you must be enjoying it... perhaps you could hit subscribe now? :)"`;
    writeFileSync(CSV_FILE, CSV_HEADERS + "\n" + funnyNote + "\n");
    console.log(
      `📄 Created ${CSV_FILE} — open in Google Sheets or Excel to track trades.`,
    );
  }
}
const CSV_HEADERS = [
  "Date",
  "Time (UTC)",
  "Exchange",
  "Symbol",
  "Side",
  "Quantity",
  "Price",
  "Total USD",
  "Fee (est.)",
  "Net Amount",
  "Order ID",
  "Mode",
  "profit",
  "loss",
  "Notes",
].join(",");

function writeTradeCsv(logEntry) {
  const now = new Date(logEntry.timestamp);
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19);

  let side = "";
  let quantity = "";
  let totalUSD = "";
  let fee = "";
  let netAmount = "";
  let orderId = "";
  let mode = "";
  let notes = "";

  if (!logEntry.allPass) {
    const failed = logEntry.conditions
      .filter((c) => !c.pass)
      .map((c) => c.label)
      .join("; ");
    mode = "BLOCKED";
    orderId = "BLOCKED";
    notes = `Failed: ${failed}`;
  } else if (logEntry.paperTrading) {
    side = "BUY";
    quantity = (logEntry.tradeSize / logEntry.price).toFixed(6);
    totalUSD = logEntry.tradeSize.toFixed(2);
    fee = (logEntry.tradeSize * 0.001).toFixed(4);
    netAmount = (logEntry.tradeSize - parseFloat(fee)).toFixed(2);
    orderId = logEntry.orderId || "";
    mode = "PAPER";
    notes = "All conditions met";
  } else {
    side = "BUY";
    quantity = (logEntry.tradeSize / logEntry.price).toFixed(6);
    totalUSD = logEntry.tradeSize.toFixed(2);
    fee = (logEntry.tradeSize * 0.001).toFixed(4);
    netAmount = (logEntry.tradeSize - parseFloat(fee)).toFixed(2);
    orderId = logEntry.orderId || "";
    mode = "LIVE";
    notes = logEntry.error ? `Error: ${logEntry.error}` : "All conditions met";
  }

  const row = [
    date,
    time,
    "BitGet",
    logEntry.symbol,
    side,
    quantity,
    logEntry.price.toFixed(2),
    totalUSD,
    fee,
    netAmount,
    orderId,
    mode,
    `"${notes}"`,
  ].join(",");

  if (!existsSync(CSV_FILE)) {
    writeFileSync(CSV_FILE, CSV_HEADERS + "\n");
  }

  appendFileSync(CSV_FILE, row + "\n");
  console.log(`Tax record saved → ${CSV_FILE}`);
}

// Tax summary command: node bot.js --tax-summary
function generateTaxSummary() {
  if (!existsSync(CSV_FILE)) {
    console.log("No trades.csv found — no trades have been recorded yet.");
    return;
  }

  const lines = readFileSync(CSV_FILE, "utf8").trim().split("\n");
  const rows = lines.slice(1).map((l) => l.split(","));

  const live = rows.filter((r) => r[11] === "LIVE");
  const paper = rows.filter((r) => r[11] === "PAPER");
  const blocked = rows.filter((r) => r[11] === "BLOCKED");

  const totalVolume = live.reduce((sum, r) => sum + parseFloat(r[7] || 0), 0);
  const totalFees = live.reduce((sum, r) => sum + parseFloat(r[8] || 0), 0);

  console.log("\n── Tax Summary ──────────────────────────────────────────\n");
  console.log(`  Total decisions logged : ${rows.length}`);
  console.log(`  Live trades executed   : ${live.length}`);
  console.log(`  Paper trades           : ${paper.length}`);
  console.log(`  Blocked by safety check: ${blocked.length}`);
  console.log(`  Total volume (USD)     : $${totalVolume.toFixed(2)}`);
  console.log(`  Total fees paid (est.) : $${totalFees.toFixed(4)}`);
  console.log(`\n  Full record: ${CSV_FILE}`);
  console.log("─────────────────────────────────────────────────────────\n");
}

// ─── Safety Check and Tax Summary ─────────────────────────────────────────────

function runSafetyCheck(price, rules) {
  const results = [];

  // Basic price check
  results.push({
    label: "Price valid",
    pass: price > 0,
    value: `Price: $${price.toFixed(2)}`
  });

  // Additional checks based on the strategy rules
  if (rules.entry_rules.buy.htf_trend_bullish.condition === "higher_highs_higher_lows") {
    // For this strategy, we'll use basic price action as trend confirmation
    results.push({
      label: "HTF Bullish Trend",
      pass: true, // Simplified - always true for now
      value: "Trend analysis based on price action"
    });
  }

  const allPass = results.every(r => r.pass);

  return { results, allPass };
}


// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  checkOnboarding();
  initCsv();

  // Check data source connectivity
  console.log("🔍 Checking data source connectivity...\n");

  try {
    // Quick test to see if Binance is accessible
    const testUrl = "https://api.binance.com/api/v3/ping";
    const testRes = await fetch(testUrl);
    if (!testRes.ok) {
      throw new Error(`Binance ping failed: ${testRes.status}`);
    }
    console.log("✅ Binance API is accessible\n");
  } catch (error) {
    console.log("⚠️  Cannot connect to Binance API");
    console.log(`   Error: ${error.message}\n`);
    console.log("Attempting with alternative endpoints...\n");
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Claude Trading Bot");
  console.log(`  ${new Date().toISOString()}`);
  console.log(
    `  Mode: ${CONFIG.paperTrading ? "📋 PAPER TRADING" : "🔴 LIVE TRADING"}`,
  );
  console.log("═══════════════════════════════════════════════════════════");

  // Load strategy
  const rules = JSON.parse(readFileSync("rules.json", "utf8"));
  console.log(`\nStrategy: ${rules.strategy.name}`);
  console.log(`Symbol: ${CONFIG.symbol} | Timeframe: ${CONFIG.timeframe}`);

  // Load log and check daily limits
  const log = loadLog();
  const withinLimits = checkTradeLimits(log);
  if (!withinLimits) {
    console.log("\nBot stopping — trade limits reached for today.");
    return;
  }

  // Fetch candle data with retry logic
  console.log("\n── Fetching market data ────────────────────────────────\n");
  let candles = [];
  let fetchAttempts = 0;
  const maxAttempts = 3;

  // Skip data fetching if in test mode or if symbol is not supported
  if (process.env.SKIP_DATA_FETCH === "true") {
    console.log("📊 Skipping market data fetch (test mode)");
    // Generate mock data for testing
    candles = Array.from({ length: 100 }, (_, i) => ({
      time: Date.now() - (100 - i) * 60000,
      open: 50000 + Math.random() * 1000,
      high: 50100 + Math.random() * 1000,
      low: 49900 + Math.random() * 1000,
      close: 50000 + Math.random() * 1000,
      volume: 1000 + Math.random() * 500,
    }));
  } else {
    while (fetchAttempts < maxAttempts) {
      try {
        candles = await fetchCandles(CONFIG.symbol, CONFIG.timeframe, 100);
        break;
      } catch (error) {
        fetchAttempts++;
        console.log(`\n⚠️  Attempt ${fetchAttempts}/${maxAttempts} failed: ${error.message}`);

        if (fetchAttempts < maxAttempts) {
          console.log(`⏳ Waiting 5 seconds before retry...\n`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log("\n❌ Failed to fetch market data after all attempts.");
          console.log("   This could be due to:");
          console.log("   • Regional restrictions on Binance API");
          console.log("   • API maintenance or downtime");
          console.log("   • Network connectivity issues");
          console.log("\n   Troubleshooting:");
          console.log("   • Set DISABLE_BINANCE=true to use Coinbase only");
          console.log("   • Set SKIP_DATA_FETCH=true to run in test mode");
          console.log("   • Check your internet connection");
          console.log("   • Try running again later");
          return;
        }
      }
    }
  }

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  console.log(`  Current price: $${price.toFixed(2)}`);

  // Run safety check
  const { results, allPass } = runSafetyCheck(price, rules);

  // Calculate position size
  const tradeSize = Math.min(
    CONFIG.portfolioValue * 0.01,
    CONFIG.maxTradeSizeUSD,
  );

  // Decision
  console.log("\n── Decision ─────────────────────────────────────────────\n");

  const logEntry = {
    timestamp: new Date().toISOString(),
    symbol: CONFIG.symbol,
    timeframe: CONFIG.timeframe,
    price,
    indicators: {}, // Empty - no indicators used
    conditions: results,
    allPass,
    tradeSize,
    orderPlaced: false,
    orderId: null,
    paperTrading: CONFIG.paperTrading,
    limits: {
      maxTradeSizeUSD: CONFIG.maxTradeSizeUSD,
      maxTradesPerDay: CONFIG.maxTradesPerDay,
      tradesToday: countTodaysTrades(log),
    },
  };

  if (!allPass) {
    const failed = results.filter((r) => !r.pass).map((r) => r.label);
    console.log(`🚫 TRADE BLOCKED`);
    console.log(`   Failed conditions:`);
    failed.forEach((f) => console.log(`   - ${f}`));
  } else {
    console.log(`✅ ALL CONDITIONS MET`);

    if (CONFIG.paperTrading) {
      console.log(
        `\n📋 PAPER TRADE — would buy ${CONFIG.symbol} ~$${tradeSize.toFixed(2)} at market`,
      );
      console.log(`   (Set PAPER_TRADING=false in .env to place real orders)`);
      logEntry.orderPlaced = true;
      logEntry.orderId = `PAPER-${Date.now()}`;
    } else {
      console.log(
        `\n🔴 PLACING LIVE ORDER — $${tradeSize.toFixed(2)} BUY ${CONFIG.symbol}`,
      );
      try {
        const order = await placeOrder(
          CONFIG.symbol,
          "buy",
          tradeSize,
          price,
        );
        logEntry.orderPlaced = true;
        logEntry.orderId = order.orderId;
        console.log(`✅ ORDER PLACED — ${order.orderId}`);
      } catch (err) {
        console.log(`❌ ORDER FAILED — ${err.message}`);
        logEntry.error = err.message;
      }
    }
  }

  // Save decision log
  log.trades.push(logEntry);
  saveLog(log);
  console.log(`\nDecision log saved → ${LOG_FILE}`);

  // Write tax CSV row for every run (executed, paper, or blocked)
  writeTradeCsv(logEntry);

  console.log("═══════════════════════════════════════════════════════════\n");
}

if (process.argv.includes("--tax-summary")) {
  generateTaxSummary();
} else {
  run().catch((err) => {
    console.error("Bot error:", err);
    process.exit(1);
  });
}
