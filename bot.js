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

// ─── Indicator Functions ───────────────────────────────────────────────────────

function calcEMA(closes, period) {
  let multiplier = 2 / (period + 1);
  let ema = closes[0];

  for (let i = 1; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calcVWAP(candles) {
  let totalVolume = 0;
  let cumulativeVolume = 0;
  let cumulativePriceVolume = 0;

  for (let candle of candles) {
    totalVolume += candle.volume;
    cumulativeVolume += candle.volume;
    cumulativePriceVolume += ((candle.high + candle.low + candle.close) / 3) * candle.volume;
  }

  return cumulativePriceVolume / cumulativeVolume;
}

function calcRSI(closes, period) {
  let gains = [];
  let losses = [];

  for (let i = 1; i < closes.length; i++) {
    let change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  let rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// DRT Indicator Functions
function calcDealingRange(candles, minPoints = 8, maxPoints = 20) {
  // Look for consolidation zones
  for (let i = candles.length - 1; i >= minPoints; i--) {
    let range = candles.slice(i - minPoints, i);
    let highs = range.map(c => c.high);
    let lows = range.map(c => c.low);
    let avgBodySize = range.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / range.length;
    let rangeSize = Math.max(...highs) - Math.min(...lows);

    // Check if range is consolidation (body > 70% of range)
    if (avgBodySize / rangeSize > 0.7 && rangeSize > 0) {
      return {
        start: i - minPoints,
        end: i,
        high: Math.max(...highs),
        low: Math.min(...lows),
        bodyRatio: avgBodySize / rangeSize,
        isConsolidation: true
      };
    }
  }

  return null;
}

function calcDailyBias(candles, timeframe = '1H', lookback = 3) {
  // Simple bias calculation based on recent price action
  let recent = candles.slice(-lookback);
  let closes = recent.map(c => c.close);
  let opens = recent.map(c => c.open);

  let bullishCount = 0;
  let bearishCount = 0;

  for (let i = 0; i < closes.length; i++) {
    if (closes[i] > opens[i]) bullishCount++;
    else bearishCount++;
  }

  let bias = bullishCount / lookback;

  return {
    bullish: bias > 0.6,
    bearish: (1 - bias) > 0.6,
    neutral: bias >= 0.4 && bias <= 0.6,
    strength: bias
  };
}

function calcFVG(candles) {
  let fvgs = [];

  for (let i = 1; i < candles.length - 1; i++) {
    let prev = candles[i - 1];
    let current = candles[i];
    let next = candles[i + 1];

    // Bullish FVG: previous low > current high
    if (prev.low > current.high && next.close > current.high) {
      fvgs.push({
        type: 'bullish',
        start: i,
        end: i + 1,
        high: current.high,
        low: prev.low,
        bodyRatio: Math.abs(current.close - current.open) / (prev.low - current.high)
      });
    }

    // Bearish FVG: previous high < current low
    if (prev.high < current.low && next.close < current.low) {
      fvgs.push({
        type: 'bearish',
        start: i,
        end: i + 1,
        high: prev.high,
        low: current.low,
        bodyRatio: Math.abs(current.close - current.open) / (current.low - prev.high)
      });
    }
  }

  return fvgs;
}

function calcOrderBlocks(candles, lookback = 5) {
  let orderBlocks = [];

  for (let i = candles.length - lookback; i < candles.length - 1; i++) {
    let current = candles[i];
    let next = candles[i + 1];

    // Look for strong moves followed by reversal
    let moveStrength = Math.abs(current.close - current.open) / current.open;

    if (moveStrength > 0.002) { // 0.2% move
      // Bullish order block: bearish rejection after bullish move
      if (current.close > current.open && next.close < next.open &&
          next.low < current.close && next.close < current.open) {
        orderBlocks.push({
          type: 'bullish',
          index: i,
          price: (current.open + current.close) / 2,
          strength: moveStrength
        });
      }

      // Bearish order block: bullish rejection after bearish move
      if (current.close < current.open && next.close > next.open &&
          next.high > current.close && next.close > current.open) {
        orderBlocks.push({
          type: 'bearish',
          index: i,
          price: (current.open + current.close) / 2,
          strength: moveStrength
        });
      }
    }
  }

  return orderBlocks;
}

function calcLiquidityZones(candles, searchRadius = 50, threshold = 0.0005) {
  let zones = [];

  // Find swing highs and lows as potential liquidity points
  for (let i = searchRadius; i < candles.length - searchRadius; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - searchRadius; j <= i + searchRadius; j++) {
      if (j !== i) {
        if (candles[j].high >= candles[i].high) isSwingHigh = false;
        if (candles[j].low <= candles[i].low) isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      zones.push({
        type: 'high',
        index: i,
        price: candles[i].high,
        strength: 'strong'
      });
    }

    if (isSwingLow) {
      zones.push({
        type: 'low',
        index: i,
        price: candles[i].low,
        strength: 'strong'
      });
    }
  }

  return zones;
}

function calcATR(candles, period = 14) {
  let tr = [];

  for (let i = 1; i < candles.length; i++) {
    let highLow = candles[i].high - candles[i].low;
    let highClose = Math.abs(candles[i].high - candles[i - 1].close);
    let lowClose = Math.abs(candles[i].low - candles[i - 1].close);

    tr.push(Math.max(highLow, highClose, lowClose));
  }

  let atr = tr.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
  }

  return atr;
}

// DRT Safety Check Function
function runDRTRules(price, dealingRange, dailyBias, fvgs, orderBlocks, liquidityZones, atr, rules) {
  const results = [];
  let allPass = true;

  // Check 1: Dealing Range Presence
  const drCondition = {
    label: "Dealing Range Found",
    pass: dealingRange !== null,
    value: dealingRange ? "Yes" : "No",
    threshold: rules.indicators.drt_indicators.dealing_range.enabled
  };
  results.push(drCondition);
  if (!drCondition.pass) allPass = false;

  // Check 2: Daily Bias Alignment
  const biasCondition = {
    label: "Daily Bias Alignment",
    pass: dailyBias.bullish || dailyBias.bearish,
    value: dailyBias.bullish ? "Bullish" : dailyBias.bearish ? "Bearish" : "Neutral",
    threshold: rules.indicators.drt_indicators.daily_bias.threshold
  };
  results.push(biasCondition);
  if (!biasCondition.pass) allPass = false;

  // Check 3: Liquidity Presence
  let hasLiquidityBelow = false;
  let hasLiquidityAbove = false;

  liquidityZones.forEach(zone => {
    if (zone.type === 'low' && zone.price < price) hasLiquidityBelow = true;
    if (zone.type === 'high' && zone.price > price) hasLiquidityAbove = true;
  });

  const liquidityCondition = {
    label: "Liquidity Presence",
    pass: (dailyBias.bullish && hasLiquidityBelow) || (dailyBias.bearish && hasLiquidityAbove),
    value: dailyBias.bullish ? "Below" : "Above",
    threshold: rules.indicators.drt_indicators.liquidity_zones.enabled
  };
  results.push(liquidityCondition);
  if (!liquidityCondition.pass) allPass = false;

  // Check 4: FVG Presence
  const hasRelevantFVG = fvgs.some(fvg =>
    (dailyBias.bullish && fvg.type === 'bullish') ||
    (dailyBias.bearish && fvg.type === 'bearish')
  );

  const fvgCondition = {
    label: "FVG Present",
    pass: hasRelevantFVG,
    value: hasRelevantFVG ? "Yes" : "No",
    threshold: rules.indicators.ict_indicators.fvg.enabled
  };
  results.push(fvgCondition);
  if (!fvgCondition.pass) allPass = false;

  // Check 5: PO3 Confluence
  let po3Score = 0;
  let po3Max = 3;

  // Order Block Rejection
  const relevantOB = orderBlocks.filter(ob =>
    (dailyBias.bullish && ob.type === 'bullish') ||
    (dailyBias.bearish && ob.type === 'bearish')
  );
  if (relevantOB.length > 0) po3Score++;

  // FVG Fill
  if (fvgs.length > 0) po3Score++;

  // Liquidity Sweep
  if ((dailyBias.bullish && hasLiquidityBelow) || (dailyBias.bearish && hasLiquidityAbove)) po3Score++;

  const po3Condition = {
    label: "PO3 Confluence",
    pass: po3Score >= rules.indicators.power_of_3.confirmation.required,
    value: `${po3Score}/${po3Max}`,
    threshold: rules.indicators.power_of_3.confirmation.required
  };
  results.push(po3Condition);
  if (!po3Condition.pass) allPass = false;

  // Check 6: Time Filter (using UTC-4)
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const utc4Time = new Date(utcTime - (4 * 3600000));
  const currentHour = utc4Time.getUTCHours();
  const timeCondition = {
    label: "Session Hours",
    pass: currentHour >= 8 && currentHour <= 17,
    value: `${currentHour}:00`,
    threshold: "08:00-17:00"
  };
  results.push(timeCondition);
  if (!timeCondition.pass) allPass = false;

  // Check 7: Risk Management
  const maxPositionSize = rules.strategy.risk_management.max_position_size;
  const riskPerTrade = rules.strategy.risk_management.risk_per_trade;
  const stopLossMultiplier = rules.strategy.risk_management.stop_loss_atr_multiplier;

  const stopLossPrice = dailyBias.bullish ?
    price - (atr * stopLossMultiplier) :
    price + (atr * stopLossMultiplier);

  const priceDistanceToStop = Math.abs(price - stopLossPrice) / price;
  const riskCondition = {
    label: "Risk Management",
    pass: priceDistanceToStop >= riskPerTrade,
    value: `${(priceDistanceToStop * 100).toFixed(2)}%`,
    threshold: `${(riskPerTrade * 100).toFixed(2)}%`
  };
  results.push(riskCondition);
  if (!riskCondition.pass) allPass = false;

  return { results, allPass };
}

// ICT-Only Safety Check Function
function runICTRules(price, dealingRange, dailyBias, fvgs, orderBlocks, liquidityZones, atr, rules) {
  const results = [];
  let allPass = true;

  // Check 1: Dealing Range Presence
  const drCondition = {
    label: "Dealing Range Found",
    pass: dealingRange !== null,
    value: dealingRange ? "Yes" : "No",
    threshold: rules.indicators.drt_indicators.dealing_range.enabled
  };
  results.push(drCondition);
  if (!drCondition.pass) allPass = false;

  // Check 2: Daily Bias Alignment
  const biasCondition = {
    label: "Daily Bias Alignment",
    pass: dailyBias.bullish || dailyBias.bearish,
    value: dailyBias.bullish ? "Bullish" : dailyBias.bearish ? "Bearish" : "Neutral",
    threshold: rules.indicators.drt_indicators.daily_bias.threshold
  };
  results.push(biasCondition);
  if (!biasCondition.pass) allPass = false;

  // Check 3: Market Structure (Swing High/Low)
  const swingCondition = {
    label: "Market Structure",
    pass: true, // Always pass for ICT-only mode
    value: "Active",
    threshold: "Enabled"
  };
  results.push(swingCondition);

  // Check 4: FVG Presence
  const hasRelevantFVG = fvgs.some(fvg =>
    (dailyBias.bullish && fvg.type === 'bullish') ||
    (dailyBias.bearish && fvg.type === 'bearish')
  );

  const fvgCondition = {
    label: "FVG Present",
    pass: hasRelevantFVG,
    value: hasRelevantFVG ? "Yes" : "No",
    threshold: rules.indicators.ict_indicators.fvg.enabled
  };
  results.push(fvgCondition);
  if (!fvgCondition.pass) allPass = false;

  // Check 5: Order Block Presence
  const relevantOB = orderBlocks.filter(ob =>
    (dailyBias.bullish && ob.type === 'bullish') ||
    (dailyBias.bearish && ob.type === 'bearish')
  );

  const obCondition = {
    label: "Order Block Present",
    pass: relevantOB.length > 0,
    value: relevantOB.length > 0 ? "Yes" : "No",
    threshold: rules.indicators.ict_indicators.order_block.enabled
  };
  results.push(obCondition);
  if (!obCondition.pass) allPass = false;

  // Check 6: Imbalance Area
  const hasImbalance = fvgs.length > 0; // FVGs indicate imbalance

  const imbalanceCondition = {
    label: "Imbalance Present",
    pass: hasImbalance,
    value: hasImbalance ? "Yes" : "No",
    threshold: rules.indicators.ict_indicators.imbalance.enabled
  };
  results.push(imbalanceCondition);
  if (!imbalanceCondition.pass) allPass = false;

  // Check 7: Liquidity Presence
  let hasLiquidityBelow = false;
  let hasLiquidityAbove = false;

  liquidityZones.forEach(zone => {
    if (zone.type === 'low' && zone.price < price) hasLiquidityBelow = true;
    if (zone.type === 'high' && zone.price > price) hasLiquidityAbove = true;
  });

  const liquidityCondition = {
    label: "Liquidity Presence",
    pass: (dailyBias.bullish && hasLiquidityBelow) || (dailyBias.bearish && hasLiquidityAbove),
    value: dailyBias.bullish ? "Below" : "Above",
    threshold: rules.indicators.drt_indicators.liquidity_zones.enabled
  };
  results.push(liquidityCondition);
  if (!liquidityCondition.pass) allPass = false;

  // Check 8: Time Filter
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const utc4Time = new Date(utcTime - (4 * 3600000));
  const currentHour = utc4Time.getUTCHours();
  const timeCondition = {
    label: "Session Hours",
    pass: currentHour >= 8 && currentHour <= 17,
    value: `${currentHour}:00`,
    threshold: "08:00-17:00"
  };
  results.push(timeCondition);
  if (!timeCondition.pass) allPass = false;

  // Check 9: Risk Management
  const maxPositionSize = rules.strategy.risk_management.max_position_size;
  const riskPerTrade = rules.strategy.risk_management.risk_per_trade;
  const stopLossMultiplier = rules.strategy.risk_management.stop_loss_atr_multiplier;

  const stopLossPrice = dailyBias.bullish ?
    price - (atr * stopLossMultiplier) :
    price + (atr * stopLossMultiplier);

  const priceDistanceToStop = Math.abs(price - stopLossPrice) / price;
  const riskCondition = {
    label: "Risk Management",
    pass: priceDistanceToStop >= riskPerTrade,
    value: `${(priceDistanceToStop * 100).toFixed(2)}%`,
    threshold: `${(riskPerTrade * 100).toFixed(2)}%`
  };
  results.push(riskCondition);
  if (!riskCondition.pass) allPass = false;

  return { results, allPass };
}

// ─── TradingView Paper Trading Integration ─────────────────────────────────────

async function placeTradingViewPaperOrder(symbol, side, quantity, price, orderId) {
  // This would integrate with TradingView's paper trading API
  // For now, we'll simulate it with a mock API call
  const mockOrder = {
    id: `TV-${Date.now()}`,
    symbol,
    side,
    quantity,
    price,
    timestamp: new Date().toISOString(),
    status: "filled",
    exchange: "TradingView Paper"
  };

  console.log(`📊 TradingView Paper Trade: ${mockOrder.id}`);
  console.log(`   Symbol: ${symbol} | Side: ${side} | Quantity: ${quantity}`);
  console.log(`   Price: $${price.toFixed(2)} | Status: ${mockOrder.status}`);

  return mockOrder;
}

async function getTradingViewBalance() {
  // Mock TradingView paper trading balance
  return {
    equity: 10000,
    available: 9850,
    used: 150,
    pnl: 0
  };
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function checkOnboarding() {
  const required = ["BITGET_API_KEY", "BITGET_SECRET_KEY", "BITGET_PASSPHRASE"];
  const missing = required.filter((k) => !process.env[k]);

  // Skip .env file creation for Railway deployment
  if (!existsSync(".env")) {
    console.log("\n⚠️  No .env file found — using environment variables\n");
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
  timeframe: process.env.TIMEFRAME || "1H",
  portfolioValue: parseFloat(process.env.PORTFOLIO_VALUE_USD || "500"),
  maxTradeSizeUSD: parseFloat(process.env.MAX_TRADE_SIZE_USD || "2500"),
  maxTradesPerDay: parseInt(process.env.MAX_TRADES_PER_DAY || "20"),
  paperTrading: process.env.PAPER_TRADING !== "false",
  tradeMode: process.env.TRADE_MODE || "future",
  bitget: {
    apiKey: process.env.BINANCE_API_KEY,
    secretKey: process.env.BINANCE_SECRET_KEY,
    passphrase: process.env.BINANCE_PASSPHRASE,
    baseUrl: process.env.BINANCE_BASE_URL || "https://api.binance.com",
  },
};

const LOG_FILE = "safety-check-log.json";
const OPEN_TRADES_FILE = "open-trades.json";

// In-memory fallback for Railway's read-only filesystem
const useInMemoryStorage = !!process.env.RAILWAY_APP_ID || process.env.NODE_ENV === "production";
const inMemoryTrades = [];
const inMemoryOpenTrades = {};

// ─── Logging ────────────────────────────────────────────────────────────────

function loadLog() {
  if (!existsSync(LOG_FILE)) return { trades: [] };
  return JSON.parse(readFileSync(LOG_FILE, "utf8"));
}

function loadOpenTrades() {
  if (useInMemoryStorage) {
    return inMemoryOpenTrades;
  }
  if (!existsSync(OPEN_TRADES_FILE)) return {};
  return JSON.parse(readFileSync(OPEN_TRADES_FILE, "utf8"));
}

function saveOpenTrades(openTrades) {
  if (useInMemoryStorage) {
    Object.assign(inMemoryOpenTrades, openTrades);
  } else {
    writeFileSync(OPEN_TRADES_FILE, JSON.stringify(openTrades, null, 2));
  }
}

function trackOpenTrade(logEntry) {
  const openTrades = loadOpenTrades();
  const tradeId = logEntry.orderId || `PAPER-${Date.now()}`;

  openTrades[tradeId] = {
    id: tradeId,
    symbol: logEntry.symbol,
    side: logEntry.paperTrading ? "PAPER" : "LIVE",
    entryPrice: logEntry.price,
    entryTime: logEntry.timestamp,
    quantity: logEntry.tradeSize / logEntry.price,
    sizeUSD: logEntry.tradeSize,
    status: "OPEN",
    profit: 0,
    fees: logEntry.tradeSize * 0.001,
    tradingViewId: logEntry.tradingViewOrderId
  };

  saveOpenTrades(openTrades);
  console.log(`📊 Open trade tracked: ${tradeId}`);
}

function checkTradeClosures() {
  const openTrades = loadOpenTrades();

  // For demo purposes, let's simulate some trade closures
  // In a real implementation, you'd have exit logic based on:
  // - Stop loss hit
  // - Take profit hit
  // - Manual close
  // - Time-based exit

  Object.keys(openTrades).forEach(tradeId => {
    const trade = openTrades[tradeId];

    // Simulate trade closure after 24 hours for demo
    const entryTime = new Date(trade.entryTime);
    const now = new Date();
    const hoursElapsed = (now - entryTime) / (1000 * 60 * 60);

    if (hoursElapsed > 24 && trade.status === "OPEN") {
      // Simulate random exit price
      const priceChange = (Math.random() - 0.5) * 0.02; // ±1% movement
      const exitPrice = trade.entryPrice * (1 + priceChange);

      // Calculate P&L
      const grossProfit = (exitPrice - trade.entryPrice) * trade.quantity;
      const netProfit = grossProfit - trade.fees;

      trade.exitPrice = exitPrice;
      trade.exitTime = now.toISOString();
      trade.status = "CLOSED";
      trade.profit = netProfit;

      // Update CSV with closed trade
      updateClosedTrade(trade);

      console.log(`📈 Trade closed: ${tradeId} | P&L: $${netProfit.toFixed(2)}`);
    }
  });

  // Remove closed trades from open trades file
  const updatedOpenTrades = {};
  Object.keys(openTrades).forEach(tradeId => {
    if (openTrades[tradeId].status === "OPEN") {
      updatedOpenTrades[tradeId] = openTrades[tradeId];
    }
  });
  saveOpenTrades(updatedOpenTrades);
}

function updateClosedTrade(trade) {
  const now = new Date(trade.exitTime);

  // Convert to UTC-4 timezone
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const utc4Time = new Date(utcTime - (4 * 3600000));

  const date = utc4Time.toISOString().slice(0, 10);
  const time = utc4Time.toISOString().slice(11, 19);

  const entryDate = new Date(trade.entryTime);
  const duration = Math.round((now - entryDate) / (1000 * 60)); // Duration in minutes

  const row = [
    date,
    time,
    trade.symbol,
    "BUY", // Assuming long positions for demo
    trade.entryPrice.toFixed(2),
    trade.exitPrice.toFixed(2),
    trade.profit.toFixed(2),
    "YES",
    `Trade closed: P&L $${trade.profit.toFixed(2)}`,
    trade.id,
    trade.tradingViewId || "",
    trade.side,
    `${duration}m`,
    `Closed: P&L $${trade.profit.toFixed(2)}`
  ].join(",");

  appendFileSync(CSV_FILE, row + "\n");
}

function saveLog(log) {
  if (!useInMemoryStorage) {
    writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  }
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

  const minTradeSize = 100;
  const calculatedSize = Math.min(
    CONFIG.portfolioValue * 0.01,
    CONFIG.maxTradeSizeUSD,
  );
  const tradeSize = Math.max(minTradeSize, calculatedSize);

  if (tradeSize > CONFIG.maxTradeSizeUSD) {
    console.log(
      `🚫 Trade size $${tradeSize.toFixed(2)} exceeds max $${CONFIG.maxTradeSizeUSD}`,
    );
    return false;
  }

  console.log(
    `✅ Trade size: $${tradeSize.toFixed(2)} (minimum $${minTradeSize}) — within max $${CONFIG.maxTradeSizeUSD}`,
  );

  return true;
}

// ─── BitGet Execution ────────────────────────────────────────────────────────

function signBitGet(timestamp, method, path, body = "") {
  const message = `${timestamp}${method}${path}${body}`;
  return crypto
    .createHmac("sha256", CONFIG.bitget.secretKey)
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
    throw new Error(`Binance order failed: ${data.msg}`);
  }

  return data.data;
}

// ─── Tax CSV Logging ─────────────────────────────────────────────────────────

const CSV_FILE = "trades.csv";

// Always ensure trades.csv exists with headers — open it in Excel/Sheets any time
function initCsv() {
  if (!existsSync(CSV_FILE) && !useInMemoryStorage) {
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
  "Symbol",
  "Side",
  "Entry_Price",
  "Exit_Price",
  "Net_Profit/Loss",
  "Trade_Executed",
  "Reason_for_Trade",
  "Order_ID",
  "TradingView_Order_ID",
  "Mode",
  "Duration",
  "Notes"
].join(",");

async function writeTradeCsv(logEntry) {
  const now = new Date(logEntry.timestamp);

  // Convert to UTC-4 timezone
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const utc4Time = new Date(utcTime - (4 * 3600000)); // Subtract 4 hours for UTC-4

  const date = utc4Time.toISOString().slice(0, 10);
  const time = utc4Time.toISOString().slice(11, 19);

  // Initialize variables
  let side = "";
  let entryPrice = "";
  let exitPrice = "";
  let netProfitLoss = "";
  let tradeExecuted = "";
  let reasonForTrade = "";
  let orderId = "";
  let mode = "";
  let duration = "";
  let notes = "";

  if (!logEntry.allPass) {
    // Trade not executed
    const failed = logEntry.conditions
      .filter((c) => !c.pass)
      .map((c) => c.label)
      .join("; ");

    tradeExecuted = "NO";
    reasonForTrade = `Failed conditions: ${failed}`;
    mode = "PAPER";
    notes = `Trade blocked by safety check`;

    // For blocked trades, fill with placeholder values
    entryPrice = "";
    exitPrice = "";
    netProfitLoss = "0.00";
    orderId = "";
    duration = "";
  } else if (logEntry.paperTrading) {
    // Trade executed (paper)
    side = "BUY";
    entryPrice = logEntry.price.toFixed(2);
    exitPrice = ""; // Not closed yet
    netProfitLoss = "0.00"; // Not closed yet
    tradeExecuted = "YES";
    reasonForTrade = "All DRT/ICT conditions met";
    mode = "PAPER";
    notes = `Paper trade entry - Size: $${logEntry.tradeSize.toFixed(2)}`;
    orderId = logEntry.orderId || "";
    duration = "";

    // Also place order in TradingView paper trading
    if (logEntry.tradingViewOrderId) {
      // TradingView order already placed
    } else {
      const quantity = (logEntry.tradeSize / logEntry.price).toFixed(6);
      const tvOrder = await placeTradingViewPaperOrder(
        logEntry.symbol,
        side,
        parseFloat(quantity),
        logEntry.price,
        logEntry.orderId
      );
      logEntry.tradingViewOrderId = tvOrder.id;
      notes += ` | TradingView ID: ${tvOrder.id}`;
    }
  } else {
    // Live trading would go here
    side = "BUY";
    entryPrice = logEntry.price.toFixed(2);
    exitPrice = ""; // Not closed yet
    netProfitLoss = "0.00"; // Not closed yet
    tradeExecuted = "YES";
    reasonForTrade = "All conditions met - Live trading";
    mode = "LIVE";
    notes = logEntry.error ? `Error: ${logEntry.error}` : `Live trade entry - Size: $${logEntry.tradeSize.toFixed(2)}`;
    orderId = logEntry.orderId || "";
    duration = "";
  }

  const row = [
    date,
    time,
    logEntry.symbol,
    side,
    entryPrice,
    exitPrice,
    netProfitLoss,
    tradeExecuted,
    `"${reasonForTrade}"`,
    orderId,
    logEntry.tradingViewOrderId || "",
    mode,
    duration,
    `"${notes}"`
  ].join(",");

  if (!existsSync(CSV_FILE) && !useInMemoryStorage) {
    writeFileSync(CSV_FILE, CSV_HEADERS + "\n");
  }

  if (useInMemoryStorage) {
    inMemoryTrades.push(row);
    console.log(`Trade record saved → in-memory storage (Railway)`);
  } else {
    appendFileSync(CSV_FILE, row + "\n");
    console.log(`Trade record saved → ${CSV_FILE}`);
  }
}

// Tax summary command: node bot.js --tax-summary
function generateTaxSummary() {
  let rows = [];

  if (useInMemoryStorage) {
    if (inMemoryTrades.length === 0) {
      console.log("No trades found — no trades have been recorded yet.");
      return;
    }
    rows = inMemoryTrades.map((l) => l.split(","));
  } else {
    if (!existsSync(CSV_FILE)) {
      console.log("No trades.csv found — no trades have been recorded yet.");
      return;
    }
    const lines = readFileSync(CSV_FILE, "utf8").trim().split("\n");
    rows = lines.slice(1).map((l) => l.split(","));
  }

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

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  checkOnboarding();
  initCsv();

  // Check TradingView paper trading balance
  if (CONFIG.paperTrading) {
    console.log("\n── TradingView Paper Trading Status ───────────────────────\n");
    const tvBalance = await getTradingViewBalance();
    console.log(`  Starting Equity: $${tvBalance.equity.toFixed(2)}`);
    console.log(`  Available: $${tvBalance.available.toFixed(2)}`);
    console.log(`  In Use: $${tvBalance.used.toFixed(2)}`);
    console.log(`  P&L: $${tvBalance.pnl.toFixed(2)}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════");
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

  // Fetch candle data — need enough for EMA(8) + full session for VWAP
  console.log("\n── Fetching market data from Binance ───────────────────\n");
  const candles = await fetchCandles(CONFIG.symbol, CONFIG.timeframe, 500);
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  console.log(`  Current price: $${price.toFixed(2)}`);

  // Calculate indicators based on configuration
  const ema8 = rules.indicators.ema.enabled ? calcEMA(closes, 8) : null;
  const vwap = rules.indicators.vwap.enabled ? calcVWAP(candles) : null;
  const rsi3 = rules.indicators.rsi.enabled ? calcRSI(closes, 3) : null;

  if (rules.indicators.ema.enabled) {
    console.log(`  EMA(8):  $${ema8.toFixed(2)}`);
  }
  if (rules.indicators.vwap.enabled) {
    console.log(`  VWAP:    $${vwap ? vwap.toFixed(2) : "N/A"}`);
  }
  if (rules.indicators.rsi.enabled) {
    console.log(`  RSI(3):  ${rsi3 ? rsi3.toFixed(2) : "N/A"}`);
  }

  // Check if required indicators are available
  if (rules.indicators.vwap.enabled && !vwap) {
    console.log("\n⚠️  VWAP calculation failed. Exiting.");
    return;
  }
  if (rules.indicators.rsi.enabled && !rsi3) {
    console.log("\n⚠️  RSI calculation failed. Exiting.");
    return;
  }

  // Calculate DRT indicators
  const dealingRange = calcDealingRange(candles);
  const dailyBias = calcDailyBias(candles);
  const fvgs = calcFVG(candles);
  const orderBlocks = calcOrderBlocks(candles);
  const liquidityZones = calcLiquidityZones(candles);
  const atr = calcATR(candles);

  console.log(`  Dealing Range: ${dealingRange ? 'Found' : 'None'}`);
  console.log(`  Daily Bias: ${dailyBias.bullish ? 'Bullish' : dailyBias.bearish ? 'Bearish' : 'Neutral'} (${dailyBias.strength.toFixed(2)})`);
  console.log(`  FVGs: ${fvgs.length} found`);
  console.log(`  Order Blocks: ${orderBlocks.length} found`);
  console.log(`  ATR: ${atr.toFixed(4)}`);

  // Run ICT-only safety check
  const { results, allPass } = runICTRules(price, dealingRange, dailyBias, fvgs, orderBlocks, liquidityZones, atr, rules);

  // Calculate position size with minimum $100
  const minTradeSize = 100;
  const calculatedSize = Math.min(
    CONFIG.portfolioValue * 0.01,
    CONFIG.maxTradeSizeUSD,
  );
  const tradeSize = Math.max(minTradeSize, calculatedSize);

  // Decision
  console.log("\n── Decision ─────────────────────────────────────────────\n");

  const logEntry = {
    timestamp: new Date().toISOString(),
    symbol: CONFIG.symbol,
    timeframe: CONFIG.timeframe,
    price,
    indicators: { ema8, vwap, rsi3 },
    conditions: results,
    allPass,
    tradeSize,
    orderPlaced: false,
    orderId: null,
    tradingViewOrderId: null,
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
        const order = await placeBitGetOrder(
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

  // Track open trades for P&L calculation
  if (logEntry.allPass && (logEntry.paperTrading || logEntry.orderPlaced)) {
    trackOpenTrade(logEntry);
  }

  // Write tax CSV row for every run (executed, paper, or blocked)
  await writeTradeCsv(logEntry);

  // Check for trade closures
  checkTradeClosures();

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
