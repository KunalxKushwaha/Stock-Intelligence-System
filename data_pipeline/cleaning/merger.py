import sys
import os
from pathlib import Path

# Automatically add project root directory to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_dir))

import pandas as pd
import numpy as np
from dotenv import load_dotenv

# Import our custom fetchers (Now Python knows where data_pipeline is!)
from data_pipeline.stock_data.fetcher import fetch_historical_stock
from data_pipeline.macroeconomic.fetcher import fetch_macro_indicator

# Load env variables from root
load_dotenv(root_dir / '.env')

def build_unified_dataset(ticker: str = "AAPL", start_date: str = "2023-01-01", end_date: str = "2026-08-01") -> pd.DataFrame:
    print(f"--- Fetching Historical Data for {ticker} ---")
    
    # 1. Fetch Stock Data
    stock_df = fetch_historical_stock(ticker, start_date, end_date)
    
    # Flatten MultiIndex columns if yfinance returns them
    if isinstance(stock_df.columns, pd.MultiIndex):
        stock_df.columns = [col[0] if isinstance(col, tuple) else col for col in stock_df.columns]
    
    stock_df['Date'] = pd.to_datetime(stock_df['Date'])
    
    # 2. Fetch Macro Data (VIX)
    fred_api_key = os.getenv("FRED_API_KEY")
    vix_series = fetch_macro_indicator(api_key=fred_api_key, series_id="VIXCLS")
    vix_df = vix_series.reset_index()
    vix_df.columns = ['Date', 'VIX_Close']
    vix_df['Date'] = pd.to_datetime(vix_df['Date'])
    
    # 3. Merge Stock Data with Macro Data
    merged_df = pd.merge(stock_df, vix_df, on='Date', how='inner')
    
    # Convert VIX column to numeric (handles any string values like missing '.')
    merged_df['VIX_Close'] = pd.to_numeric(merged_df['VIX_Close'], errors='coerce')
    merged_df['VIX_Close'] = merged_df['VIX_Close'].ffill()
    
    # 4. Feature Engineering
    merged_df['Log_Return'] = np.log(merged_df['Close'] / merged_df['Close'].shift(1))
    merged_df['Target_Next_Return'] = merged_df['Log_Return'].shift(-1)
    
    # Clean up NaNs created by shifts
    merged_df.dropna(inplace=True)
    
    return merged_df

if __name__ == "__main__":
    df = build_unified_dataset()
    print("\n--- Unified Data Sample ---")
    print(df[['Date', 'Close', 'VIX_Close', 'Log_Return', 'Target_Next_Return']].tail())