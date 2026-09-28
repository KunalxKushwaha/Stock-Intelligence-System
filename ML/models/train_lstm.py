import os
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow.keras.models import Sequential  # type: ignore
from tensorflow.keras.layers import LSTM, Dense, Dropout  # type: ignore

# Resolve project root directory
root_dir = Path(__file__).resolve().parent.parent.parent

def find_stock_csv(ticker: str):
    """
    Recursively searches the database folder and subfolders for the stock CSV file.
    """
    db_folder = root_dir / "database"
    if not db_folder.exists():
        return None
    
    clean_ticker = ticker.upper().strip()
    target_filename = f"{clean_ticker}_data.csv"
    
    # Recursive search through database/ and subdirectories (like individual_stocks_5yr)
    for file_path in db_folder.rglob("*.csv"):
        if file_path.name.upper() == target_filename.upper():
            return file_path
            
    # Fallback: search for any CSV containing the clean ticker name in its filename
    for file_path in db_folder.rglob("*.csv"):
        if clean_ticker in file_path.name.upper():
            return file_path
            
    return None

def build_lstm_dataset(data: np.array, time_step: int = 60):
    """
    Transforms a 1D price array into sequential X (past windows) and y (next target) matrices.
    """
    X, y = [], []
    for i in range(len(data) - time_step - 1):
        a = data[i:(i + time_step), 0]
        X.append(a)
        y.append(data[i + time_step, 0])
    return np.array(X), np.array(y)

def train_and_save_lstm(ticker: str = "AAPL"):
    """
    Trains a custom LSTM network from scratch for a given stock CSV in database/
    and saves the trained model artifact to ML/models/.
    """
    print(f"🚀 Initializing LSTM training from scratch for {ticker}...")
    
    csv_file = find_stock_csv(ticker)
    if not csv_file or not csv_file.exists():
        print(f"❌ Error: Could not find any matching CSV file for '{ticker}' inside database/ or its subfolders.")
        print(f"📁 Checked base directory: {root_dir / 'database'}")
        return

    print(f"📂 Found dataset file at: {csv_file}")

    # Load closing prices
    df = pd.read_csv(csv_file)
    close_col = next((c for c in df.columns if 'close' in c.lower()), None)
    
    if not close_col:
        print(f"❌ Error: Could not locate a 'Close' column in {csv_file.name}")
        return

    df_closed = df[[close_col]].dropna()
    
    # Scale data between 0 and 1
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(df_closed.values)

    # Split train data (80% train, 20% test)
    training_len = int(len(scaled_data) * 0.8)
    train_data = scaled_data[0:training_len, :]

    time_step = 60
    if len(train_data) <= time_step:
        print(f"❌ Error: Insufficient training records for LSTM windowing (need > 60 rows).")
        return

    X_train, y_train = build_lstm_dataset(train_data, time_step)
    
    # Reshape X_train for LSTM [samples, time steps, features]
    X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)

    # Build LSTM Architecture from scratch
    model = Sequential([
        LSTM(50, return_sequences=True, input_shape=(time_step, 1)),
        Dropout(0.2),
        LSTM(50, return_sequences=False),
        Dropout(0.2),
        Dense(25),
        Dense(1)
    ])

    model.compile(optimizer='adam', loss='mean_squared_error')
    
    print(f"🏋️ Training LSTM model...")
    model.fit(X_train, y_train, batch_size=32, epochs=5, verbose=1)

    # Save trained model artifact
    models_dir = root_dir / 'ML' / 'models'
    models_dir.mkdir(parents=True, exist_ok=True)
    model_path = models_dir / f'lstm_{ticker.upper()}_model.h5'
    model.save(model_path)
    
    print(f"✅ Successfully trained and saved LSTM model to {model_path}")

if __name__ == "__main__":
    train_and_save_lstm("AAPL")