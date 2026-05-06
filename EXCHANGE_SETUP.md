# Exchange Setup Guide

This guide helps you configure the bot to trade with Binance or Delta Exchange.

## Supported Exchanges

### 1. Binance
- **API Keys**: Get from https://www.binance.com/
- **Required Permissions**: Spot trading and/or Futures trading
- **Trade Modes**: spot, margin, futures

### 2. Delta Exchange
- **API Keys**: Get from https://delta.exchange/
- **Required Permissions**: Spot trading and/or Futures trading
- **Trade Modes**: spot, futures

## Environment Variables

### Required for Both Exchanges

```bash
# Trading Configuration
SYMBOL=BTCUSDT          # Trading pair
TIMEFRAME=15m           # Candle timeframe
PORTFOLIO_VALUE_USD=10000
MAX_TRADE_SIZE_USD=250
MAX_TRADES_PER_DAY=5
PAPER_TRADING=true     # Set to false for live trading
TRADE_MODE=future      # spot or futures
EXCHANGE=binance        # binance or delta
```

### Binance Configuration

```bash
# Binance API Credentials
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here
BINANCE_PASSPHRASE=your_passphrase_here
```

### Delta Exchange Configuration

```bash
# Delta Exchange API Credentials
DELTA_API_KEY=your_delta_api_key_here
DELTA_SECRET_KEY=your_delta_secret_key_here
DELTA_PASSPHRASE=your_delta_passphrase_here
```

## Setup Steps

### 1. Get API Keys

**For Binance:**
1. Log in to Binance
2. Go to API Management
3. Create API key
4. Enable trading permissions
5. For futures, also enable "Enable Futures" option

**For Delta Exchange:**
1. Log in to Delta Exchange
2. Go to API Keys
3. Create new API key
4. Assign appropriate permissions

### 2. Configure .env File

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials and preferences.

### 3. Select Exchange

Set the `EXCHANGE` variable in `.env`:
- `EXCHANGE=binance` for Binance
- `EXCHANGE=delta` for Delta Exchange

### 4. Test in Paper Trading Mode

Keep `PAPER_TRADING=true` while testing to avoid real money trading.

### 5. Switch to Live Trading

When ready:
1. Set `PAPER_TRADING=false`
2. Ensure you have sufficient balance
3. Monitor the bot closely initially

## Safety Features

The bot includes multiple safety checks:
- Session hours filter (8:00-17:00 UTC-4)
- Risk management with stop loss
- Trade limits per day
- Dealing Range validation
- Multiple technical indicator confirmations

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Check API key permissions
   - Ensure API key is not expired
   - Verify passphrase if required

2. **Order Placement Failures**
   - Check trading pair format (e.g., BTCUSDT)
   - Verify account has sufficient balance
   - Check if symbol is tradable on the exchange

3. **Network Issues**
   - Check internet connection
   - Verify API endpoints are accessible

### Debug Mode

To see detailed logs, check the output in console:
- Safety check results
- Indicator calculations
- Order placement attempts
- Trade decisions

## Support

For issues specific to:
- **Binance**: https://support.binance.com/
- **Delta Exchange**: https://support.delta.exchange/

For bot issues, check the generated logs and ensure all environment variables are set correctly.