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

// ─── Onboarding ───────────────────────────────────────────────────────────────

function checkOnboarding() {
  const required = ["BINANCE_API_KEY", "BINANCE_SECRET_KEY"];
  const missing = required.filter((k) => !process.env[k]);

  if (!existsSync(".env")) {
    console.log(
      "\n⚠️  No .env file found — opening it for you to fill in...\n",
    );
    writeFileSync(
      ".env",
      [
        "# Binance credentials",
        "BINANCE_API_KEY=",
        "BINANCE_SECRET_KEY=",
        "BINANCE_PASSPHRASE=",
        "",
        "# Trading config",
        "PORTFOLIO_VALUE_USD=1000",
        "MAX_TRADE_SIZE_USD=100",
        "MAX_TRADES_PER_DAY=3",
        "PAPER_TRADING=true",
        "SYMBOL=BTCUSDT",
        "TIMEFRAME=1m",
      ].join("\n") + "\n",
    );
    try {
      execSync("open .env");
    } catch {}
    console.log(
      "Fill in your Binance credentials in .env then re-run: node bot.js\n",
    );
    process.exit(0);
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  Missing credentials in .env: ${missing.join(", ")}`);
    console.log("Opening .env for you now...\n");
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
  timeframe: process.env.TIMEFRAME || "4H",
  portfolioValue: parseFloat(process.env.PORTFOLIO_VALUE_USD || "1000"),
  maxTradeSizeUSD: parseFloat(process.env.MAX_TRADE_SIZE_USD || "100"),
  maxTradesPerDay: parseInt(process.env.MAX_TRADES_PER_DAY || "3"),
  paperTrading: process.env.PAPER_TRADING !== "false",
  tradeMode: process.env.TRADE_MODE || "spot",
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
    passphrase: process.env.BINANCE_PASSPHRASE,
    baseUrl: process.env.BINANCE_BASE_URL || "https://api.binance.com",
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

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  const data = await res.json();

  return data.map((k) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

// ─── Pure ICT Strategy Implementation ─────────────────────────────────────────

function isInMacroWindow() {
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);

  const macroWindows = [
    { start: "02:33", end: "03:00" },  // London Open
    { start: "09:50", end: "10:10" },  // AM Macro 1
    { start: "10:10", end: "10:40" },  // AM Macro 2
    { start: "13:50", end: "14:10" },  // PM Macro 1
    { start: "14:50", end: "15:10" },  // PM Macro 2
  ];

  const avoidPeriods = [
    { start: "12:00", end: "13:30" },  // NY Lunch
    { start: "09:30", end: "09:50" },  // First 20 Min
  ];

  // Check if we're in an avoid period
  for (const period of avoidPeriods) {
    if (timeStr >= period.start && timeStr <= period.end) {
      return false;
    }
  }

  // Check if we're in a macro window
  for (const window of macroWindows) {
    if (timeStr >= window.start && timeStr <= window.end) {
      return true;
    }
  }

  return false;
}

function detectFVG(candles) {
  if (candles.length < 3) return null;

  // Check for Bullish FVG (BISI)
  const latest3 = candles.slice(-3);
  if (latest3[0].high < latest3[2].low) {
    return {
      type: "bullish",
      start: latest3[0].high,
      end: latest3[2].low,
      ce: (latest3[0].high + latest3[2].low) / 2,
      candleIndex: candles.length - 3
    };
  }

  // Check for Bearish FVG (SIBI)
  if (latest3[0].low > latest3[2].high) {
    return {
      type: "bearish",
      start: latest3[0].low,
      end: latest3[2].high,
      ce: (latest3[0].low + latest3[2].high) / 2,
      candleIndex: candles.length - 3
    };
  }

  return null;
}

function detectLiquiditySweep(candles, fvg) {
  if (!fvg) return null;

  const recentCandles = candles.slice(-10);

  if (fvg.type === "bullish") {
    // Check if price has swept below FVG (SSL sweep)
    const low = Math.min(...recentCandles.map(c => c.low));
    if (low < fvg.start) {
      return { type: "ssl_swept", fvg };
    }
  } else if (fvg.type === "bearish") {
    // Check if price has swept above FVG (BSL sweep)
    const high = Math.max(...recentCandles.map(c => c.high));
    if (high > fvg.end) {
      return { type: "bsl_swept", fvg };
    }
  }

  return null;
}

function checkPriceRespectsCE(candles, fvg) {
  if (!fvg) return false;

  const recentCandles = candles.slice(-5);

  if (fvg.type === "bullish") {
    // Candle bodies must stay above CE
    return recentCandles.every(c => c.close > fvg.ce && c.open > fvg.ce);
  } else if (fvg.type === "bearish") {
    // Candle bodies must stay below CE
    return recentCandles.every(c => c.close < fvg.ce && c.open < fvg.ce);
  }

  return false;
}

function runPureICTCheck(candles, rules) {
  const results = [];
  const price = candles[candles.length - 1].close;
  const fvg = detectFVG(candles);
  const liquiditySweep = detectLiquiditySweep(candles, fvg);
  const inMacroWindow = isInMacroWindow();

  console.log("\n── Pure ICT Strategy Check ────────────────────────────────\n");

  // 1. Macro window check
  const macroCheck = {
    label: "Macro window active",
    required: "true",
    actual: inMacroWindow.toString(),
    pass: inMacroWindow
  };
  results.push(macroCheck);
  console.log(`  ${macroCheck.pass ? "✅" : "🚫"} Macro window active`);
  console.log(`     Required: true | Actual: ${inMacroWindow}`);

  // 2. FVG detection
  const fvgCheck = {
    label: "FVG present",
    required: "true",
    actual: fvg ? "true" : "false",
    pass: !!fvg
  };
  results.push(fvgCheck);
  console.log(`  ${fvgCheck.pass ? "✅" : "🚫"} FVG present`);
  if (fvg) {
    console.log(`     Type: ${fvg.type.toUpperCase()} | CE: $${fvg.ce.toFixed(2)}`);
  }

  // 3. Liquidity sweep check
  if (fvg) {
    const sweepCheck = {
      label: "Liquidity swept",
      required: "true",
      actual: liquiditySweep ? "true" : "false",
      pass: !!liquiditySweep
    };
    results.push(sweepCheck);
    console.log(`  ${sweepCheck.pass ? "✅" : "🚫"} Liquidity swept`);
    if (liquiditySweep) {
      console.log(`     Type: ${liquiditySweep.type}`);
    }
  }

  // 4. CE respect check
  if (fvg) {
    const ceCheck = {
      label: "Price respects CE",
      required: "true",
      actual: checkPriceRespectsCE(candles.slice(-5), fvg).toString(),
      pass: checkPriceRespectsCE(candles.slice(-5), fvg)
    };
    results.push(ceCheck);
    console.log(`  ${ceCheck.pass ? "✅" : "🚫"} Price respects CE`);
    console.log(`     Required: bodies stay ${fvg.type === "bullish" ? "above" : "below"} CE`);
  }

  // Additional ICT rules from config
  if (rules && rules.strategy) {
    // Daily bias check (simplified - using current price position)
    const dailyCandles = candles.filter(c => {
      const candleTime = new Date(c.time);
      return candleTime.getUTCHours() >= 0 && candleTime.getUTCHours() < 24;
    });

    if (dailyCandles.length > 0) {
      const dailyHigh = Math.max(...dailyCandles.map(c => c.high));
      const dailyLow = Math.min(...dailyCandles.map(c => c.low));
      const dailyCE = (dailyHigh + dailyLow) / 2;
      const dailyBias = price > dailyCE ? "bullish" : "bearish";

      const biasCheck = {
        label: "Daily bias",
        required: fvg.type,
        actual: dailyBias,
        pass: dailyBias === fvg.type
      };
      results.push(biasCheck);
      console.log(`  ${biasCheck.pass ? "✅" : "🚫"} Daily bias ${dailyBias}`);
      console.log(`     Required: ${fvg.type} | Actual: ${dailyBias}`);
    }
  }

  const allPass = results.every(r => r.pass);
  return { results, allPass, fvg, liquiditySweep };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  checkOnboarding();
  initCsv();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Claude Trading Bot - Pure ICT Mode");
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

  // Fetch candle data — need enough for FVG detection
  console.log("\n── Fetching market data from Binance ───────────────────\n");
  const candles = await fetchCandles(CONFIG.symbol, CONFIG.timeframe, 100);
  const price = candles[candles.length - 1].close;
  console.log(`  Current price: $${price.toFixed(2)}`);

  // Run Pure ICT Strategy Check
  const { results, allPass, fvg, liquiditySweep } = runPureICTCheck(candles, rules);

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
    indicators: { fvg: fvg ? { type: fvg.type, ce: fvg.ce } : null, liquiditySweep },
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
    strategy: "pure_ict",
  };

  if (!allPass) {
    const failed = results.filter((r) => !r.pass).map((r) => r.label);
    console.log(`🚫 TRADE BLOCKED`);
    console.log(`   Failed conditions:`);
    failed.forEach((f) => console.log(`   - ${f}`));
  } else {
    console.log(`✅ ALL ICT CONDITIONS MET`);

    if (CONFIG.paperTrading) {
      console.log(
        `\n📋 PAPER TRADE — ICT ${fvg.type.toUpperCase()} entry at CE $${fvg.ce.toFixed(2)}`,
      );
      console.log(`   Trade size: $${tradeSize.toFixed(2)}`);
      console.log(`   (Set PAPER_TRADING=false in .env to place real orders)`);
      logEntry.orderPlaced = true;
      logEntry.orderId = `PAPER-ICT-${Date.now()}`;
      logEntry.entryPrice = fvg.ce;
      logEntry.fvg = fvg;
    } else {
      console.log(
        `\n🔴 PLACING LIVE ORDER — ICT ${fvg.type.toUpperCase()} entry`,
      );
      console.log(`   Entry at CE: $${fvg.ce.toFixed(2)}`);
      console.log(`   Trade size: $${tradeSize.toFixed(2)}`);

      // Place limit order at CE
      try {
        const order = await placeBinanceOrder(
          CONFIG.symbol,
          fvg.type === "bullish" ? "buy" : "sell",
          tradeSize,
          fvg.ce,  // Limit price at CE
        );
        logEntry.orderPlaced = true;
        logEntry.orderId = order.orderId;
        logEntry.entryPrice = fvg.ce;
        logEntry.fvg = fvg;
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

// ─── BitGet Execution ────────────────────────────────────────────────────────

function signBinance(timestamp, method, path, body = "") {
  const message = `${timestamp}${method}${path}${body}`;
  return crypto
    .createHmac("sha256", CONFIG.binance.secretKey)
    .update(message)
    .digest("base64");
}

async function placeBinanceOrder(symbol, side, sizeUSD, price) {
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

  const signature = signBinance(timestamp, "POST", path, body);

  const res = await fetch(`${CONFIG.binance.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ACCESS-KEY": CONFIG.binance.apiKey,
      "ACCESS-SIGN": signature,
      "ACCESS-TIMESTAMP": timestamp,
      "ACCESS-PASSPHRASE": CONFIG.binance.passphrase,
    },
    body,
  });

  const data = await res.json();
  if (data.code !== "00000") {
    throw new Error(`BitGet order failed: ${data.msg}`);
  }

  return data.data;
}

// ─── Trade Tracking & P&L Calculation ─────────────────────────────────────

const CSV_FILE = "trades.csv";
const OPEN_TRADES_FILE = "open_trades.json";

// Load open trades
function loadOpenTrades() {
  if (!existsSync(OPEN_TRADES_FILE)) return [];
  return JSON.parse(readFileSync(OPEN_TRADES_FILE, "utf8"));
}

// Save open trades
function saveOpenTrades(trades) {
  writeFileSync(OPEN_TRADES_FILE, JSON.stringify(trades, null, 2));
}

// Get US Eastern Time (UTC-4, including DST)
function getESTTime(date) {
  const estOffset = -4 * 60; // UTC-4 in minutes
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000); // Convert to UTC
  const estTime = new Date(utc + (estOffset * 60000));
  return estTime;
}

// Always ensure trades.csv exists with headers — open it in Excel/Sheets any time
function initCsv() {
  if (!existsSync(CSV_FILE)) {
    const funnyNote = `,,,,,,,,,,,,,"NOTE","Hey, if you're at this stage of the video, you must be enjoying it... perhaps you could hit subscribe now? :)`;
    writeFileSync(CSV_FILE, CSV_HEADERS + "\n" + funnyNote + "\n");
    console.log(
      `📄 Created ${CSV_FILE} — open in Google Sheets or Excel to track trades.`,
    );
  }
}
const CSV_HEADERS = [
  "Date",
  "Time (UTC)",
  "Time EST",
  "Exchange",
  "Symbol",
  "Side",
  "Quantity",
  "Entry Price",
  "Total USD",
  "Fee (est.)",
  "Net Amount",
  "Order ID",
  "Status",
  "Strategy",
  "Exit Price",
  "P&L USD",
  "P&L %",
  "Notes",
].join(",");

function writeTradeCsv(logEntry) {
  const now = new Date(logEntry.timestamp);
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19);
  const estTime = getESTTime(now);
  const estTimeStr = estTime.toISOString().slice(11, 19);

  let side = "";
  let quantity = "";
  let totalUSD = "";
  let fee = "";
  let netAmount = "";
  let orderId = "";
  let mode = "";
  let notes = "";
  let exitPrice = "";
  let plUSD = "";
  let plPercent = "";

  if (!logEntry.allPass) {
    const failed = logEntry.conditions
      .filter((c) => !c.pass)
      .map((c) => c.label)
      .join("; ");
    mode = "BLOCKED";
    orderId = "BLOCKED";
    notes = `Failed: ${failed}`;
  } else if (logEntry.paperTrading || logEntry.orderPlaced) {
    // For executed trades (paper or live)
    if (logEntry.fvg && logEntry.fvg.type === "bullish") {
      side = "BUY";
    } else if (logEntry.fvg && logEntry.fvg.type === "bearish") {
      side = "SELL";
    } else {
      side = "BUY"; // default
    }

    const entryPrice = logEntry.entryPrice || logEntry.price;
    quantity = (logEntry.tradeSize / entryPrice).toFixed(6);
    totalUSD = logEntry.tradeSize.toFixed(2);
    fee = (logEntry.tradeSize * 0.001).toFixed(4);
    netAmount = (logEntry.tradeSize - parseFloat(fee)).toFixed(2);
    orderId = logEntry.orderId || "";

    if (logEntry.paperTrading) {
      mode = "PAPER";
      notes = `ICT ${logEntry.fvg?.type || 'entry'} at CE $${entryPrice.toFixed(2)} | Paper trade`;
    } else {
      mode = "LIVE";
      notes = `ICT ${logEntry.fvg?.type || 'entry'} at CE $${entryPrice.toFixed(2)}` + (logEntry.error ? ` | Error: ${logEntry.error}` : "");
    }

    // For live trades, add to open trades for tracking
    if (!logEntry.paperTrading && logEntry.orderPlaced && !logEntry.error) {
      const openTrade = {
        id: logEntry.orderId,
        symbol: logEntry.symbol,
        side: side,
        entryPrice: parseFloat(entryPrice),
        quantity: parseFloat(quantity),
        sizeUSD: parseFloat(totalUSD),
        timestamp: logEntry.timestamp,
        date: date,
        estTime: estTimeStr
      };

      const openTrades = loadOpenTrades();
      openTrades.push(openTrade);
      saveOpenTrades(openTrades);
    }
  }

  const strategy = logEntry.strategy || "ict";
  const row = [
    date,
    time,
    estTimeStr,
    "BitGet",
    logEntry.symbol,
    side,
    quantity,
    (logEntry.entryPrice || logEntry.price).toFixed(2),
    totalUSD,
    fee,
    netAmount,
    orderId,
    mode,
    strategy,
    exitPrice,
    plUSD,
    plPercent,
    `"${notes}"`,
  ].join(",");

  if (!existsSync(CSV_FILE)) {
    writeFileSync(CSV_FILE, CSV_HEADERS + "\n");
  }

  appendFileSync(CSV_FILE, row + "\n");
  console.log(`Trade record saved → ${CSV_FILE}`);
}

// Tax summary command: node bot.js --tax-summary
function generateTaxSummary() {
  if (!existsSync(CSV_FILE)) {
    console.log("No trades.csv found — no trades have been recorded yet.");
    return;
  }

  const lines = readFileSync(CSV_FILE, "utf8").trim().split("\n");
  const rows = lines.slice(1).map((l) => l.split(","));

  const live = rows.filter((r) => r[12] === "LIVE");
  const paper = rows.filter((r) => r[12] === "PAPER");
  const blocked = rows.filter((r) => r[12] === "BLOCKED");
  const closed = rows.filter((r) => r[12] === "CLOSED");
  const ictTrades = rows.filter((r) => r[13] === "ict" || r[13] === "pure_ict");
  const emaTrades = rows.filter((r) => r[13] === "ema_vwap_rsi");

  // Calculate P&L for all trades
  let totalPL = 0;
  rows.forEach(row => {
    if (row[15]) { // P&L USD column
      totalPL += parseFloat(row[15] || 0);
    }
  });

  const totalVolume = live.reduce((sum, r) => sum + parseFloat(r[7] || 0), 0);
  const totalFees = live.reduce((sum, r) => sum + parseFloat(r[8] || 0), 0);

  console.log("\n── Trade Summary ──────────────────────────────────────────\n");
  console.log(`  Total decisions logged : ${rows.length}`);
  console.log(`  Live trades executed   : ${live.length}`);
  console.log(`  Paper trades           : ${paper.length}`);
  console.log(`  Closed trades         : ${closed.length}`);
  console.log(`  Blocked by safety check: ${blocked.length}`);
  console.log(`  ICT strategy trades    : ${ictTrades.length}`);
  console.log(`  EMA/VWAP/RSI trades   : ${emaTrades.length}`);
  console.log(`  Total volume (USD)     : $${totalVolume.toFixed(2)}`);
  console.log(`  Total fees paid (est.) : $${totalFees.toFixed(4)}`);
  console.log(`  Net P&L (USD)         : $${totalPL.toFixed(2)}`);
  console.log(`\n  Full record: ${CSV_FILE}`);
  console.log("─────────────────────────────────────────────────────────\n");
}


// Check for open positions and update P&L
async function checkOpenPositions() {
  const openTrades = loadOpenTrades();
  if (openTrades.length === 0) return;

  console.log("\n── Checking Open Positions ──────────────────────────────\n");

  for (const trade of openTrades) {
    try {
      // Fetch current price
      const candles = await fetchCandles(trade.symbol, "1m", 1);
      const currentPrice = candles[0].close;

      // Calculate P&L
      let plUSD, plPercent;
      if (trade.side === "BUY") {
        plUSD = (currentPrice - trade.entryPrice) * trade.quantity;
        plPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
      } else {
        plUSD = (trade.entryPrice - currentPrice) * trade.quantity;
        plPercent = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
      }

      // Update CSV with exit data
      const estTime = getESTTime(new Date());
      const estTimeStr = estTime.toISOString().slice(11, 19);
      const date = estTime.toISOString().slice(0, 10);

      const row = [
        date,
        estTime.toISOString().slice(11, 19),
        estTimeStr,
        "BitGet",
        trade.symbol,
        trade.side,
        trade.quantity.toFixed(6),
        trade.entryPrice.toFixed(2),
        trade.sizeUSD.toFixed(2),
        (trade.sizeUSD * 0.001).toFixed(4),
        (trade.sizeUSD - (trade.sizeUSD * 0.001)).toFixed(2),
        trade.id,
        "CLOSED",
        "ict",
        currentPrice.toFixed(2),
        plUSD.toFixed(2),
        plPercent.toFixed(2),
        `Closed at $${currentPrice.toFixed(2)} | P&L: $${plUSD.toFixed(2)} (${plPercent.toFixed(2)}%)`,
      ].join(",");

      appendFileSync(CSV_FILE, row + "\n");

      console.log(`✅ Closed trade ${trade.id}:`);
      console.log(`   ${trade.side} ${trade.quantity} ${trade.symbol} @ $${trade.entryPrice.toFixed(2)}`);
      console.log(`   Closed at $${currentPrice.toFixed(2)} | P&L: $${plUSD.toFixed(2)} (${plPercent.toFixed(2)}%)`);

      // Remove from open trades
      const updatedTrades = openTrades.filter(t => t.id !== trade.id);
      saveOpenTrades(updatedTrades);

    } catch (error) {
      console.log(`❌ Error checking trade ${trade.id}: ${error.message}`);
    }
  }
}

// Command line interface
if (process.argv.includes("--check-open-positions")) {
  checkOpenPositions().catch(console.error);
} else if (process.argv.includes("--tax-summary")) {
  generateTaxSummary();
} else {
  run().catch((err) => {
    console.error("Bot error:", err);
    process.exit(1);
  });
}
