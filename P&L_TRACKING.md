# P&L Tracking for Trading Bot

## Overview
The bot now tracks all trades with detailed profit/loss calculations and records everything in US Eastern Time (EST/UTC-4).

## New Features Added

### 1. Enhanced CSV Format
The trades.csv file now includes:
- **Time EST**: US Eastern Time recording (UTC-4)
- **Entry Price**: Price at which trade was executed
- **Status**: LIVE, PAPER, BLOCKED, or CLOSED
- **Exit Price**: Price when position was closed
- **P&L USD**: Total profit/loss in USD
- **P&L %**: Percentage change

### 2. Open Positions Tracking
- Open trades are tracked in `open_trades.json`
- Bot checks current prices and updates P&L in real-time
- When a position is closed, all P&L data is automatically recorded

### 3. New Commands
- `node bot.js` - Normal trading operation
- `node bot.js --tax-summary` - Shows trade summary with P&L
- `node bot.js --check-open-positions` - Checks and closes all open positions

### 4. P&L Calculation
For BUY trades:
- P&L = (Current Price - Entry Price) × Quantity
- Positive = Profit, Negative = Loss

For SELL trades:
- P&L = (Entry Price - Current Price) × Quantity
- Positive = Profit, Negative = Loss

### 5. Time Recording
All timestamps are recorded in:
- UTC (for exchange consistency)
- US Eastern Time (EST/UTC-4) for local reference

## Example CSV Row
```
2026-04-30,19:30:00,15:30:00,BitGet,BTCUSDT,BUY,0.001,45000.00,100.00,0.10,99.90,12345,LIVE,ict,45100.00,10.00,2.22,"Closed at $45100.00 | P&L: $10.00 (2.22%)"
```

## Usage
1. Run the bot normally: `node bot.js`
2. Check your P&L anytime: `node bot.js --tax-summary`
3. Close all open positions: `node bot.js --check-open-positions`
4. View full trade history in trades.csv