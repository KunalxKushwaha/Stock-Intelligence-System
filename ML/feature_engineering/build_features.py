import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime

root_dir = Path(__file__).resolve().parent.parent.parent

def engineer_features(ticker: str = "AAPL", start_date: str = "2013-01-01") -> pd.DataFrame:
    clean_ticker = ticker.upper().strip()
    db_folder = root_dir / "database"
    
    # Recursively locate CSV file in database folder or subfolders (like individual_stocks_5yr)
    csv_file = None
    if db_folder.exists():
        target_name = f"{clean_ticker}_data.csv"
        for p in db_folder.rglob("*.csv"):
            if p.name.upper() == target_name.upper():
                csv_file = p
                break
        if not csv_file:
            for p in db_folder.rglob("*.csv"):
                if clean_ticker in p.name.upper():
                    csv_file = p
                    break

    df_hist = pd.DataFrame()
    if csv_file and csv_file.exists():
        try:
            df_hist = pd.read_csv(csv_file)
            col_mapping = {}
            for col in df_hist.columns:
                lc = col.lower()
                if 'date' in lc: col_mapping[col] = 'Date'
                elif 'open' in lc: col_mapping[col] = 'Open'
                elif 'high' in lc: col_mapping[col] = 'High'
                elif 'low' in lc: col_mapping[col] = 'Low'
                elif 'close' in lc: col_mapping[col] = 'Close'
                elif 'volume' in lc: col_mapping[col] = 'Volume'
            df_hist = df_hist.rename(columns=col_mapping)
            if 'Date' in df_hist.columns:
                df_hist['Date'] = pd.to_datetime(df_hist['Date']).dt.strftime('%Y-%m-%d')
        except Exception as e:
            print(f"⚠️ Error reading CSV for {clean_ticker}: {e}")

    last_csv_date = df_hist['Date'].max() if not df_hist.empty and 'Date' in df_hist.columns else start_date
    today_str = datetime.now().strftime("%Y-%m-%d")

    try:
        df_live = yf.download(clean_ticker, start=last_csv_date, end=today_str, progress=False)
        if not df_live.empty:
            if isinstance(df_live.columns, pd.MultiIndex):
                df_live.columns = df_live.columns.get_level_values(0)
            df_live = df_live.reset_index()
            df_live['Date'] = pd.to_datetime(df_live['Date']).dt.strftime('%Y-%m-%d')
            
            if not df_hist.empty and 'Date' in df_hist.columns:
                df = pd.concat([df_hist, df_live]).drop_duplicates(subset=['Date'], keep='last')
            else:
                df = df_live
        else:
            df = df_hist
    except Exception as e:
        print(f"⚠️ Live yfinance fetch failed for {clean_ticker}: {e}")
        df = df_hist

    if df.empty or 'Close' not in df.columns:
        print(f"❌ Error: No valid price data found for {clean_ticker}")
        return pd.DataFrame()

    df = df.sort_values('Date').reset_index(drop=True)

    df['Log_Return'] = np.log(df['Close'] / df['Close'].shift(1))

    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df['RSI_14'] = 100 - (100 / (1 + rs))

    ema12 = df['Close'].ewm(span=12, adjust=False).mean()
    ema26 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = ema12 - ema26

    sma20 = df['Close'].rolling(window=20).mean()
    std20 = df['Close'].rolling(window=20).std()
    df['BB_Upper'] = sma20 + (std20 * 2)
    df['BB_Lower'] = sma20 - (std20 * 2)
    df['SMA_Ratio'] = df['Close'] / (sma20 + 1e-9)

    try:
        vix_start = df['Date'].min()
        vix = yf.download("^VIX", start=vix_start, end=today_str, progress=False)
        if not vix.empty:
            if isinstance(vix.columns, pd.MultiIndex):
                vix.columns = vix.columns.get_level_values(0)
            vix = vix.reset_index()[['Date', 'Close']].rename(columns={'Close': 'VIX_Close'})
            vix['Date'] = pd.to_datetime(vix['Date']).dt.strftime('%Y-%m-%d')
            df = pd.merge(df, vix, on='Date', how='left')
            df['VIX_Close'] = df['VIX_Close'].ffill().bfill()
        else:
            df['VIX_Close'] = 18.5
    except Exception:
        df['VIX_Close'] = 18.5

    df = df.dropna().reset_index(drop=True)
    return df