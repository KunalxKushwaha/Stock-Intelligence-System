import sys
import os
from pathlib import Path

# Add project root directory to sys.path (2 levels up from backend/main.py)
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from fastapi import FastAPI, HTTPException
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

# Ticker symbol to full company name map for accurate stock news targeting
COMPANY_NAMES = {
    "AAPL": "Apple",
    "NVDA": "Nvidia",
    "TSLA": "Tesla",
    "MSFT": "Microsoft",
    "AMZN": "Amazon"
}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api/stock/analyze")
def analyze_stock(ticker: str = "AAPL"):
    try:
        # 1. Fetch & Engineer Features
        df = engineer_features(ticker=ticker, start_date="2023-01-01")
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker {ticker}")

        latest_row = df.iloc[-1:]
        current_price = float(latest_row['Close'].values[0])
        
        # 2. Predict Market Regime
        hmm_feat = np.column_stack([latest_row['Log_Return'], latest_row['VIX_Close']])
        regime = int(hmm_model.predict(hmm_feat)[0]) if hmm_model else 1
        
        regime_labels = {
            0: {"label": "Low Volatility / Bullish", "color": "sage", "status": "Stable"},
            1: {"label": "Neutral / Sideways", "color": "yellow", "status": "Moderate"},
            2: {"label": "High Volatility / Bearish", "color": "rose", "status": "Caution"}
        }

        # 3. Predict Return & Uncertainty Bounds
        feature_cols = ['Close', 'VIX_Close', 'Log_Return', 'RSI_14', 'MACD', 'SMA_Ratio', 'BB_Lower', 'BB_Upper']
        X_latest = latest_row[feature_cols]

        if isinstance(best_model, dict):
            pred_mid = float(best_model['mid'].predict(X_latest)[0])
            pred_lower = float(best_model['lower'].predict(X_latest)[0])
            pred_upper = float(best_model['upper'].predict(X_latest)[0])
        elif best_model is not None:
            pred_mid = float(best_model.predict(X_latest)[0])
            pred_lower = pred_mid - 0.02
            pred_upper = pred_mid + 0.02
        else:
            pred_mid, pred_lower, pred_upper = 0.001, -0.015, 0.018

        pred_price_mid = current_price * (1 + pred_mid)
        pred_price_lower = current_price * (1 + pred_lower)
        pred_price_upper = current_price * (1 + pred_upper)

        # 4. Prepare Historical Series for Charting (Last 90 Trading Days)
        chart_data = df.tail(90)[['Date', 'Close', 'BB_Upper', 'BB_Lower', 'RSI_14']].to_dict(orient='records')

        return {
            "ticker": ticker.upper(),
            "current_price": round(current_price, 2),
            "predictions": {
                "next_return_pct": round(pred_mid * 100, 2),
                "target_price": round(pred_price_mid, 2),
                "lower_bound_price": round(pred_price_lower, 2),
                "upper_bound_price": round(pred_price_upper, 2),
            },
            "market_regime": regime_labels.get(regime, regime_labels[1]),
            "technical_indicators": {
                "rsi_14": round(float(latest_row['RSI_14'].values[0]), 2),
                "vix": round(float(latest_row['VIX_Close'].values[0]), 2),
                "macd": round(float(latest_row['MACD'].values[0]), 2),
            },
            "historical_chart": chart_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/news")
def get_stock_news(ticker: str = "AAPL"):
    news_api_key = os.getenv("NEWS_API_KEY")
    clean_ticker = ticker.upper().strip()
    company_name = COMPANY_NAMES.get(clean_ticker, clean_ticker)
    
    # Specific targeted stock market query
    query = f"{company_name} stock"
    
    articles = fetch_company_news(api_key=news_api_key, query=query)
    formatted = []
    
    # Exclude non-news package repositories and non-stock content
    unwanted_keywords = ["pypi", "github", "npm", "python package"]
    
    for art in articles:
        title = art.get("title", "")
        url = art.get("url", "").lower()
        
        # Skip if title or URL contains package repository terms
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