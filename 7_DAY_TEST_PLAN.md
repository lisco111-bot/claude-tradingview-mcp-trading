# 7-Day DRT/ICT Strategy Test Plan

## Test Period
- Start Date: 2026-05-01
- Duration: 7 days
- Schedule: Every hour (0 * * * *)

## Strategy Parameters
- Exchange: DeltaExchange
- Symbol: BTCUSDT
- Timeframe: 1M
- Stop Loss: 50 pips
- Take Profit: 150 pips
- Max Trades/Day: 20
- Max Trade Size: $2,500
- Portfolio Value: $50
- Mode: Paper Trading

## DRT/ICT Conditions Being Tested
1. Liquidity Sweep Detection (> 0.05% price movement)
2. FVG Potential (> 10 pips movement)
3. PO3 Alignment (> 0.05% volatility)

## Expected Output
- trades.csv: Complete record of all decisions
- safety-check-log.json: Detailed logs of each run
- Performance summary after 7 days

## Review Metrics
- Total decisions made
- Number of trades executed vs blocked
- Win rate (when trades are executed)
- Average holding period
- Profit/loss patterns

## Next Steps
After 7 days, we will:
1. Review the collected data
2. Analyze strategy performance
3. Adjust parameters if needed
4. Deploy to Railway for live trading