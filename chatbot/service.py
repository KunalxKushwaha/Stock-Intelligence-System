import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

SYSTEM_KNOWLEDGE_PROMPT = """
You are "AlphaBot", an approachable, authentic, and sharp Quantitative Copilot embedded inside the "AI Stock Intelligence & Multi-Asset Terminal" (v2.9.3).

YOUR PERSONA & TONE:
- Balance empathy with grounded candor: act like a helpful, quantitative peer sitting next to the user—not a rigid textbook or lecturing professor.
- Avoid unnecessary, dense financial jargon. When you must mention terms like Delta, Theta, HMM Regimes, or Conformal Bounds, explain them simply using intuitive real-world analogies.
- Keep answers punchy, clear, and actionable.

CORE PLATFORM KNOWLEDGE:
1. Charting & Pine Script: TradingView Lightweight charts supporting SMA, Bollinger Bands, and a "⚡ Pine Script" editor for custom mathematical price studies (e.g., `Close * 1.015`).
2. Backtesting: Click '📈 Backtest'. Simulates historical performance of the XGBoost + Conformal Quantile Strategy vs Buy & Hold over 180 sessions. Output metrics: Final Value, Strategy Return %, Outperformance %, and Sharpe Ratio (reward earned per unit of volatility).
3. Conformal Safety Floors: The 90% Safety Floor (5th percentile) and Upside Ceiling (95th percentile) are mathematically computed risk boundaries derived from empirical quantile regression.
4. Options Chains & Greeks: Click '⛓️ Options & Greeks'. Real-time Black-Scholes calculations:
   - Delta: Price sensitivity (how much option price changes if the stock moves $1.00).
   - Theta: Time decay (the daily rent lost as expiration approaches).
   - Gamma: Acceleration of Delta.
   - Vega: Sensitivity to Implied Volatility shifts.
   - IV Smile: Displays volatility skew. Out-of-the-money puts have higher IV because institutions pay a premium for downside crash protection.
5. Broker Router: Click '⚡ Broker Router' to stage paper/simulated orders with Market/Limit types and Stop-Loss / Take-Profit bracket controls.

CRITICAL INSTRUCTIONS:
- PnL CALCULATIONS: When the user asks about buying shares or profit/loss, DO THE ACTUAL ARITHMETIC step-by-step using the live prices in context. Show total investment, projected return at Target Price, and downside exposure at the 90% Safety Floor.
- BOUNDARIES: If the user asks about off-topic tasks (general coding, sports, cooking, politics, general trivia), politely and warmly decline, steering them back to the terminal.
- ADVICE: If asked "Should I go all in?", candidly remind them that no model is infallible and emphasize risk-managed position sizing.
"""

def query_llm_api(system_prompt: str, user_prompt: str, context: dict = None) -> dict:
    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    ctx = context or {}
    ticker = ctx.get("ticker", "AAPL")

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Question:\n{user_prompt}"}]}
                ]
            }
            resp = requests.post(url, json=payload, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                reply = data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "reply": reply,
                    "follow_ups": [
                        f"Calculate PnL for 25 shares of {ticker}",
                        f"What is the 90% Safety Floor for {ticker}?",
                        f"Explain Black-Scholes Greeks for {ticker}"
                    ]
                }
        except Exception as e:
            print(f"⚠️ Gemini API query exception: {e}")

    if groq_key:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            if resp.status_code == 200:
                reply = resp.json()["choices"][0]["message"]["content"]
                return {
                    "reply": reply,
                    "follow_ups": [
                        f"Calculate PnL for 25 shares of {ticker}",
                        f"What is the 90% Safety Floor for {ticker}?",
                        f"Explain Black-Scholes Greeks for {ticker}"
                    ]
                }
        except Exception as e:
            print(f"⚠️ Groq API query exception: {e}")

    return generate_offline_fallback(user_prompt, context)

def generate_offline_fallback(user_prompt: str, context: dict = None) -> dict:
    p_lower = user_prompt.lower()
    ctx = context or {}
    
    ticker = ctx.get('ticker') or 'AAPL'
    company_name = ctx.get('company_name') or ticker
    curr_p = float(ctx.get('current_price') or 305.59)
    tgt_p = float(ctx.get('target_price') or round(curr_p * 1.022, 2))
    lower_p = float(ctx.get('lower_bound') or round(curr_p * 0.975, 2))
    upper_p = float(ctx.get('upper_bound') or round(curr_p * 1.062, 2))
    verdict = ctx.get('verdict') or 'Strong Buy'
    regime = ctx.get('regime') or 'Low Volatility / Bullish'

    # 1. High Priority: Scope Guardrail Refusal
    off_topic_triggers = [
        "scrape", "reddit", "world cup", "recipe", "python script", "weather", 
        "who won", "movie", "song", "joke", "capital of", "president", 
        "write a python", "write a code", "java", "c++", "translate"
    ]
    if any(k in p_lower for k in off_topic_triggers) and not any(k in p_lower for k in ["pine", "stock", "terminal", "greek", "options", "trading"]):
        return {
            "reply": (
                "I'd love to chat about that, but my focus is strictly dedicated to this trading terminal and market analytics!\n\n"
                f"I don't handle general Python scripting, web scraping, sports trivia, or cooking recipes. "
                f"However, if you'd like to write a Pine Script study for {ticker}, calculate trade risk, "
                "or inspect options chains, I'm all in!"
            ),
            "follow_ups": [
                f"Calculate PnL for 25 shares of {ticker}",
                f"What is the 90% Safety Floor for {ticker}?",
                f"How do I open the Options Chain for {ticker}?"
            ]
        }

    # 2. Custom Technical Indicators & Pine Script Editor
    if any(k in p_lower for k in ["indicator", "script", "study", "pine", "plot", "formula", "draw"]) or ("custom" in p_lower and "indicator" in p_lower):
        return {
            "reply": (
                f"To write and plot custom technical indicators for **{ticker}**:\n\n"
                "1. Look at the chart toolbar directly above the main candlestick pane.\n"
                "2. Click the **'⚡ Pine Script'** button to expand our embedded study editor.\n"
                "3. Type your custom mathematical expression using price series keywords (e.g., `Close * 1.015` or pick a preset like Dual SMA Crossover from the dropdown).\n"
                "4. Click **Compile & Plot Study** to execute the script and render your custom study line directly on the live chart!"
            ),
            "follow_ups": [
                "What presets are available in the Pine Script editor?",
                f"How do I toggle Bollinger Bands or SMA for {ticker}?",
                f"What do the current RSI and MACD indicators show for {ticker}?"
            ]
        }

    # 3. PnL and Profit/Loss Math Queries
    if any(k in p_lower for k in ["profit", "loss", "pnl", "calculate", "buy", "shares", "invest", "return"]):
        match = re.search(r'(\d+)\s*(?:shares|units|stocks)?', p_lower)
        qty = int(match.group(1)) if match else 25

        entry_val = round(qty * curr_p, 2)
        exit_val = round(qty * tgt_p, 2)
        gain = round(exit_val - entry_val, 2)
        gain_pct = round(((tgt_p - curr_p) / curr_p) * 100, 2)
        
        downside_val = round(qty * lower_p, 2)
        risk_loss = round(entry_val - downside_val, 2)
        risk_pct = round(((curr_p - lower_p) / curr_p) * 100, 2)

        return {
            "reply": (
                f"Here is your trade breakdown for **{qty} shares** of **{company_name} ({ticker})**:\n\n"
                f"• **Entry Cost:** {qty} × ${curr_p:.2f} = **${entry_val:,.2f}**\n"
                f"• **Projected Exit (AI Target Price):** {qty} × ${tgt_p:.2f} = **${exit_val:,.2f}**\n"
                f"• **Net Profit:** **+${gain:,.2f}** (+{gain_pct}%)\n\n"
                f"🛡️ **Downside Risk Check:**\n"
                f"The 90% Safety Floor sits at **${lower_p:.2f}**. If the price dips to that bound, "
                f"your modeled loss is **-${risk_loss:,.2f}** (-{risk_pct}%).\n\n"
                f"You can stage this order with automated stop-loss protection in the **⚡ Broker Router** modal!"
            ),
            "follow_ups": [
                f"What if I buy 50 shares of {ticker}?",
                f"How do I set a stop-loss at ${lower_p:.2f} in the Broker Router?",
                f"What does the 90% Safety Floor mean for {ticker}?"
            ]
        }

    # 4. Safety Floor & Quantile Bounds
    if any(k in p_lower for k in ["safety floor", "floor", "downside", "ceiling", "conformal", "bound", "risk"]):
        return {
            "reply": (
                f"Think of the **90% Safety Floor** as an objective statistical shock-absorber for **{ticker}**.\n\n"
                f"Instead of giving an arbitrary guess, our Conformal Quantile model analyzes market volatility "
                f"and historical variance to tell you: *'In 90% of modeled outcomes, the price will not fall below this floor over the next session.'*\n\n"
                f"• **Current Safety Floor:** **${lower_p:.2f}**\n"
                f"• **Upside Ceiling:** **${upper_p:.2f}**\n"
                f"• **Current Market Regime:** **{regime}**\n\n"
                f"If you are opening a position on {ticker}, placing a Stop-Loss just below this floor helps you avoid getting shaken out by normal noise."
            ),
            "follow_ups": [
                f"Calculate my downside loss if {ticker} drops to ${lower_p:.2f}",
                f"How does the {regime} regime affect price volatility?",
                "How do I stage a bracket order in the Broker Router?"
            ]
        }

    # 5. Greeks Explanations (Delta, Theta, Vega, Gamma)
    if any(k in p_lower for k in ["delta", "theta", "gamma", "vega", "greek"]):
        return {
            "reply": (
                f"Here is a plain-English cheat sheet for the Greeks in our **⛓️ Options & Greeks** suite for **{ticker}**:\n\n"
                "• **Delta:** Your price speedometer. If Delta is 0.50, your option gains roughly $0.50 whenever the stock rises by $1.00.\n"
                "• **Theta:** The daily rent. Options lose value every day as expiration approaches. A Theta of -0.05 means the contract loses 5 cents a day simply from time passing.\n"
                "• **Gamma:** How fast your Delta accelerates as the stock moves.\n"
                "• **Vega:** Volatility sensitivity. Tells you how much option prices swing when Implied Volatility (IV) changes by 1%.\n\n"
                "Open **'⛓️ Options & Greeks'** in the top bar to inspect these live across all strikes!"
            ),
            "follow_ups": [
                f"Why is the IV higher for out-of-the-money puts on {ticker}?",
                "Which expiration has the highest Theta decay rate?",
                f"What strike is currently At-The-Money (ATM) for {ticker}?"
            ]
        }

    # 6. Volatility Smile / Skew Explanations
    if any(k in p_lower for k in ["smile", "skew", "out-of-the-money", "otm", "put"]):
        return {
            "reply": (
                f"The **IV Smile** is essentially the market's insurance pricing curve for **{ticker}**.\n\n"
                f"Out-of-the-money (OTM) puts show higher Implied Volatility because institutional funds pay a premium "
                f"for disaster crash protection. That elevated demand bids up put premiums, creating the distinctive 'smirk'.\n\n"
                f"Notice that shorter expirations (like **7 Days**) have a steeper curve than **90 Days**—panic hedging is much more acute in the near term!"
            ),
            "follow_ups": [
                "Why does the 7-day expiration curve look steeper than 90-day?",
                "Explain Delta and Theta in plain English",
                f"Show expected move for {ticker}"
            ]
        }

    # 7. Backtesting & Sharpe Ratio
    if any(k in p_lower for k in ["backtest", "sharpe", "historical", "benchmark"]):
        return {
            "reply": (
                "To test historical strategy viability:\n"
                "1. Click **'📈 Backtest'** in the top navigation bar.\n"
                "2. The platform automatically simulates our XGBoost + Conformal strategy over the past 180 trading days against a plain Buy & Hold benchmark ($10,000 baseline start).\n\n"
                "**What the Sharpe Ratio tells you:**\n"
                "Think of the Sharpe Ratio as your *'bang for your buck on risk'*. It measures how much return you earned for every unit of volatility you endured:\n"
                "• **Under 1.0:** Sub-optimal (too much volatility for too little return).\n"
                "• **1.0 to 1.5:** Solid, market-beating risk efficiency.\n"
                "• **Above 1.5:** Exceptional risk-adjusted consistency."
            ),
            "follow_ups": [
                f"What is the Sharpe Ratio for {ticker}?",
                "How does the Conformal Quantile model filter out false signals?",
                "How do I read the equity curve comparison?"
            ]
        }

    # 8. "Should I go all in?" / Position Sizing Advice
    if any(k in p_lower for k in ["all in", "yolo", "everything", "bet", "gamble"]):
        return {
            "reply": (
                f"Whoa, hold on—definitely do **not** go 'all in'!\n\n"
                f"Even though our model currently signals a **{verdict}** on **{ticker}**, no quantitative model has a crystal ball. "
                f"Unexpected macro headlines or earnings surprises happen all the time.\n\n"
                f"A sensible rule of thumb: keep position sizes balanced (e.g. 2% to 5% of your total capital per setup), and always establish "
                f"a Stop-Loss around the safety floor (${lower_p:.2f}) using the **⚡ Broker Router** modal."
            ),
            "follow_ups": [
                f"Calculate PnL for 25 shares of {ticker}",
                f"What is the 90% Safety Floor for {ticker}?",
                "How do I stage a risk-bracketed order in the Broker Router?"
            ]
        }

    # 9. Default Context-Aware Greeting
    return {
        "reply": (
            f"Hey there! I am **AlphaBot**, your terminal copilot. I'm actively monitoring **{company_name} ({ticker})** "
            f"(currently trading at **${curr_p:.2f}** with an AI target price of **${tgt_p:.2f}**).\n\n"
            f"You can ask me questions like:\n"
            f"• *'If I buy 25 shares, what is my net profit at the target price?'*\n"
            f"• *'What does the 90% Safety Floor tell me about downside risk?'*\n"
            f"• *'Where do I write custom technical indicators?'*\n"
            f"• *'Explain what Delta and Theta mean in the options chain'*"
        ),
        "follow_ups": [
            f"Calculate PnL for 25 shares of {ticker}",
            f"Where do I write custom technical indicators?",
            f"What is the 90% Safety Floor for {ticker}?"
        ]
    }

def process_terminal_chat(message: str, terminal_context: dict) -> dict:
    ticker = terminal_context.get('ticker', 'AAPL')
    company_name = terminal_context.get('company_name', ticker)
    curr_p = terminal_context.get('current_price', 150.0)
    tgt_p = terminal_context.get('target_price', 155.0)
    ret_pct = terminal_context.get('predicted_return', 2.0)
    lower_bound = terminal_context.get('lower_bound', 145.0)
    upper_bound = terminal_context.get('upper_bound', 160.0)
    verdict = terminal_context.get('verdict', 'Strong Buy')
    regime = terminal_context.get('regime', 'Low Volatility / Bullish')

    context_str = (
        f"Active Ticker: {ticker}\n"
        f"Company Name: {company_name}\n"
        f"Current Price: ${curr_p}\n"
        f"AI Target Price: ${tgt_p}\n"
        f"Predicted Return: {ret_pct}%\n"
        f"Safety Floor (5th Pct): ${lower_bound}\n"
        f"Upside Ceiling (95th Pct): ${upper_bound}\n"
        f"Recommendation Verdict: {verdict}\n"
        f"Market Regime: {regime}\n"
    )

    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")

    if gemini_key or groq_key:
        full_system_prompt = f"{SYSTEM_KNOWLEDGE_PROMPT}\n\nCURRENT TERMINAL CONTEXT:\n{context_str}"
        return query_llm_api(full_system_prompt, message, terminal_context)
    else:
        return generate_offline_fallback(message, terminal_context)