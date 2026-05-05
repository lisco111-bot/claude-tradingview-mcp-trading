# Railway Integration Guide

This guide shows how to integrate the trade management system with your Railway deployments.

## Overview

The system automatically:
1. Extracts trades from Railway deployment logs
2. Saves them to CSV/Excel format
3. Syncs with TradingView paper trading
4. Provides comprehensive reporting

## Railway Setup

### 1. Update Railway Configuration

Modify your `railway.json` to include post-deployment hooks:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "RAILPACK"
  },
  "deploy": {
    "startCommand": "node bot.js",
    "cronSchedule": "0 * * * *",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "runCommandAfterDeploy": "node manage-trades.js extract"
  }
}
```

### 2. Environment Variables

Add these to your Railway environment variables:

```env
# Trade Management
TRADE_MANAGEMENT_ENABLED=true
SYMBOL=BTCUSDT
TIMEFRAME=1H
PAPER_TRADING=true

# Optional TradingView API
TRADINGVIEW_API_KEY=your_api_key_here

# Cleanup settings
CLEANUP_DAYS=7
```

## Automatic Workflow

### After Each Railway Deployment:

1. **Bot runs** on schedule (every hour)
2. **Creates logs** in `railway-logs/` directory
3. **Trades extracted** automatically via `runCommandAfterDeploy`
4. **CSV updated** with new trades
5. **Excel report** regenerated
6. **TradingView synced** (if API key provided)

## Manual Commands

After deployment, you can run:

```bash
# Extract latest trades
node manage-trades.js extract

# Show current summary
node manage-trades.js summary

# Generate Excel report
node manage-trades.js excel

# Sync to TradingView
node manage-trades.js sync

# Run all tasks
node manage-trades.js all
```

## File Locations

### Railway Logs
- **Location**: `railway-logs/`
- **Format**: `deployment_<timestamp>.log`
- **Auto-created**: After each Railway deployment

### Trade Data
- **CSV**: `trades/paper_trades.csv`
- **Excel**: `trades/paper_trades.xlsx` (HTML format)
- **TradingView Data**: 
  - `trades/tradingview_portfolio.json`
  - `trades/tradingview_history.json`

## Monitoring

### 1. Check Logs
```bash
# View latest Railway log
type railway-logs\deployment_*.log | more

# View trade CSV
type trades\paper_trades.csv
```

### 2. Check Summary
```bash
node manage-trades.js summary
```

### 3. View Files
- **CSV**: Open in Excel, Google Sheets, or any spreadsheet software
- **Excel**: Double-click to open in browser (HTML format)
- **JSON**: View in any text editor

## Advanced Setup

### 1. Custom Log Parsing

If your Railway logs have a different format, modify `trade-logger.js`:

```javascript
// Add custom pattern matching
function parseCustomLog(logContent) {
    const pattern = /YourTradePattern: (\w+) at (\d+\.\d+)/;
    const match = logContent.match(pattern);
    if (match) {
        return {
            symbol: match[1],
            price: parseFloat(match[2])
        };
    }
}
```

### 2. Multiple Timeframes

Track different timeframes by running multiple bots:

```json
{
  "services": [
    {
      "name": "bot-1h",
      "command": "node bot.js",
      "env": {
        "TIMEFRAME": "1H",
        "SYMBOL": "BTCUSDT"
      }
    },
    {
      "name": "bot-4h", 
      "command": "node bot.js",
      "env": {
        "TIMEFRAME": "4H",
        "SYMBOL": "BTCUSDT"
      }
    }
  ]
}
```

### 3. Email Notifications

Add email alerts using nodemailer:

```javascript
// Install: npm install nodemailer
const nodemailer = require('nodemailer');

async function sendTradeNotification(trade) {
    const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: `Trade Executed: ${trade.symbol}`,
        text: `Bought ${trade.quantity} ${trade.symbol} at $${trade.price}`
    });
}
```

## Troubleshooting

### 1. No Railway Logs

If logs aren't created:
- Check Railway deployment status
- Ensure bot.js is running successfully
- Manually create a sample log for testing

### 2. CSV Not Updating

If CSV isn't updating:
- Run `node manage-trades.js extract` manually
- Check file permissions
- Verify log files exist

### 3. TradingView Sync Issues

If sync fails:
- Verify API key is correct
- Check internet connection
- Run in mock mode (no API key needed)

## Best Practices

1. **Regular Cleanup**: Run `node manage-trades.js cleanup` weekly
2. **Backup CSV**: Regularly backup your CSV file
3. **Monitor Performance**: Check summary after each run
4. **Test First**: Use mock mode before real API integration
5. **Log Everything**: Keep Railway logs for troubleshooting

## Sample Output

### Railway Log After Deployment
```
Railway Bot - 2024-01-01T12:00:00.000Z
═══════════════════════════════════════════════════════════
  Claude Trading Bot
  2024-01-01T12:00:00.000Z
  Mode: 📋 PAPER TRADING
  Exchange: Delta Exchange
═══════════════════════════════════════════════════════════

Strategy: Liquidity Sweep Trading
Symbol: BTCUSDT | Timeframe: 1H

✅ ALL CONDITIONS MET
📋 PAPER TRADE — would buy BTCUSDT ~$50.00 at market
```

### CSV Entry
```csv
2024-01-01T12:00:00.000Z,2024-01-01,12:00:00,BTCUSDT,BUY,MARKET,0.000577,50000.00,50.00,0.0500,49.95,BitGet,Railway Bot,EXECUTED,Liquidity Sweep,1H,"All conditions met",deployment_123456,1.0.0,""
```

## Integration with Claude

You can ask Claude to:
- "Show me my latest trades"
- "Generate an Excel report of my trades"
- "Sync my trades to TradingView"
- "Clean up old trade logs"

The system is designed to work seamlessly with Claude for easy trade management and analysis.

---

**Note**: This integration is for paper trading only. Always test thoroughly before using real money.