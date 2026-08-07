import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime

def engineer_features(ticker: str = "AAPL", start_date: str = "2023-01-01") -> pd.DataFrame:
    """
    Fetches real-time historical daily data from Yahoo Finance up to today
    and calculates core technical indicators (RSI, MACD, Bollinger Bands, VIX).
    """
    end_date = datetime.now().strftime("%Y-%m-%d")
    
    # Download ticker historical data
    df = yf.download(ticker, start=start_date, end=end_date, progress=False)
    
    if df.empty:
        return pd.DataFrame()
    
    # Reset index and clean column names
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
        
    df = df.reset_index()
    df['Date'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m-%d')
    
    # 1. Log Returns
    df['Log_Return'] = np.log(df['Close'] / df['Close'].shift(1))
    
    # 2. RSI (14)
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df['RSI_14'] = 100 - (100 / (1 + rs))
    
    # 3. MACD
    ema12 = df['Close'].ewm(span=12, adjust=False).mean()
    ema26 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = ema12 - ema26
    
    # 4. Bollinger Bands (20-day)
    sma20 = df['Close'].rolling(window=20).mean()
    std20 = df['Close'].rolling(window=20).std()
    df['BB_Upper'] = sma20 + (std20 * 2)
    df['BB_Lower'] = sma20 - (std20 * 2)
    df['SMA_Ratio'] = df['Close'] / (sma20 + 1e-9)
    
    # 5. Fetch CBOE VIX Volatility Index
    try:
        vix = yf.download("^VIX", start=start_date, end=end_date, progress=False)
        if isinstance(vix.columns, pd.MultiIndex):
            vix.columns = vix.columns.get_level_values(0)
        vix = vix.reset_index()[['Date', 'Close']].rename(columns={'Close': 'VIX_Close'})
        vix['Date'] = pd.to_datetime(vix['Date']).dt.strftime('%Y-%m-%d')
        df = pd.merge(df, vix, on='Date', how='left')
        df['VIX_Close'] = df['VIX_Close'].ffill().bfill()
    except Exception:
        df['VIX_Close'] = 18.5  # Fallback baseline VIX
        
    df = df.dropna().reset_index(drop=True)
    return df