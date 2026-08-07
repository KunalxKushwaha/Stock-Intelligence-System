import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
from hmmlearn.hmm import GaussianHMM
import joblib

# Set up project root
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_dir))

def run_model_benchmark():
    dataset_path = root_dir / 'ml' / 'datasets' / 'processed_features.csv'
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}. Run Phase 1 first!")
        
    df = pd.read_csv(dataset_path)
    print(f"--- Loaded {len(df)} rows for Benchmark Comparison ---")

    # 1. Train HMM for Market Regime Feature Generation
    print("\n[1/4] Fitting Hidden Markov Model (HMM) for Market Regime Detection...")
    hmm_features = np.column_stack([df['Log_Return'], df['VIX_Close']])
    hmm = GaussianHMM(n_components=3, covariance_type="full", n_iter=100, random_state=42)
    hmm.fit(hmm_features)
    df['Market_Regime'] = hmm.predict(hmm_features)

    # 2. Define Feature Sets
    base_features = ['Close', 'VIX_Close', 'Log_Return', 'RSI_14', 'MACD', 'SMA_Ratio', 'BB_Lower', 'BB_Upper']
    hybrid_features = base_features + ['Market_Regime']
    
    y = df['Target_Next_Return']
    split_idx = int(len(df) * 0.8)
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    print(f"\n[2/4] Time-Series Data Split:")
    print(f"    Train Samples: {len(y_train)} | Test Samples: {len(y_test)}")

    # 3. Model Candidates Dictionary
    models = {
        "Standalone XGBoost": (xgb.XGBRegressor(n_estimators=100, learning_rate=0.03, max_depth=4, random_state=42), base_features),
        "Random Forest": (RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42), base_features),
        "Hybrid (HMM + XGBoost)": (xgb.XGBRegressor(n_estimators=100, learning_rate=0.03, max_depth=4, random_state=42), hybrid_features),
    }

    results = []
    best_score = float('inf')
    best_model_name = None
    best_model_obj = None

    print("\n" + "="*65)
    print("           📊 RUNNING MULTI-MODEL BENCHMARK           ")
    print("="*65)

    # 4. Evaluate Standard Candidate Models
    for name, (model, features) in models.items():
        X_train = df[features].iloc[:split_idx]
        X_test = df[features].iloc[split_idx:]
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        dir_acc = np.mean(np.sign(y_pred) == np.sign(y_test.values)) * 100

        results.append({
            "Model Architecture": name,
            "RMSE": round(rmse, 6),
            "MAE": round(mae, 6),
            "Directional Accuracy (%)": round(dir_acc, 2)
        })

        if rmse < best_score:
            best_score = rmse
            best_model_name = name
            best_model_obj = model

    # 5. Train Quantile Conformal Hybrid (XGBoost Quantile Bounds Engine)
    print("\n[3/4] Fitting Conformal Uncertainty Quantile XGBoost Engine...")
    X_train_h = df[hybrid_features].iloc[:split_idx]
    X_test_h = df[hybrid_features].iloc[split_idx:]
    
    # 90% Confidence Interval Bounds (5th percentile, Median 50th, 95th percentile)
    model_lower = xgb.XGBRegressor(objective='reg:quantileerror', quantile_alpha=0.05, n_estimators=100, learning_rate=0.03, max_depth=4, random_state=42)
    model_mid   = xgb.XGBRegressor(objective='reg:quantileerror', quantile_alpha=0.50, n_estimators=100, learning_rate=0.03, max_depth=4, random_state=42)
    model_upper = xgb.XGBRegressor(objective='reg:quantileerror', quantile_alpha=0.95, n_estimators=100, learning_rate=0.03, max_depth=4, random_state=42)

    model_lower.fit(X_train_h, y_train)
    model_mid.fit(X_train_h, y_train)
    model_upper.fit(X_train_h, y_train)

    pred_mid = model_mid.predict(X_test_h)
    pred_lower = model_lower.predict(X_test_h)
    pred_upper = model_upper.predict(X_test_h)

    rmse_q = np.sqrt(mean_squared_error(y_test, pred_mid))
    mae_q = mean_absolute_error(y_test, pred_mid)
    dir_acc_q = np.mean(np.sign(pred_mid) == np.sign(y_test.values)) * 100

    results.append({
        "Model Architecture": "Hybrid (HMM + Quantile Conformal XGB)",
        "RMSE": round(rmse_q, 6),
        "MAE": round(mae_q, 6),
        "Directional Accuracy (%)": round(dir_acc_q, 2)
    })

    if rmse_q < best_score:
        best_score = rmse_q
        best_model_name = "Hybrid (HMM + Quantile Conformal XGB)"
        best_model_obj = {"lower": model_lower, "mid": model_mid, "upper": model_upper}

    # 6. Display Benchmark Table
    print("\n[4/4] Benchmark Metrics Table Summary:")
    summary_df = pd.DataFrame(results).sort_values(by="RMSE")
    print(summary_df.to_string(index=False))
    print("="*65)
    print(f"🏆 BEST MODEL SELECTED: {best_model_name} (Lowest RMSE: {best_score:.6f})")

    # Sample output of prediction bounds
    bounds_sample = pd.DataFrame({
        'Actual_Return': y_test.values,
        'Predicted_Return': pred_mid,
        'Lower_Bound_90%': pred_lower,
        'Upper_Bound_90%': pred_upper
    }, index=X_test_h.index)

    print("\n--- Sample Next-Day Prediction Bounds (90% Confidence Interval) ---")
    print(bounds_sample.tail(5))

    # 7. Save Best Artifacts
    models_dir = root_dir / 'ml' / 'models'
    models_dir.mkdir(parents=True, exist_ok=True)
    
    if isinstance(best_model_obj, dict):
        joblib.dump(best_model_obj, models_dir / 'best_stock_model.pkl')
    else:
        joblib.dump(best_model_obj, models_dir / 'best_stock_model.pkl')
        
    joblib.dump(hmm, models_dir / 'hmm_regime_model.pkl')
    summary_df.to_csv(models_dir / 'benchmark_results.csv', index=False)
    print(f"\nSaved trained model artifacts and benchmark results to: {models_dir}\n")

if __name__ == "__main__":
    run_model_benchmark()