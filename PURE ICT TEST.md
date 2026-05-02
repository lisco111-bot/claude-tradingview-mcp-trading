# Pure ICT Strategy Bot Test

## Overview
This branch runs the bot using **Pure ICT Strategy** for one week (April 30 - May 7, 2026). No EMA, VWAP, or RSI indicators are used.

## Strategy Rules Implemented
- **Time Windows**: Only trades during specific macro windows (London Open, AM/PM sessions)
- **FVG Detection**: Looks for Bullish FVG (BISI) or Bearish FVG (SIBI) patterns
- **Liquidity Sweeps**: Requires SSL/BSL to be swept before entry
- **CE Respect**: Price must respect the 50% midpoint of FVGs
- **Daily Bias**: Price position relative to daily range midpoint

## Key Changes
- Removed EMA(8), VWAP, and RSI(3) calculations
- Implemented pure ICT time-based entry rules
- Added FVG detection with CE calculation
- Added liquidity sweep detection
- Added macro window timing
- Limit orders placed at CE levels instead of market

## How to Test
1. Ensure `PAPER_TRADING=true` in .env
2. Run: `node bot.js`
3. Monitor trades.csv for ICT-labeled trades
4. After one week, review performance vs. previous EMA/VWAP/RSI results

## Expected Behavior
- Bot only checks for trades during macro windows
- Requires FVG + liquidity sweep + CE respect
- Places limit orders at CE levels
- Logs all decisions with "ict" strategy label

## Timeline
- **April 30 - May 7**: Pure ICT strategy testing
- **After May 7**: Review results and decide whether to continue with ICT or revert to EMA/VWAP/RSI