# Ali Khan DRT Trading Bot

Automated trading bot based on Ali Khan's Dealing Range Theory (DRT) and ICT methodology.

## Features

- **DRT Strategy**: Implements Dealing Range Theory for identifying trading opportunities
- **ICT Indicators**: Fair Value Gaps (FVG), Order Blocks, Liquidity Zones
- **Risk Management**: ATR-based stop loss, position sizing, daily limits
- **Paper Trading**: Trade on paper before going live
- **Railway Deployment**: Cloud-based scheduling and execution

## Setup

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your API keys:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run the bot:
```bash
npm start
```

### Railway Deployment

1. Connect your Railway account
2. Deploy this repository
3. Set environment variables in Railway dashboard
4. The bot runs every 5 minutes automatically

## Configuration

### Environment Variables

- `PAPER_TRADING=true` for paper trading, `false` for live trading
- `SYMBOL=EURUSDT` trading pair
- `TIMEFRAME=15m` candle timeframe
- `MAX_TRADE_SIZE_USD=250` maximum trade size
- `MAX_TRADES_PER_DAY=5` daily trade limit

### Strategy Parameters

- `DRT_ENABLED=true` enable DRT strategy
- `DAILY_BIAS_LOOKBACK=3` lookback period for daily bias
- `PO3_CONFIRMATION_REQUIRED=2` Power of 3 confirmation required
- `ATR_PERIOD=14` ATR calculation period
- `STOP_LOSS_MULTIPLIER=2.5` ATR multiplier for stop loss

## Troubleshooting

### Common Issues

1. **No trades executed**:
   - Check if all safety conditions are met
   - Verify time filter (8:00-17:00)
   - Ensure dealing range is found
   - Check daily bias alignment

2. **Build failures on Railway**:
   - Verify all environment variables are set
   - Check API key validity
   - Ensure Node.js version compatibility

3. **API errors**:
   - Check API key permissions
   - Verify rate limits
   - Test API connectivity

### Debugging

Enable verbose logging by setting:
```bash
LOG_LEVEL=debug
```

Check the logs in Railway dashboard for detailed execution information.

## Safety Features

- Time-based trading window (8:00-17:00)
- Daily trade limits
- Risk management with ATR-based stops
- Dealing range validation
- Liquidity zone checks

## File Structure

- `bot.js` - Main trading bot
- `rules.json` - Strategy configuration
- `railway.json` - Railway deployment config
- `.env` - Environment variables
- `trades.csv` - Trade log (auto-generated)
- `safety-check-log.json` - Decision log (auto-generated)