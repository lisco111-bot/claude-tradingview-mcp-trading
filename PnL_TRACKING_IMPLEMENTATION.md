# Profit & Loss Tracking Implementation

## Overview
The trading bot has been updated to track profit and loss for all trades with timestamps recorded in UTC-4 timezone.

## Changes Made

### 1. Updated CSV Format
The trades.csv file now includes:
- **Date**: Trade date (YYYY-MM-DD)
- **Time (UTC)**: Trade time in UTC-4 (HH:MM:SS)
- **Exchange**: Trading exchange (DELTA EXCHANGE)
- **Symbol**: Trading pair (e.g., EURUSDT)
- **Side**: Buy/Sell direction
- **Quantity**: Asset quantity
- **Entry_Price**: Entry price
- **Exit_Price**: Exit price (blank for open trades)
- **Total_USD**: Total value in USD
- **Fee**: Trading fees
- **Net_Profit**: Net profit/loss (updated when trade closes)
- **Order_ID**: Unique order identifier
- **Mode**: PAPER/LIVE/BLOCKED
- **Duration**: Trade duration in minutes (for closed trades)
- **Notes**: Trade status and details

### 2. Added Tracking Files
- **open-trades.json**: Tracks all open positions
- **safety-check-log.json**: Decision logging (already existed)

### 3. New Functions Added
- `trackOpenTrade()`: Records new trades
- `checkTradeClosures()`: Monitors and closes trades
- `updateClosedTrade()`: Updates CSV with final P&L
- `loadOpenTrades()`: Loads open positions
- `saveOpenTrades()`: Saves open positions

### 4. Timezone Handling
All timestamps are converted to UTC-4:
```javascript
// Convert to UTC-4 timezone
const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
const utc4Time = new Date(utcTime - (4 * 3600000));
```

## Trade Flow

### 1. Entry
When trade conditions are met:
- Records entry price and time
- Calculates quantity and fees
- Saves to open-trades.json
- Logs entry to trades.csv

### 2. Monitoring
Bot continuously monitors:
- Open positions in open-trades.json
- Time-based closures (demo: 24 hours)
- Price movements for P&L calculation

### 3. Exit
When trade closes:
- Calculates final P&L
- Updates trades.csv with:
  - Exit price
  - Net profit/loss
  - Duration
  - "Closed" status

## Example Output

### Open Trade:
```
2026-04-30,07:15:26,BitGet,EURUSDT,BUY,85.470085,1.17,,100.00,0.1000,0.00,PAPER-TEST-001,PAPER,,"All conditions met - Open trade"
```

### Closed Trade:
```
2026-04-30,07:15:31,BitGet,EURUSDT,BUY,85.470085,1.17,1.18,100.00,0.1000,0.33,PAPER-TEST-001,PAPER,5m,"Closed: P&L $0.33"
```

## Key Features

1. **Real-time P&L**: Updates as prices change
2. **UTC-4 Timezone**: Consistent time recording
3. **Fee Tracking**: Includes trading fees in calculations
4. **Duration Tracking**: Records how long trades are open
5. **Status Tracking**: Shows open/closed/blocked status
6. **Tax Ready**: CSV format suitable for tax reporting

## Integration
The P&L tracking is fully integrated with:
- DRT strategy rules
- Risk management
- Trade execution
- Safety checks
- CSV logging

All trades are automatically tracked and reported in the trades.csv file with UTC-4 timestamps and accurate profit/loss calculations.
