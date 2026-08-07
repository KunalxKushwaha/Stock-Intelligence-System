import os
from pathlib import Path
from fredapi import Fred
from dotenv import load_dotenv

# Find root directory (2 levels up from data_pipeline/macroeconomic/)
root_dir = Path(__file__).resolve().parent.parent.parent
env_path = root_dir / '.env'

# Explicitly load .env from root
load_dotenv(dotenv_path=env_path)

def fetch_macro_indicator(api_key: str, series_id: str = "VIXCLS"):
    """Fetch FRED economic series data (Default: CBOE Volatility Index)."""
    if not api_key:
        raise ValueError(f"FRED_API_KEY is missing! Looking at path: {env_path}")
        
    fred = Fred(api_key=api_key)
    data = fred.get_series(series_id)
    return data

if __name__ == "__main__":
    api_key = os.getenv("FRED_API_KEY")
    vix_data = fetch_macro_indicator(api_key=api_key, series_id="VIXCLS")
    
    print("--- Latest FRED Macro Data (VIX Index) ---")
    print(vix_data.tail())