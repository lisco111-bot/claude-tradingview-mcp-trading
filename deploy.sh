#!/bin/bash

echo "🚀 Setting up Railway deployment for ICT Trading Bot"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it with your Binance API credentials."
    exit 1
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "✅ Prerequisites checked"

# Create README for Railway
cat > README.md << EOF
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
EOF

echo "📄 Created README.md for Railway"

# Create a simple package.json for Railway
cat > package.json << EOF
{
  "name": "ict-trading-bot",
  "version": "1.0.0",
  "description": "ICT Smart Money Trading Bot",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "axios": "^1.15.2",
    "dotenv": "^16.4.5",
    "node-fetch": "^3.3.2"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "type": "module"
}
EOF

echo "📦 Updated package.json"

echo ""
echo "🎯 Next steps to deploy:"
echo "1. Open Railway app in browser: https://railway.app"
echo "2. Login with your GitHub account"
echo "3. Create a new project"
echo "4. Run these commands:"
echo "   railway init"
echo "   railway up"
echo ""
echo "🤖 Your bot will deploy automatically with the following settings:"
echo "   - Runs every 4 hours"
echo "   - Restarts on failure (max 3 times)"
echo "   - Uses 1-minute timeframe"
echo "   - Paper trading enabled by default"