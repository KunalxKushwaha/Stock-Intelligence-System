import os
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import RandomForestRegressor
import joblib
import tensorflow as tf
from tensorflow.keras.models import Sequential  # type: ignore
from tensorflow.keras.layers import LSTM, Dense, Dropout  # type: ignore

root_dir = Path(__file__).resolve().parent.parent.parent

def find_stock_csv(ticker: str):
    db_folder = root_dir / "database"
    if not db_folder.exists():
        return None
    clean_ticker = ticker.upper().strip()
    target_filename = f"{clean_ticker}_data.csv"
    for file_path in db_folder.rglob("*.csv"):
        if file_path.name.upper() == target_filename.upper():
            return file_path
    for file_path in db_folder.rglob("*.csv"):
        if clean_ticker in file_path.name.upper():
            return file_path
    return None

def train_hybrid_ensemble(ticker: str = "AAPL"):
    print(f"🚀 Training multi-model hybrid ensemble for {ticker}...")
    
    csv_file = find_stock_csv(ticker)
    if not csv_file or not csv_file.exists():
        print(f"❌ Error: CSV for {ticker} not found.")
        return

    df = pd.read_csv(csv_file)
    close_col = next((c for c in df.columns if 'close' in c.lower()), None)
    if not close_col:
        print("❌ Error: Close column missing.")
        return

    df_closed = df[[close_col]].dropna()
    prices = df_closed.values

    # 1. Train Complementary Tabular Baseline (Random Forest for Technical Momentum)
    df['Lag_1'] = df[close_col].shift(1)
    df['Lag_2'] = df[close_col].shift(2)
    df['Rolling_Mean'] = df[close_col].rolling(window=5).mean()
    df_clean = df.dropna()
    
    X_tab = df_clean[['Lag_1', 'Lag_2', 'Rolling_Mean']].values
    y_tab = df_clean[close_col].values
    
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X_tab, y_tab)
    print("✅ Random Forest tabular baseline trained successfully.")

    # 2. Train Sequential LSTM Model
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(prices)
    
    time_step = 60
    X_lstm, y_lstm = [], []
    for i in range(len(scaled_data) - time_step - 1):
        X_lstm.append(scaled_data[i:(i + time_step), 0])
        y_lstm.append(scaled_data[i + time_step, 0])
    X_lstm, y_lstm = np.array(X_lstm), np.array(y_lstm)
    X_lstm = X_lstm.reshape(X_lstm.shape[0], X_lstm.shape[1], 1)

    lstm_model = Sequential([
        LSTM(50, return_sequences=True, input_shape=(time_step, 1)),
        Dropout(0.2),
        LSTM(50, return_sequences=False),
        Dropout(0.2),
        Dense(25),
        Dense(1)
    ])
    lstm_model.compile(optimizer='adam', loss='mean_squared_error')
    lstm_model.fit(X_lstm, y_lstm, batch_size=32, epochs=5, verbose=1)

    # Save all artifacts
    models_dir = root_dir / 'ML' / 'models'
    models_dir.mkdir(parents=True, exist_ok=True)
    
    joblib.dump(rf_model, models_dir / f'rf_tabular_{ticker.upper()}_model.pkl')
    lstm_model.save(models_dir / f'lstm_{ticker.upper()}_model.h5')
    
    print(f"✅ Multi-model hybrid suite successfully trained and saved to {models_dir}")

if __name__ == "__main__":
    train_hybrid_ensemble("AAPL")