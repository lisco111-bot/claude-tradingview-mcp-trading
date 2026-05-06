import "dotenv/config";
import fs from "fs";

// ================= CONFIG =================
const CONFIG = {
  SYMBOL: process.env.SYMBOL || "BTCUSDT",
  TIMEFRAME: process.env.TIMEFRAME || "15m",
  PORTFOLIO: parseFloat(process.env.PORTFOLIO_VALUE_USD || "50"),
  MAX_TRADE: parseFloat(process.env.MAX_TRADE_SIZE_USD || "50"),
  PAPER: process.env.PAPER_TRADING !== "false"
};

const activeTrades = new Map();

// ================= UTILS =================
function calcSMA(data, period) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function findSwingLow(candles) {
  let low = candles[candles.length - 2];
  return low.low;
}

function findSwingHigh(candles) {
  let high = candles[candles.length - 2];
  return high.high;
}

// ================= FETCH DATA =================
async function getCandles() {
  const url = `https://api.binance.com/api/v3/klines?symbol=${CONFIG.SYMBOL}&interval=${CONFIG.TIMEFRAME}&limit=100`;
  const res = await fetch(url);
  const data = await res.json();

  return data.map(c => ({
    open: +c[1],
    high: +c[2],
    low: +c[3],
    close: +c[4]
  }));
}

// ================= SIGNAL =================
function generateSignal(candles) {
  const closes = candles.map(c => c.close);

  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);

  if (!sma50 || !sma200) return null;

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const swingLow = findSwingLow(candles);
  const swingHigh = findSwingHigh(candles);

  // BUY
  if (sma50 > sma200 && last.close > prev.high) {
    const entry = last.close;
    const sl = swingLow;
    const risk = entry - sl;
    const tp = entry + risk * 2;

    return { side: "buy", entry, sl, tp };
  }

  // SELL
  if (sma50 < sma200 && last.close < prev.low) {
    const entry = last.close;
    const sl = swingHigh;
    const risk = sl - entry;
    const tp = entry - risk * 2;

    return { side: "sell", entry, sl, tp };
  }

  return null;
}

// ================= CSV =================
function logTrade(trade, exitPrice, pnl) {
  const line = `${new Date().toISOString()},${CONFIG.SYMBOL},${trade.side},${trade.entry},${exitPrice},${pnl}\n`;

  if (!fs.existsSync("trades.csv")) {
    fs.writeFileSync("trades.csv", "date,symbol,side,entry,exit,pnl\n");
  }

  fs.appendFileSync("trades.csv", line);
}

// ================= EXIT =================
function checkExit(price) {
  activeTrades.forEach((t, id) => {
    if (t.side === "buy") {
      if (price <= t.sl || price >= t.tp) {
        const pnl = price - t.entry;
        console.log(`EXIT BUY → ${pnl}`);
        logTrade(t, price, pnl);
        activeTrades.delete(id);
      }
    }

    if (t.side === "sell") {
      if (price >= t.sl || price <= t.tp) {
        const pnl = t.entry - price;
        console.log(`EXIT SELL → ${pnl}`);
        logTrade(t, price, pnl);
        activeTrades.delete(id);
      }
    }
  });
}

// ================= MAIN =================
async function run() {
  console.log("=== BOT START ===");

  const candles = await getCandles();
  const price = candles[candles.length - 1].close;

  console.log("PRICE:", price);

  checkExit(price);

  if (activeTrades.size > 0) {
    console.log("Trade already running...");
    return;
  }

  const signal = generateSignal(candles);

  if (!signal) {
    console.log("NO TRADE");
    return;
  }

  console.log("SIGNAL:", signal);

  const size = Math.min(CONFIG.PORTFOLIO * 0.02, CONFIG.MAX_TRADE);

  const id = "T-" + Date.now();

  activeTrades.set(id, signal);

  if (CONFIG.PAPER) {
    console.log("PAPER TRADE EXECUTED");
  } else {
    console.log("LIVE TRADE EXECUTED");
    // integrate exchange API here
  }
}

run();
