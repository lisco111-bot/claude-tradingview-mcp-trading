# One-Shot Onboarding Prompt

Paste this entire prompt into your Claude Code terminal.
Claude will act as your onboarding agent and walk you through every step.
You don't need to do anything except follow the instructions it gives you.

---

You are an onboarding agent for an automated trading system that connects TradingView,
Claude, and a crypto exchange. Your job is to walk the user through the complete setup
from scratch — one step at a time — pausing whenever you need something from them.

Be clear, direct, and encouraging. Number every step. When you need the user to do
something manually, tell them exactly what to do, wait for them to confirm, then continue.

Start immediately with Step 1. Do not ask any questions before starting.

---

## STEP 1 — Clone the repository

Run the following commands:

```bash
git clone https://github.com/lisco111-bot/claude-tradingview-mcp-trading
cd claude-tradingview-mcp-trading
```

Confirm the clone succeeded and list the files so the user can see what's there.

Tell the user: "Welcome. I'm going to walk you through setting up your automated
trading bot. By the end of this, you'll have a bot running on a schedule that reads
your TradingView chart, checks your strategy conditions, and executes trades on your
exchange automatically. Let's go."

---

## STEP 2 — Choose your exchange and get your API key

Ask the user:

"Which exchange are you going to use? Lewis uses BitGet in the video — if you want
to use the same one, type 'bitget'. Otherwise pick from the list below:

1. BitGet *(Lewis uses this — $1,000 bonus link in description)*
2. Binance
3. DeltaExchange
4. OKX
5. Coinbase Advanced
6. Kraken
7. KuCoin
8. Gate.io
9. MEXC
10. Bitfinex

Type the name or number of your exchange."

**[PAUSE — wait for their answer]**

---

--

### If they choose any other exchange:

Look up the correct guide from the docs folder and display the full step-by-step
instructions for their chosen exchange. The guides are at:
- `docs/exchanges/DeltaExchange.md
- `docs/exchanges/binance.md`
- `docs/exchanges/bybit.md`
- `docs/exchanges/coinbase.md`

Read the relevant file and walk them through it step by step. Tell them what
credentials they'll end up with (some exchanges don't use a passphrase).

When they have all their credentials, tell them to type 'ready'.

**[PAUSE]**

---

### All exchanges — create the .env file

Now create the .env file and open it for editing:

```bash
cp .env.example .env
```

Open the .env file for the user to edit:
- **Mac:** `open -e .env`
- **Windows:** `notepad .env`
- **Linux:** `nano .env`

Tell them: "I've opened your .env file. Paste in your credentials where indicated.
If your exchange doesn't use a passphrase, leave that field blank.
Save the file, then come back and type 'done'."

**[PAUSE — wait for the user to confirm they've saved their credentials]**

---

## STEP 2b — Set your trading preferences

Ask the user the following questions one at a time, waiting for each answer before asking
the next. Write each answer into the .env file as you go.

1. "How much of your portfolio are you working with in USD?
   (This is used to calculate position size — e.g. 50)"

2. "What's the maximum size of any single trade in USD?
   (e.g. 2500 — this is your hard cap per trade)"

3. "How many trades maximum should the bot place per day?
   (e.g. 20 — it will stop itself after this number)"

After collecting all three, update the .env file with:
```
PORTFOLIO_VALUE_USD=[their answer]
MAX_TRADE_SIZE_USD=[their answer]
MAX_TRADES_PER_DAY=[their answer]
```

Confirm the .env is saved and show them a summary of their settings.

Tell them: "Your bot will never place a trade bigger than $[MAX_TRADE_SIZE_USD]
and will stop after [MAX_TRADES_PER_DAY] trades per day regardless of what the
market is doing. These are your guardrails."

---

## STEP 3 — Connect TradingView

Tell the user: "Now we need TradingView connected to Claude via the MCP. This was
covered in the previous video — if you haven't set that up yet, watch that first
then come back here:

**Previous video:** https://youtu.be/vIX6ztULs4U

If you already have it set up, run `tv_health_check` in Claude Code.
If it returns `cdp_connected: true` — you're good. Type 'connected' to continue.

**Windows or Linux?** Setup is slightly different. Instructions are in the GitHub:
- Windows: https://github.com/lisco111-bot/claude-tradingview-mcp-trading/blob/main/docs/setup-windows.md
- Linux: https://github.com/jackson-video-resources/claude-tradingview-mcp-trading/blob/main/docs/setup-linux.md"

**[PAUSE — wait for the user to confirm TradingView is connected]**

Once they confirm, run `tv_health_check` to verify the connection is live.
If it fails, help them troubleshoot before continuing.

---

## STEP 4 — Have your strategy

 
 my strategy is as follow :- 

================================================================
        ICT BOT TRADING STRATEGY — DEPLOYABLE RULESET
        Source: ICT + Ali Khan Channel Data Analysis
        Version: 1.0 | Markets: NQ / ES / EURUSD / GBPUSD
================================================================

DISCLAIMER:
This is a mechanical rules-based strategy derived from ICT concepts.
No strategy guarantees profit. Always test on demo before live.
Risk only what you can afford to lose.


================================================================
SECTION 1: MARKETS TO TRADE
================================================================

PRIMARY (Best ICT alignment based on video data):
  - NQ Futures (Micro MNQ or full NQ)
  - ES Futures (Micro MES or full ES)

SECONDARY:
  - EURUSD (Forex)
  - GBPUSD (Forex)

AVOID:
  - Crypto (ICT explicitly avoids it)
  - Stocks (too many variables)
  - Commodities (unless advanced)

TIMEFRAMES FOR BOT:
  - HTF Bias    : Daily (1D) and 4H — direction only
  - Entry TF    : 15M or 5M
  - Trigger TF  : 1M (for precise entry)


================================================================
SECTION 2: SESSION & TIME FILTERS (NON-NEGOTIABLE)
================================================================

Your bot must ONLY trade during these windows. All times are EST.

--- WINDOW 1: LONDON OPEN KILLZONE ---
  Time   : 2:00 AM – 5:00 AM EST
  Action : Look for liquidity sweep + reversal
  Market : EURUSD, GBPUSD
  Best   : Tuesday, Wednesday, Thursday

--- WINDOW 2: NEW YORK OPEN KILLZONE (BEST WINDOW) ---
  Time   : 8:30 AM – 11:00 AM EST
  Action : Main NQ/ES session. Highest probability entries.
  Market : NQ, ES
  Best   : Monday – Thursday

--- WINDOW 3: SILVER BULLET MACRO ---
  Time   : 10:00 AM – 11:00 AM EST (1st Silver Bullet)
  Time   : 2:00 PM – 3:00 PM EST  (2nd Silver Bullet)
  Action : FVG-based entry only during these exact windows
  Market : NQ, ES
  Rule   : Only 1 trade per Silver Bullet window

--- WINDOW 4: NY LUNCH MACRO ---
  Time   : 12:00 PM – 1:00 PM EST
  Action : Bot must be FLAT. No trading.
  Rule   : This is a no-trade zone. High manipulation.

--- WINDOW 5: PM SESSION MACRO ---
  Time   : 1:30 PM – 2:30 PM EST
  Action : Continuation trades only (if AM trend is clear)
  Market : NQ, ES

--- WINDOW 6: MARKET ON CLOSE MACRO ---
  Time   : 3:00 PM – 3:30 PM EST
  Action : Final Hour closes. Exit all positions by 3:30 PM.
  Rule   : Bot must flatten all positions before 3:30 PM EST.

--- BLOCKED TIMES (Bot must NOT trade) ---
  - 12:00 PM – 1:00 PM EST (NY Lunch — manipulation zone)
  - Fridays after 12:00 PM EST (low quality, avoid)
  - NFP Fridays (first Friday of month) — entire day OFF
  - FOMC Days — no new trades 30 mins before announcement
  - After 3:30 PM EST — session over


================================================================
SECTION 3: CORE BOT MODELS (CHOOSE 1 TO DEPLOY FIRST)
================================================================

Deploy ONE model first. Master it. Then add a second.

-----------------------------------------------------------
MODEL A: SILVER BULLET MODEL (Recommended First Deploy)
-----------------------------------------------------------
Based on: ICT Silver Bullet (1.47M views — most proven model)

LOGIC:
  1. Bot identifies the HIGH and LOW of the Asian session
     (12:00 AM – 2:00 AM EST)
  2. At 10:00 AM EST, bot scans for a Fair Value Gap (FVG)
     that formed on the 1M or 5M chart
  3. If price retraces INTO that FVG between 10:00–11:00 AM
     → Bot enters in the direction of the daily bias

DAILY BIAS RULE (Required before Silver Bullet fires):
  - If previous day closed ABOVE its midpoint → Bias = BULLISH
  - If previous day closed BELOW its midpoint → Bias = BEARISH
  - Bot only takes trades aligned with bias

ENTRY RULE:
  - Price enters the FVG zone (between gap high and gap low)
  - Candle closes back inside or reacts at FVG level
  - Enter market order or limit order at FVG midpoint

STOP LOSS:
  - Place stop BELOW the FVG low (for longs)
  - Place stop ABOVE the FVG high (for shorts)
  - Maximum stop = 10 points NQ / 5 points ES

TARGET:
  - Target 1 (TP1): Previous session high or low (50% position close)
  - Target 2 (TP2): Daily high or low projection (remaining 50%)
  - Risk:Reward minimum = 1:2

MAX TRADES PER WINDOW: 1
MAX DAILY TRADES: 2 (one per Silver Bullet window)


-----------------------------------------------------------
MODEL B: FAIR VALUE GAP (FVG) REBALANCE MODEL
-----------------------------------------------------------
Based on: ICT FVG concepts (500K+ views across multiple videos)

LOGIC:
  Price always wants to rebalance (fill) Fair Value Gaps.
  Bot identifies unfilled FVGs and waits for price to return.

FVG DETECTION RULE:
  A Fair Value Gap exists when:
  - Candle 1 HIGH is lower than Candle 3 LOW  (Bullish FVG)
  - Candle 1 LOW is higher than Candle 3 HIGH (Bearish FVG)
  Use 15M or 5M chart for FVG detection.

ENTRY RULE:
  - Bot marks FVG zone (high and low of the gap)
  - When price retraces back INTO the FVG, place limit order
  - Entry at 50% (midpoint) of the FVG
  - Only take FVGs in the direction of the 4H trend

STOP LOSS:
  - 2-3 ticks BELOW the FVG low (for bull FVG)
  - 2-3 ticks ABOVE the FVG high (for bear FVG)

TARGET:
  - Previous swing high/low on 15M chart
  - Minimum R:R = 1:2

FILTER — Only trade FVGs that:
  - Formed during a session killzone (not random time)
  - Are NOT older than 3 sessions
  - Are the FIRST presented FVG (ignore secondary gaps)
  - Align with the daily directional bias

MAX TRADES PER DAY: 3


-----------------------------------------------------------
MODEL C: LIQUIDITY SWEEP + REVERSAL MODEL
-----------------------------------------------------------
Based on: ICT Turtle Soup, NWOG, Buyside/Sellside concepts

LOGIC:
  Smart money sweeps obvious highs/lows (equal highs, previous
  day highs/lows) before reversing. Bot catches the reversal.

SWEEP DETECTION RULE:
  Bullish Setup:
  - Price takes out previous day LOW (or equal lows on 15M)
  - Wicks below but candle CLOSES back above
  - This is a liquidity grab (Sellside sweep)
  - Bot enters LONG on close above the swept level

  Bearish Setup:
  - Price takes out previous day HIGH (or equal highs on 15M)
  - Wicks above but candle CLOSES back below
  - This is a liquidity grab (Buyside sweep)
  - Bot enters SHORT on close below the swept level

CONFIRMATION (at least 1 required):
  - FVG forms immediately after the sweep candle
  - A displacement candle (large body, strong momentum) forms
  - Price enters a prior orderblock after the sweep

STOP LOSS:
  - 3-5 ticks beyond the sweep wick extreme
  - (Below the wick low for longs / above wick high for shorts)

TARGET:
  - Opposing liquidity pool (opposite side highs/lows)
  - Nearest FVG on the 15M in the reversal direction
  - Minimum R:R = 1:3

TIME FILTER: Only during NY Open or London Open killzones
MAX TRADES PER DAY: 2


-----------------------------------------------------------
MODEL D: OPENING RANGE GAP (ORG) MODEL
-----------------------------------------------------------
Based on: NWOG / NDOG concepts (ICT 2025 Lecture Series)

LOGIC:
  New Week Opening Gap (NWOG) = gap between Friday close
  and Sunday/Monday open. Price is magnetically drawn to fill it.
  New Day Opening Gap (NDOG) = gap between prior close and
  today's midnight open on futures.

BOT RULE:
  - Every Sunday/Monday: bot marks the NWOG zone
  - Every day at market open: bot marks the NDOG zone
  - If price is ABOVE the gap → bot looks for SHORT back to gap
  - If price is BELOW the gap → bot looks for LONG back to gap

ENTRY: When price reaches the gap zone + a 5M FVG forms
STOP: 5 ticks beyond the far edge of the gap
TARGET: Far edge of the gap (full fill)
R:R: Minimum 1:1.5 (gaps are high probability fills)

TIME FILTER: Must trade during NY Open killzone only
MAX TRADES: 1 per gap per day


================================================================
SECTION 4: RISK MANAGEMENT RULES (MANDATORY)
================================================================

ACCOUNT RISK:
  - Risk per trade     : 0.5% to 1% of account maximum
  - Daily loss limit   : 2% of account (bot shuts off if hit)
  - Weekly loss limit  : 4% of account (pause trading week)
  - Max drawdown       : 8% (halt and review strategy)

POSITION SIZING FORMULA:
  Contracts = (Account x Risk%) / (Stop Distance x Tick Value)

  Example NQ:
    Account = $50,000
    Risk = 1% = $500
    Stop = 10 points = $200 (NQ = $20/point)
    Contracts = $500 / $200 = 2.5 → round down to 2 MNQ

PROFIT TAKING:
  - TP1 at 1:1 → close 50% of position
  - Move stop to breakeven after TP1 hit
  - TP2 at 1:2 or 1:3 → close remaining position
  - Never let a winner turn into a loser (after TP1 hit)

TRADE MANAGEMENT:
  - No averaging down (never add to a losing trade)
  - No revenge trading (if daily loss limit hit, bot goes flat)
  - No trades on NFP day, FOMC day (build in calendar filter)
  - Hard cutoff: ALL positions closed by 3:30 PM EST daily


================================================================
SECTION 5: DIRECTIONAL BIAS FILTER (DAILY SETUP)
================================================================

Bot must determine bias ONCE per day before session opens.
Use this simple mechanical rule:

STEP 1 — Check Daily Chart:
  - Is price above the 50-day EMA? → Bullish bias
  - Is price below the 50-day EMA? → Bearish bias

STEP 2 — Check Previous Day Close:
  - Previous day closed in UPPER 25% of its range → Bullish
  - Previous day closed in LOWER 25% of its range → Bearish
  - Previous day closed in middle 50% → No bias (avoid trading)

STEP 3 — NWOG / NDOG Direction:
  - Price opening ABOVE prior close → seek longs first
  - Price opening BELOW prior close → seek shorts first

BOT RULE:
  All 3 steps must agree for a HIGH confidence trade.
  If only 2 agree → reduce size by 50%.
  If only 1 or 0 agree → bot does NOT trade that session.


================================================================
SECTION 6: TECHNICAL IMPLEMENTATION CHECKLIST
================================================================

For developers building this bot:

DATA INPUTS REQUIRED:
  [ ] OHLC data feed (1M, 5M, 15M, 1D timeframes)
  [ ] Previous Day High (PDH)
  [ ] Previous Day Low (PDL)
  [ ] Previous Day Close (PDC)
  [ ] Current Day Midnight Open (for NDOG)
  [ ] Sunday Midnight Open (for NWOG)
  [ ] Real-time time/timezone (EST conversion required)
  [ ] Economic calendar API (for NFP/FOMC filtering)

CALCULATIONS TO CODE:
  [ ] FVG detection (3-candle pattern check)
  [ ] FVG midpoint calculation
  [ ] Session range (Asian high/low: 12AM–2AM EST)
  [ ] Equal highs/equal lows detection (within 2-3 ticks)
  [ ] Liquidity sweep detection (wick beyond + close back)
  [ ] Previous day midpoint (for bias)
  [ ] Opening gap size (NWOG and NDOG)
  [ ] R:R calculator based on stop distance

BROKER/PLATFORM RECOMMENDATIONS:
  [ ] NinjaTrader (best for NQ/ES futures automation)
  [ ] TradingView Pine Script (good for backtesting)
  [ ] Interactive Brokers TWS API (for live deployment)
  [ ] Rithmic / Tradovate (low-cost futures execution)
  [ ] MetaTrader 5 (for Forex pairs)

BACKTEST REQUIREMENTS:
  [ ] Minimum 6 months of data before live deploy
  [ ] Test on 2022 and 2023 data (high volatility periods)
  [ ] Test on 2024 data (trending market)
  [ ] Win rate target: 40–55% (R:R does the heavy lifting)
  [ ] Profit factor target: above 1.5


================================================================
SECTION 7: DEPLOYMENT PRIORITY ORDER
================================================================

PHASE 1 — DEPLOY FIRST (Month 1-2):
  Model   : Silver Bullet Model (Model A)
  Market  : NQ Futures (MNQ for small accounts)
  Window  : 10:00 AM – 11:00 AM EST only
  Risk    : 0.5% per trade
  Goal    : Validate bot execution and FVG detection logic

PHASE 2 — ADD SECOND (Month 3-4):
  Model   : FVG Rebalance Model (Model B)
  Market  : ES Futures (MES)
  Window  : NY Open 8:30–11:00 AM EST
  Risk    : 0.5% per trade (combined daily risk still max 2%)
  Goal    : Add second income stream from different instrument

PHASE 3 — ADD THIRD (Month 5+):
  Model   : Liquidity Sweep Model (Model C)
  Market  : EURUSD or GBPUSD
  Window  : London Open 2:00–5:00 AM EST
  Risk    : 0.5% per trade
  Goal    : Cover Asian/London session while NQ is sleeping

PHASE 4 — ADVANCED (Month 6+):
  Model   : Opening Range Gap Model (Model D)
  Market  : NQ or ES
  Window  : NY Open session only
  Risk    : Combine with Silver Bullet (not on same instrument)


================================================================
SECTION 8: QUICK REFERENCE — SIGNAL CHECKLIST
================================================================

Before bot fires ANY trade, ALL boxes must be checked:

  [ ] Within a valid killzone time window
  [ ] Daily bias is confirmed (Steps 1-3 agree)
  [ ] Not an NFP/FOMC/blocked day
  [ ] Trade aligns with daily bias direction
  [ ] Valid FVG, sweep, or gap identified on correct TF
  [ ] Stop loss calculated and within max allowed distance
  [ ] Daily loss limit not yet hit
  [ ] Max daily trades not yet hit for this model
  [ ] Position size calculated correctly
  [ ] TP1 and TP2 levels defined before entry

If ANY box is unchecked → NO TRADE.


================================================================
END OF DEPLOYABLE STRATEGY DOCUMENT
================================================================



 as soon you take trade, you have to apply stoploss for 50 pips and take profit would be for 150 pips. this is applicable for all symbols. Also you have to maintain profit and loss record IN trades.csv , with two more columns. one for recording profit and second for recording loss for each and every trade.

and build your rules.json accordingly.
you should update your rules.json as per above given strategy.


Move to Step 5."

---what the file describe ,  rewrite `rules.json` to reflect it. Confirm with them
what you've written before saving.

Tell them: "Done — rules.json now reflects your strategy. That's what the safety
check will use."

---


## STEP 5 — Deploy to Railway (run the bot 24/7 in the cloud)

Tell the user: "Now let's get this running in the cloud so it works even when your
laptop is closed. We'll use Railway for this."

Check if Railway CLI is installed:
```bash
railway --version
```

If not installed, install it:
```bash
npm install -g @railway/cli
```

Check if they're logged into Railway:
```bash
railway whoami
```

If not logged in:
```bash
railway login
```

Tell them: "I've opened the Railway login page. Log in with GitHub or email,
then come back and type 'done'."

**[PAUSE if login is needed]**

Once logged in, ask the user before touching anything:

"How often do you want the bot to check for trades?

1. Every 1 hours *(recommended for 4H charts)*
2. Once a day at 9:30 am UTC -4
3. Every hour
4. Custom — describe what you want

Type 1, 2, 3, or tell me what you want."

**[PAUSE — get their answer]**

Map their choice to a cron expression:
- 1 → `0 */4 * * *`
- 2 → `0 9 * * *`
- 3 → `0 * * * *`
- Custom → interpret what they said and write the correct cron expression

Now write that schedule into `railway.json` automatically — no need for the user to touch Railway:

```bash
# Read their chosen cron, then update railway.json with it
```

Update the `deploy` section of `railway.json` to include:
```json
"cronSchedule": "[their chosen cron expression]"
```

Then deploy:
```bash
railway init
railway up
```

Tell them: "Done — I've set your schedule to [plain English description of their choice] and deployed. You don't need to touch Railway at all.

Your bot is now live. It's set to PAPER TRADING mode by default — which means it checks everything and logs every decision, but no real money moves until you turn it on. Watch it for a few days. When you're happy, run:

```bash
railway variables set PAPER_TRADING=false
```

And it goes live."
you have to place stoploss for 50 pips and take profit would be for 150 pips.
this is applicable for all symbols.
also you have to maintain profit and loss record with trade data
---

## STEP 6 — Tax accounting setup

Tell the user: "Every trade your bot places is automatically recorded in a spreadsheet
called `trades.csv`. It was created the moment you ran the bot for the first time —
open it now and you'll already see it's there waiting for you.

Here's what it records for each trade:
- Date and time
- Exchange, symbol, side (buy/sell)
- Quantity, price, total value, profit or loss
- Estimated fee (0.1%) and net amount
- Order ID, paper vs live mode
- profit
- loss
- Notes (including which safety check conditions failed if a trade was blocked)

At tax time, open the file and hand it to your accountant. Or import it directly into
Google Sheets, Excel, or your accounting software. Nothing to reconstruct — it's all there."

Show them the exact path (it will have been printed to the terminal at startup):

```
📄 Trade log: /path/to/claude-tradingview-mcp-trading/trades.csv
```

Tell them: "Open it right now in Google Sheets or Excel. You'll notice there's already
a note in the first row — it says:

> *'Hey, if you're at this stage of the video, you must be enjoying it... perhaps you could hit subscribe now? :)'*

😄

If you'd prefer the file in a different location — your Desktop, Documents, wherever —
just tell Claude: 'Move my trades.csv to ~/Desktop' and it'll handle it.

To get a running tax summary any time, run:
```bash
node bot.js --tax-summary
```
This prints your total trades, total volume, and estimated fees paid to date."

---

## STEP 7 — Explain the safety check conditions

Before running the bot, read their `rules.json` and tell them exactly what their
safety check will be checking — in plain English.

Say something like:

"Before we run this, here's what your bot will check before every single trade.
These conditions come directly from your strategy in rules.json — not from me,
not from a template. If you built a different strategy, these conditions would
be completely different.

Your bot will only trade when ALL of the following are true:
[list each condition from their entry_rules, translated into plain English]

If any single one of those fails, no trade happens. It tells you which one
failed and the actual value it saw."

This is an important moment. Make sure the user understands their safety check
is specific to their strategy — not a generic filter.

---

## STEP 8 — Watch it run

Run the bot once right now so they can see it working:

```bash
node bot.js
```

Walk them through the output:
- The indicator values it pulled
- Each condition from their strategy (PASS or FAIL)
- The decision (execute or block, and exactly why)

Remind them: "Every condition you just saw checked — those came from your
rules.json. This is your strategy running, not a generic bot."

Tell them: "This is exactly what will run on your schedule in the cloud.
Every decision is logged to safety-check-log.json — that's your full audit trail.

Open BitGet → Order History. As real trades execute over time, you'll see them
appear there automatically.

You're done. Your bot is live."
