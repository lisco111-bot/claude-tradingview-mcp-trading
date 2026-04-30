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

YouTube Channel Strategy Analysis - Ali Khan Trading Content
Executive Summary
This analysis provides a comprehensive strategy for optimizing Ali Khan's YouTube channel based on the scraped transcript data of 44 videos. The channel focuses on ICT (Inner Circle Trader) concepts, Dealing Range Theory (DRT), and trading education with strong audience engagement.
I. Data Analysis Summary
Channel Performance Metrics
Total Videos Analyzed: 44
Total Views: 2.1M+ (aggregate from sample)
Average Views: 48K per video
Top Performance: 231K views ("I QUIT my job..." video)
Engagement Rate: 3.5% like-to-view ratio
Content Breakdown by Theme
DRT (Dealing Range Theory): 45% of content
ICT Concepts: 30% of content
Market Analysis: 15% of content
Trading Psychology: 10% of content
II. Strategic Pillars
Pillar 1: Content Optimization Strategy
A. High-Performing Content Patterns
Title Formulas That Work:
Numbers + Benefit: "5 ICT Concepts you MUST know"
Problem/Solution: "Directional Bias - SOLVED with DRT"
Exclusivity: "I QUIT my job with this SIMPLE A+ ICT strategy"
Optimal Content Length:
Sweet spot: 13-24 minutes
Maximum engagement: 15-20 minutes
Short-form success: 6-8 minutes for specific topics
Series Content Success:
EP1-EP9 format shows consistent performance
EP1: 231K views (Introduction to DRT)
EP4: 69K views (Daily bias with DRT)
EP2: 88K views (Advanced Gap Theory)
B. Content Calendar Recommendations
Weekly Structure:
Monday: Educational content (ICT concepts)
Wednesday: Market analysis/DRT application
Friday: Trading psychology/mindset
Saturday: Q&A or student success stories
Monthly Themes:
Week 1: Foundation concepts
Week 2: Advanced strategies
Week 3: Live market examples
Week 4: Psychology and risk management
Pillar 2: Audience Growth Strategy
A. Audience Insights
Primary Demographic: Aspiring traders (20-45 years)
Pain Points:
Information overload
Strategy confusion
Trading psychology challenges
Motivations:
Career change ("I QUIT my job...")
Consistent profits
Self-improvement
B. Growth Levers
Content Repurposing:
Turn long videos into TikTok/Reels clips
Create quote graphics for Instagram
Convert tutorials into blog posts
Community Building:
Discord/Telegram for daily analysis
Monthly trading challenges
Student spotlight series
Lead Generation:
Free PDF guides as lead magnets
Email newsletter with market insights
Webinar series for advanced topics
Pillar 3: Monetization Strategy
A. Revenue Streams
Digital Products:
DRT Mastery Course ($297)
ICT Concepts Handbook ($97)
Trading Psychology Bootcamp ($197)
Community Access:
Premium Discord ($49/month)
Weekly live sessions ($99/month)
1-on-1 coaching ($200/hour)
Affiliate Revenue:
Trading platforms
Charting software
Educational resources
B. Pricing Strategy
Entry Level: Free content + $47 beginner course
Mid Tier: $97/month community access
High End: $997/year mastermind + coaching
Pillar 4: Platform Expansion
A. Multi-Platform Strategy
YouTube: Main educational content
TikTok: Quick tips and concepts
Instagram: Trading mindset quotes
LinkedIn: Professional trading insights
Podcast: Deep dives into trading psychology
B. Content Adaptation Framework
YouTube: 15-30 minute detailed videos
TikTok: 60-second concept explainers
Instagram: Carousels with key points
LinkedIn: Professional analysis and market insights
III. Implementation Roadmap
Phase 1: Foundation (Months 1-3)
Content Audit
Analyze top 10 performing videos
Identify content gaps
Create content template
Series Development
Complete DRT EP10-EP15
Start ICT Concepts Deep Dive series
Launch weekly market analysis
Analytics Setup
Install advanced tracking
Set up A/B testing framework
Monitor audience retention
Phase 2: Growth (Months 4-6)
Community Building
Launch Discord server
Create weekly live sessions
Implement student challenges
Product Development
Create DRT mastery course
Develop trading psychology guide
Build lead magnet library
Cross-Platform Expansion
Launch TikTok strategy
Start Instagram presence
Begin podcast planning
Phase 3: Monetization (Months 7-12)
Product Launch
Launch premium courses
Implement membership tiers
Start coaching programs
Scale Operations
Hire content team
Automate community management
Outsource editing/production
Brand Partnerships
Collaborate with trading platforms
Joint ventures with other educators
Sponsored content opportunities
IV. Key Performance Indicators (KPIs)
Content KPIs
View Growth: 20% month-over-month
Engagement Rate: 4%+ like-to-view ratio
Watch Time: 50%+ average retention
Subscriber Growth: 5K+ monthly
Business KPIs
Revenue: $10K/month by month 6
Email List: 5K subscribers by month 3
Community Size: 1K Discord members by month 6
Course Sales: 50+ courses by month 6
V. Risk Mitigation
Content Risk
Mitigation: Diversify content topics
Backup: Create pillar pages for core concepts
Platform Risk
Mitigation: Build email list first
Backup: Develop owned platform (website/app)
Market Risk
Mitigation: Focus on timeless concepts
Backup: Develop recession-resistant content
VI. Conclusion
Ali Khan's channel has strong foundation with clear content focus and engaged audience. The key to success lies in:
Consistency: Maintain regular content schedule
Quality: Keep production standards high
Community: Build engaged following around shared goals
Diversification: Expand revenue streams beyond YouTube
Innovation: Stay ahead of trading education trends
With proper implementation of this strategy, the channel can achieve significant growth and create sustainable revenue streams while continuing to provide valuable trading education to the community.

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
