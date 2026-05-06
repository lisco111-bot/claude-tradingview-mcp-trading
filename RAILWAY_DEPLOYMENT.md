# Railway Deployment Guide

## Fixed Issues

1. **Permission Denied Error**: The bot was trying to create a `.env` file on startup, which Railway's read-only filesystem doesn't allow.
   - Fixed by removing the file creation logic
   - Now uses environment variables directly

2. **File Write Permissions**: The application writes to several files:
   - `trades.csv` - trade log
   - `open_trades.json` - open trades storage  
   - `safety-check-log.json` - safety check logs
   
   **Solution**: When Railway is detected, the app uses in-memory storage instead of writing to files.

## Railway Configuration

### Environment Variables
Set these variables in Railway's Project Settings > Variables:

```bash
# Trading Configuration
PORTFOLIO_VALUE_USD=10000
MAX_TRADE_SIZE_USD=250
MAX_TRADES_PER_DAY=5
PAPER_TRADING=true
SYMBOL=EURUSDT
TIMEFRAME=15m
TRADE_MODE=future

# DRT Strategy Parameters
DRT_ENABLED=true
DAILY_BIAS_LOOKBACK=3
PO3_CONFIRMATION_REQUIRED=2
ATR_PERIOD=14
STOP_LOSS_MULTIPLIER=2.5
TAKE_PROFIT_RATIOS=1,2,3

# DELTA EXCHANGE API Credentials (use demo for testing)
DELTAEXCHANGE_API_KEY=
DELTAEXCHANGE_SECRET_KEY=
DELTAEXCHANGE_PASSPHRASE=
```

### railway.json
The app includes a `railway.json` configuration file with:
- Build using RAILPACK
- Cron schedule: Every hour (0 * * * *)
- Restart policy: ON_FAILURE with 3 retries
- All environment variables pre-configured

## Deployment Steps

1. **Deploy to Railway**
   ```bash
   railway login
   railway init
   railway up
   ```

2. **Set Environment Variables**
   - Go to your Railway project dashboard
   - Navigate to Settings > Variables
   - Add all the environment variables listed above
   - Make sure to set the correct values for your API keys

3. **Monitor Deployment**
   - Check the logs in Railway dashboard
   - The bot should start without the permission error
   - Trades will be logged in-memory (lost on restart)

## Notes

- **In-Memory Storage**: When running on Railway, trades are stored in memory only. This means:
  - No persistent data between restarts
  - No CSV file will be created
  - Good for testing and development
  - Not suitable for production use where data persistence is required

- **For Production Data Persistence**: Consider:
  - Using Railway's PostgreSQL add-on
  - Writing to a cloud storage service
  - Using a database instead of file storage

## Troubleshooting

If you encounter permission errors:
1. Check that all environment variables are set correctly
2. Verify the railway.json configuration
3. Look for "useInMemoryStorage: true" in the logs
4. Ensure you're using the latest version of the bot with these fixes
