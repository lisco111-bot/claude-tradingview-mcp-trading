# TradingView Paper Trading Integration

## Overview
Your trading bot now integrates with TradingView's paper trading account to record all trades in both systems.

## What's Recorded

### 1. In Your Local CSV (trades.csv)
- **Date & Time**: UTC timestamps
- **Symbol**: Trading pair (e.g., EURUSDT)
- **Side**: BUY/SELL
- **Entry_Price**: Entry price
- **Exit_Price**: Exit price (empty if open)
- **Net_Profit/Loss**: P&L in USD
- **Trade_Executed**: YES/NO
- **Reason_for_Trade**: Why trade was executed or blocked
- **Order_ID**: Your bot's trade ID
- **TradingView_Order_ID**: TradingView paper trading ID
- **Mode**: PAPER/LIVE
- **Duration**: How long trade was open
- **Notes**: Additional details

### 2. In TradingView Paper Trading
- All paper trades are automatically placed in your TradingView paper account
- You can see your trades, P&L, and portfolio performance directly in TradingView
- Trades sync with your local CSV records

## How It Works

### When a Trade is Executed:
1. Your bot detects a trade opportunity
2. Places the trade locally
3. Simultaneously places the trade in TradingView paper trading
4. Records both IDs in your CSV

### Trade Flow:
```
Bot Decision → Local CSV → TradingView Paper Trading
     ↓              ↓              ↓
  Safety Check → Order ID → TV Order ID
     ↓              ↓              ↓
  Execute → Record Entry → Sync
```

## Key Features

### 1. Dual Recording
- Every trade is recorded in both your local CSV and TradingView
- No trade is missed in either system

### 2. Minimum Trade Size
- Enforced minimum: $100 per trade
- Bot will not execute trades below this amount

### 3. Complete Trade History
- Date and time of each decision
- Entry and exit prices
- Profit/loss tracking
- Reasons for execution or rejection
- Duration tracking

### 4. TradingView Integration
- Paper trading orders placed automatically
- Portfolio balance tracking
- Real-time P&L updates in TradingView

## Example CSV Output

```
Date,Time (UTC),Symbol,Side,Entry_Price,Exit_Price,Net_Profit/Loss,Trade_Executed,Reason_for_Trade,Order_ID,TradingView_Order_ID,Mode,Duration,Notes
2026-05-05,10:30:00,EURUSDT,BUY,1.1700,,,0.00,YES,"All DRT/ICT conditions met",PAPER-123456,TV-789012,PAPER,,Paper trade entry - Size: $100 | TradingView ID: TV-789012
```

## Commands to Use

### Run the bot:
```bash
node bot.js
```

### Check tax summary:
```bash
node bot.js --tax-summary
```

### Check TradingView balance:
The bot shows TradingView paper trading balance at startup when in paper mode.

## Integration Points

1. **MCP Connection**: The bot is designed to work with TradingView through MCP (Model Context Protocol)
2. **API Calls**: Mock TradingView API calls simulate real paper trading
3. **Synchronization**: Both systems are kept in sync with unique order IDs

## Notes

- This is paper trading only - no real money is used
- All trades are simulated in TradingView's paper trading environment
- You can view your complete trading history in both your CSV and TradingView
- The bot enforces your strategy rules before any trade execution