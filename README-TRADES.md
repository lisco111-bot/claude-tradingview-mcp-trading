# Railway Bot Trade Management

This system helps you store and manage paper trades from your Railway bot in Excel/CSV format and sync them with TradingView paper trading.

## Features

✅ **Extract trades from Railway logs** - Automatically parses Railway deployment logs to extract trade information  
✅ **CSV/Excel export** - Saves trades in CSV format and generates HTML-based Excel reports  
✅ **TradingView integration** - Syncs your paper trades to TradingView's paper trading platform  
✅ **Trade tracking** - Track all your paper trades with detailed statistics and summaries  
✅ **Automatic cleanup** - Cleans up old log files to save space

## File Structure

```
CLAUDE PROJECT 3/
├── bot.js                          # Your main Railway bot
├── manage-trades.js               # Main trade management script
├── trade-logger.js               # Extracts and saves trades to CSV
├── tradingview-integration.js    # Syncs trades to TradingView
├── README-TRADES.md              # This file
└── trades/                      # Trade data directory
    ├── paper_trades.csv         # CSV format of all trades
    ├── paper_trades.xlsx        # Excel format HTML report
    ├── tradingview_portfolio.json  # TradingView portfolio data
    └── tradingview_history.json   # TradingView trade history
└── railway-logs/                # Railway deployment logs
    └── deployment_*.log         # Sample Railway logs
```

## Setup

### 1. Install Dependencies

```bash
# No additional dependencies needed - uses built-in Node.js modules
```

### 2. Environment Variables (Optional)

Create a `.env` file in your project root:

```env
# TradingView API (optional - system works without it)
TRADINGVIEW_API_KEY=your_tradingview_api_key

# Trading configuration
SYMBOL=BTCUSDT
TIMEFRAME=1H
```

## Usage

### Extract and Manage Trades

```bash
# Extract trades from Railway logs
node manage-trades.js extract

# Generate Excel report
node manage-trades.js excel

# Show trading summary
node manage-trades.js summary

# Open trades in Excel
node manage-trades.js open

# Clean up old files
node manage-trades.js cleanup

# Run all commands (extract → sync → excel)
node manage-trades.js all
```

### Sync to TradingView

```bash
# Sync trades to TradingView paper trading
node manage-trades.js sync

# Or run the TradingView integration directly
node tradingview-integration.js
```

### Manual Trade Extraction

```bash
# Extract trades from Railway logs
node trade-logger.js

# Generate Excel report
node trade-logger.js --excel
```

## How It Works

### 1. Trade Extraction

The system automatically:
- Looks for Railway deployment logs in `railway-logs/` directory
- Parses logs for trade execution patterns
- Extracts trade details (symbol, price, quantity, etc.)
- Saves each trade to CSV format

### 2. CSV Format

The CSV file contains these columns:
- Timestamp, Date, Time
- Symbol, Side, Order Type
- Quantity, Price, Total Value
- Fee, Net Value
- Exchange, Platform, Status
- Strategy, Timeframe, Reason
- Railway Deployment ID, Bot Version, Notes

### 3. Excel Report

Generates an HTML-based Excel report with:
- All trade data formatted in a table
- Color-coded positive/negative values
- Summary statistics
- Professional styling

### 4. TradingView Integration

- **Real API**: Uses TradingView's official API (requires API key)
- **Mock Mode**: Simulates TradingView paper trading for testing
- Automatically syncs all paper trades to your TradingView portfolio
- Tracks trade history and portfolio value

## Sample Output

### Trading Summary
```
📈 Trading Summary

📊 Overall Statistics:
   Total Trades: 15
   Total Volume: $750.00
   Total Fees: $7.5000
   Net Profit: $742.50 📈

📊 Symbol Breakdown:
   BTCUSDT:
     Trades: 10
     Volume: $500.00
     Avg Price: $50000.00
     Fees: $5.0000
```

### TradingView Trade Format
```json
{
  "symbol": "BTCUSDT",
  "side": "buy",
  "quantity": "0.001",
  "price": 50000,
  "type": "market",
  "time": "2024-01-01T12:00:00.000Z",
  "strategy": "Railway Bot",
  "reason": "All conditions met"
}
```

## Troubleshooting

### No Railway Logs Found

If you see "No Railway log files found", the system will:
1. Create sample Railway logs for demonstration
2. Extract trades from those logs
3. Save them to CSV for you

### TradingView API Issues

If you don't have a TradingView API key:
- The system will work in "mock mode"
- All TradingView operations will be simulated
- No actual API calls will be made

### CSV File Not Found

Run `node manage-trades.js extract` first to generate the CSV file.

## Advanced Usage

### Custom Log Parsing

You can modify `trade-logger.js` to parse different log formats:

```javascript
// Add custom parsing patterns
const customPattern = /TRADE EXECUTED: (\w+) at (\d+\.\d+)/;
const match = logContent.match(customPattern);
if (match) {
    // Extract trade details
}
```

### Custom Export Formats

Add export formats in `trade-logger.js`:

```javascript
// Export to JSON
function saveToJson(trades) {
    fs.writeFileSync('trades.json', JSON.stringify(trades, null, 2));
}

// Export to database
async function saveToDatabase(trades) {
    // Your database logic here
}
```

## Automating with Railway

Add these commands to your Railway deployment:

```json
{
  "deploy": {
    "startCommand": "node bot.js",
    "cronSchedule": "0 * * * *",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Then run the management commands after deployment:
```bash
# After Railway deployment, extract trades
node manage-trades.js extract
```

## Tips

1. **Regular Cleanup**: Run `node manage-trades.js cleanup` weekly to remove old logs
2. **Check Summary**: Run `node manage-trades.js summary` to monitor your trading performance
3. **Backup CSV**: Regularly backup your `trades/paper_trades.csv` file
4. **Monitor Logs**: Check `railway-logs/` for new deployment logs after each run

## Support

For issues or questions:
1. Check the troubleshooting section
2. Run `node manage-trades.js help` for command options
3. Review the generated CSV file for trade data

---

**Note**: This system is designed for paper trading only. Always test thoroughly before using real money.