import sys
import os
import asyncio
import random
from pathlib import Path

# Resolve project root directory
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import joblib

from ML.feature_engineering.build_features import engineer_features  
from data_pipeline.news_data.fetcher import fetch_company_news 
from fake_news_detection.collectors.fetcher import search_fact_check_claims 

app = FastAPI(title="AI Stock Intelligence API", version="1.0.0")

# Enable CORS for Frontend Development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Trained Models globally
models_dir = root_dir / 'ML' / 'models'
try:
    best_model = joblib.load(models_dir / 'best_stock_model.pkl')
    hmm_model = joblib.load(models_dir / 'hmm_regime_model.pkl')
    print("✅ Successfully loaded ML models into FastAPI.")
except Exception as e:
    print(f"⚠️ Warning: Model artifacts not found. Error: {e}")
    best_model, hmm_model = None, None

COMPANY_NAMES = {
    "AAPL": "Apple Inc.",
    "NVDA": "Nvidia Corp.",
    "TSLA": "Tesla Inc.",
    "MSFT": "Microsoft Corp.",
    "AMZN": "Amazon.com Inc.",
    "GOOGL": "Alphabet / Google",
    "META": "Meta / Facebook",
    "NFLX": "Netflix Inc.",
    "AMD": "Advanced Micro Devices",
    "AVGO": "Broadcom Inc.",
    "JPM": "JPMorgan Chase",
    "BRK-B": "Berkshire Hathaway",
    "DIS": "Walt Disney Co.",
    "JNJ": "Johnson & Johnson",
    "V": "Visa Inc.",
    "MA": "Mastercard Inc.",
    "XOM": "Exxon Mobil",
    "CVX": "Chevron Corp.",
    "PEP": "PepsiCo Inc.",
    "KO": "Coca-Cola Co.",
    "PFE": "Pfizer Inc.",
    "INTC": "Intel Corp.",
    "CSCO": "Cisco Systems",
    "VZ": "Verizon Communications",
    "WMT": "Walmart Inc.",
    "HD": "Home Depot",
    "BA": "Boeing Co.",
    "IBM": "IBM Corp.",
    "GE": "General Electric",
    "NKE": "Nike Inc.",
    "GS": "Goldman Sachs",
    "MS": "Morgan Stanley",
    "PYPL": "PayPal Holdings",
    "INTU": "Intuit Inc.",
    "QCOM": "Qualcomm Inc."
}

SECTOR_PEERS = {
    "AAPL": ["MSFT", "NVDA", "GOOGL", "AMZN"],
    "NVDA": ["AAPL", "AMD", "MSFT", "AVGO"],
    "TSLA": ["AMZN", "AAPL", "NVDA", "MSFT"],
    "MSFT": ["AAPL", "NVDA", "AMZN", "GOOGL"],
    "AMZN": ["MSFT", "AAPL", "TSLA", "NVDA"],
    "GOOGL": ["MSFT", "AAPL", "META", "AMZN"],
    "META": ["GOOGL", "MSFT", "AMZN", "NFLX"]
}

def compute_stock_recommendation(rsi: float, regime_id: int, pred_mid: float, lower_bound: float, upper_bound: float):
    score = 0
    reasons = []

    if rsi < 30:
        score += 2
        reasons.append(f"RSI ({rsi:.1f}) indicates oversold momentum (Bullish Reversal Potential).")
    elif rsi > 70:
        score -= 2
        reasons.append(f"RSI ({rsi:.1f}) indicates overbought momentum (Bearish Exhaustion Risk).")
    else:
        score += 1
        reasons.append(f"RSI ({rsi:.1f}) is within a balanced neutral range.")

    if regime_id == 0:
        score += 2
        reasons.append("HMM Regime detected Low Volatility Bullish market condition.")
    elif regime_id == 1:
        score += 0
        reasons.append("HMM Regime detected Sideways/Neutral market condition.")
    else:
        score -= 2
        reasons.append("HMM Regime detected High Volatility Bearish market condition.")

    upside_margin = upper_bound - pred_mid
    downside_risk = pred_mid - lower_bound
    
    if upside_margin > downside_risk:
        score += 2
        reasons.append("Conformal quantile bounds indicate favorable upside risk-reward ratio.")
    else:
        score -= 1
        reasons.append("Conformal quantile bounds indicate elevated downside exposure.")

    if score >= 3:
        verdict = "Strong Buy"
        badge_color = "sage"
    elif score >= 1:
        verdict = "Hold / Accumulate"
        badge_color = "yellow"
    else:
        verdict = "Caution / Reduce"
        badge_color = "rose"

    return {
        "verdict": verdict,
        "score": score,
        "badge_color": badge_color,
        "reasons": reasons
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api/stock/analyze")
def analyze_stock(ticker: str = "AAPL", confidence: int = 90):
    try:
        clean_ticker = ticker.upper().strip()
        df = engineer_features(ticker=clean_ticker)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No dataset or price history found for ticker '{clean_ticker}'. Please verify the CSV exists in the database folder.")

        latest_row = df.iloc[-1:]
        current_price = float(latest_row['Close'].values[0])
        rsi_val = float(latest_row['RSI_14'].values[0])
        
        hmm_feat = np.column_stack([latest_row['Log_Return'], latest_row['VIX_Close']])
        regime = int(hmm_model.predict(hmm_feat)[0]) if hmm_model is not None else 0
        
        regime_labels = {
            0: {"label": "Low Volatility / Bullish", "color": "sage", "status": "Stable"},
            1: {"label": "Neutral / Sideways", "color": "yellow", "status": "Moderate"},
            2: {"label": "High Volatility / Bearish", "color": "rose", "status": "Caution"}
        }

        feature_cols = ['Close', 'VIX_Close', 'Log_Return', 'RSI_14', 'MACD', 'SMA_Ratio', 'BB_Lower', 'BB_Upper']
        X_latest = latest_row[feature_cols]

        if isinstance(best_model, dict):
            pred_mid = float(best_model['mid'].predict(X_latest)[0])
            base_lower = float(best_model['lower'].predict(X_latest)[0])
            base_upper = float(best_model['upper'].predict(X_latest)[0])
        elif best_model is not None:
            pred_mid = float(best_model.predict(X_latest)[0])
            base_lower = pred_mid - 0.02
            base_upper = pred_mid + 0.02
        else:
            pred_mid, base_lower, base_upper = 0.005, -0.010, 0.025

        scale_factor = confidence / 90.0
        pred_lower = pred_mid - (pred_mid - base_lower) * scale_factor
        pred_upper = pred_mid + (base_upper - pred_mid) * scale_factor

        pred_price_mid = current_price * (1 + pred_mid)
        pred_price_lower = current_price * (1 + pred_lower)
        pred_price_upper = current_price * (1 + pred_upper)

        rec_data = compute_stock_recommendation(
            rsi=rsi_val,
            regime_id=regime,
            pred_mid=pred_mid,
            lower_bound=pred_lower,
            upper_bound=pred_upper
        )

        peers = SECTOR_PEERS.get(clean_ticker, ["MSFT", "NVDA", "GOOGL", "AMZN"])
        company_name = COMPANY_NAMES.get(clean_ticker, clean_ticker)

        chart_data = df.tail(90)[['Date', 'Close', 'BB_Upper', 'BB_Lower', 'RSI_14']].to_dict(orient='records')

        return {
            "ticker": clean_ticker,
            "company_name": company_name,
            "current_price": round(current_price, 2),
            "confidence_level": confidence,
            "predictions": {
                "next_return_pct": round(pred_mid * 100, 2),
                "target_price": round(pred_price_mid, 2),
                "lower_bound_price": round(pred_price_lower, 2),
                "upper_bound_price": round(pred_price_upper, 2),
            },
            "recommendation": rec_data,
            "market_regime": regime_labels.get(regime, regime_labels[0]),
            "technical_indicators": {
                "rsi_14": round(rsi_val, 2),
                "vix": round(float(latest_row['VIX_Close'].values[0]), 2),
                "macd": round(float(latest_row['MACD'].values[0]), 2),
            },
            "peers": peers,
            "historical_chart": chart_data
        }
    except Exception as e:
        print(f"⚠️ Error in analyze_stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/recommendation")
def get_recommendation(ticker: str = "AAPL"):
    try:
        data = analyze_stock(ticker=ticker)
        return {
            "ticker": data["ticker"],
            "company_name": data["company_name"],
            "recommendation": data["recommendation"],
            "peers": data["peers"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/orderbook/{ticker}")
async def websocket_orderbook(websocket: WebSocket, ticker: str):
    await websocket.accept()
    clean_ticker = ticker.upper().strip()
    base_price = 150.0
    if clean_ticker == "AAPL": base_price = 223.96
    elif clean_ticker == "NVDA": base_price = 125.50
    elif clean_ticker == "TSLA": base_price = 245.20
    elif clean_ticker == "MSFT": base_price = 420.10
    elif clean_ticker == "AMZN": base_price = 185.30

    try:
        while True:
            variation = random.uniform(-0.15, 0.15)
            base_price = round(max(5.0, base_price + variation), 2)
            spread = 0.02
            
            bid_price = round(base_price - spread / 2, 2)
            ask_price = round(base_price + spread / 2, 2)

            bids = [
                {"price": bid_price, "size": random.randint(100, 2500)},
                {"price": round(bid_price - 0.05, 2), "size": random.randint(500, 5000)},
                {"price": round(bid_price - 0.10, 2), "size": random.randint(1000, 10000)}
            ]
            asks = [
                {"price": ask_price, "size": random.randint(100, 2500)},
                {"price": round(ask_price + 0.05, 2), "size": random.randint(500, 5000)},
                {"price": round(ask_price + 0.10, 2), "size": random.randint(1000, 10000)}
            ]

            payload = {
                "ticker": clean_ticker,
                "timestamp": pd.Timestamp.now().strftime("%H:%M:%S.%f")[:-3],
                "level1": {
                    "bid": bid_price,
                    "ask": ask_price,
                    "spread": round(ask_price - bid_price, 2),
                    "last_size": random.randint(10, 500)
                },
                "level2": {
                    "bids": bids,
                    "asks": asks
                }
            }

            await websocket.send_json(payload)
            await asyncio.sleep(0.4)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")

@app.get("/api/stock/news")
def get_stock_news(ticker: str = "AAPL"):
    news_api_key = os.getenv("NEWS_API_KEY")
    clean_ticker = ticker.upper().strip()
    company_name = COMPANY_NAMES.get(clean_ticker, clean_ticker)
    
    query = f"{company_name} stock"
    articles = fetch_company_news(api_key=news_api_key, query=query)
    formatted = []
    
    unwanted_keywords = ["pypi", "github", "npm", "python package"]
    
    for art in articles:
        title = art.get("title", "")
        url = art.get("url", "").lower()
        
        if any(kw in title.lower() or kw in url for kw in unwanted_keywords):
            continue

        formatted.append({
            "title": title,
            "url": art.get("url"),
            "source": art.get("source", {}).get("name", "Financial Press"),
            "published_at": art.get("publishedAt")[:10] if art.get("publishedAt") else ""
        })
        if len(formatted) == 4:
            break

    return {"ticker": clean_ticker, "articles": formatted}

@app.get("/api/stock/factcheck")
def get_fact_checks(ticker: str = "AAPL"):
    clean_ticker = ticker.upper().strip()
    company_name = COMPANY_NAMES.get(clean_ticker, clean_ticker)
    
    claims = search_fact_check_claims(query=f"{company_name} stock")
    formatted = []
    if claims:
        for claim in claims[:3]:
            review = claim['claimReview'][0] if 'claimReview' in claim and len(claim['claimReview']) > 0 else {}
            formatted.append({
                "claim": claim.get("text"),
                "publisher": review.get("publisher", {}).get("name", "Unknown"),
                "rating": review.get("textualRating", "Unverified")
            })
    return {"ticker": clean_ticker, "claims": formatted}