import yfinance as yf
import pandas as pd

def fetch_historical_stock(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch daily OHLCV data using yfinance."""
    df = yf.download(ticker, start=start_date, end=end_date)
    df.reset_index(inplace=True)
    return df

if __name__ == "__main__":
    df = fetch_historical_stock("AAPL", "2023-01-01", "2026-01-01")
    print(df.head())