# ICT-Only Mode Implementation

## Mode Change Summary

The trading bot has been switched to **ICT-Only Mode** for a one-week trial period (starting 2026-04-30).

### Changes Made:

#### 1. Updated `rules.json`
- Set `"ema": { "enabled": false }`
- Set `"vwap": { "enabled": false }`
- Set `"rsi": { "enabled": false }`
- All ICT indicators remain enabled

#### 2. Modified `bot.js`
- Conditional indicator calculation based on rules.json
- Created `runICTRules()` function that doesn't rely on EMA, VWAP, or RSI
- Market Structure check now always passes in ICT-only mode
- All other risk management checks remain active

### Current ICT-Only Entry Conditions:

1. **Dealing Range Found** - Must identify consolidation zones
2. **Daily Bias Alignment** - Bullish or bearish bias
3. **Market Structure** - Always active (swing highs/lows)
4. **FVG Present** - Fair Value Gap in bias direction
5. **Order Block Present** - Institutional order blocks
6. **Imbalance Present** - FVGs indicate imbalance
7. **Liquidity Presence** - Relevant liquidity zones
8. **Session Hours** - 08:00-17:00 UTC-4
9. **Risk Management** - ATR-based stops and position sizing

### What's Removed:
- EMA(8) calculations
- VWAP calculations  
- RSI(3) calculations
- Dependencies on these indicators for entry decisions

### What's Active:
- All ICT concepts (FVG, Order Blocks, Imbalance)
- DRT methodology
- Risk management (ATR stops, position sizing)
- Time filters (UTC-4 session hours)
- Trade logging and tax reporting

### Trial Period:
- **Duration**: 1 week (until 2026-05-07)
- **Goal**: Test pure ICT effectiveness without traditional indicators
- **Evaluation**: After 1 week, review performance and decide whether to:
  - Continue with ICT-only if results are good
  - Re-enable EMA/VWAP/RSI if results are poor