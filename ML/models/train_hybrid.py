import os
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, GRU, Bidirectional, Conv1D, MaxPooling1D, Flatten, Dense, Dropout
from tensorflow.keras.optimizers import Adam

def load_and_prepare_multi_stock_data(data_dir: str, sequence_length: int = 60, max_files: int = 10):
    data_path = Path(data_dir)
    if not data_path.exists():
        raise FileNotFoundError(f"Directory not found: {data_dir}")
        
    all_files = list(data_path.glob("*_data.csv"))
    if not all_files:
        all_files = list(data_path.glob("*.csv"))
        
    if not all_files:
        raise ValueError(f"No CSV stock files found in {data_dir}")
        
    print(f"📂 Found {len(all_files)} stock datasets. Aggregating data for multi-stock training...")
    
    combined_closes = []
    # Limit files for training efficiency if directory contains massive counts, or use all
    selected_files = all_files[:max_files]
    
    for file_path in selected_files:
        try:
            df = pd.read_csv(file_path)
            # Find close column dynamically
            close_col = next((c for c in ['Close', 'close', 'Adj Close'] if c in df.columns), None)
            if close_col and len(df) > sequence_length:
                prices = df[close_col].dropna().values
                combined_closes.extend(prices)
        except Exception as e:
            print(f"⚠️ Error processing {file_path.name}: {e}")
            
    if not combined_closes:
        raise ValueError("Could not extract valid closing price rows from any CSV file.")
        
    data = np.array(combined_closes).reshape(-1, 1)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    X, y = [], []
    for i in range(sequence_length, len(scaled_data)):
        X.append(scaled_data[i-sequence_length:i, 0])
        y.append(scaled_data[i, 0])
        
    X, y = np.array(X), np.array(y)
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    split = int(len(X) * 0.8)
    print(f"📊 Total training sequences compiled: {len(X)} (Train: {split}, Val: {len(X) - split})")
    return X[:split], y[:split], X[split:], y[split:], scaler

def build_model(architecture_type: str, input_shape):
    model = Sequential()
    
    if architecture_type == "LSTM":
        model.add(LSTM(50, return_sequences=False, input_shape=input_shape))
        model.add(Dropout(0.2))
    elif architecture_type == "GRU":
        model.add(GRU(50, return_sequences=False, input_shape=input_shape))
        model.add(Dropout(0.2))
    elif architecture_type == "BiLSTM":
        model.add(Bidirectional(LSTM(50, return_sequences=False), input_shape=input_shape))
        model.add(Dropout(0.2))
    elif architecture_type == "CNN-LSTM":
        model.add(Conv1D(filters=64, kernel_size=3, activation='relu', input_shape=input_shape))
        model.add(MaxPooling1D(pool_size=2))
        model.add(LSTM(50, return_sequences=False))
        model.add(Dropout(0.2))
    else:
        raise ValueError(f"Unknown architecture type: {architecture_type}")
        
    model.add(Dense(25, activation='relu'))
    model.add(Dense(1))
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mean_squared_error')
    return model

def benchmark_complementary_models(data_dir: str):
    print("🚀 Initializing Multi-Stock Hybrid Architecture Benchmark Suite...")
    X_train, y_train, X_val, y_val, scaler = load_and_prepare_multi_stock_data(data_dir)
    
    architectures = ["LSTM", "GRU", "BiLSTM", "CNN-LSTM"]
    performance_results = {}
    
    models_dir = Path(__file__).resolve().parent
    models_dir.mkdir(parents=True, exist_ok=True)
    
    best_score = float('inf')
    best_arch = None
    
    for arch in architectures:
        print(f"\n--- Training & Evaluating Architecture: {arch} ---")
        model = build_model(arch, (X_train.shape[1], 1))
        
        model.fit(X_train, y_train, epochs=6, batch_size=64, validation_data=(X_val, y_val), verbose=1)
        
        preds = model.predict(X_val)
        preds_inv = scaler.inverse_transform(preds)
        y_val_inv = scaler.inverse_transform(y_val.reshape(-1, 1))
        
        rmse = np.sqrt(mean_squared_error(y_val_inv, preds_inv))
        mae = mean_absolute_error(y_val_inv, preds_inv)
        
        performance_results[arch] = {"RMSE": rmse, "MAE": mae}
        print(f"📊 {arch} Performance -> RMSE: {rmse:.4f} | MAE: {mae:.4f}")
        
        if rmse < best_score:
            best_score = rmse
            best_arch = arch
            model.save(models_dir / 'best_hybrid_model.h5')
            
    print("\n==============================================")
    print(f"🏆 BENCHMARK COMPLETE! Best Architecture: {best_arch} (RMSE: {best_score:.4f})")
    print("==============================================")
    return best_arch, performance_results

if __name__ == "__main__":
    root_dir = Path(__file__).resolve().parent.parent.parent
    target_database_dir = root_dir / 'database' / 'individual_stocks_5yr'
    
    if target_database_dir.exists():
        benchmark_complementary_models(str(target_database_dir))
    else:
        print(f"⚠️ Directory not found: {target_database_dir}. Please verify your project folder structure.")