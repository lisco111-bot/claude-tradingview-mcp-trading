# ICT Trading Bot

Automated trading bot based on Inner Circle Trader's Smart Money Concepts.

## Features
- 1-minute timeframe trading
- ICT strategy implementation
- Fair Value Gaps (FVGs)
- Order Blocks detection
- Liquidity Pool targeting
- Time-based macro windows
- Paper trading mode (default)

## Environment Variables
Required in Railway:
- BINANCE_API_KEY
- BINANCE_SECRET_KEY
- SYMBOL=BTCUSDT
- TIMEFRAME=1m
- PAPER_TRADING=true (for testing)

## Schedule
Runs every 4 hours on Railway cron.

## Deployment
1. Login: railway login
2. Initialize: railway init
3. Deploy: railway up
