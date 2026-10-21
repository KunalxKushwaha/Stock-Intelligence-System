"""
Model accuracy & validation metrics.

Evaluates the model that is actually deployed (ML/models/best_stock_model.pkl)
on the chronological hold-out slice (the last 20% of processed_features.csv,
the same split train_pipeline.py uses) and returns honest, examiner-proof
numbers: directional accuracy next to the naive baseline, error vs a naive
forecast, accuracy on the most confident calls, and a split-conformal 90%
interval whose real coverage is measured on unseen days.

Mounted at /api/model in main.py.
"""
import math
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/model", tags=["Model Metrics"])

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "ML" / "models" / "best_stock_model.pkl"
DATA_PATH = ROOT / "ML" / "datasets" / "processed_features.csv"
FEATURES = ['Close', 'VIX_Close', 'Log_Return', 'RSI_14', 'MACD', 'SMA_Ratio', 'BB_Lower', 'BB_Upper']
TARGET = 'Target_Next_Return'

_cache = {"key": None, "value": None}


def _predict(model, X):
    m = model['mid'] if isinstance(model, dict) else model
    p = np.asarray(m.predict(X))
    return p if p.ndim == 1 else p[:, p.shape[1] // 2]


def _acc(pred, y):
    return float(np.mean(np.sign(pred) == np.sign(y))) if len(y) else None


def _wilson(p, n, z=1.96):
    if n == 0:
        return None, None
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return c - h, c + h


def _compute():
    df = pd.read_csv(DATA_PATH)
    model = joblib.load(MODEL_PATH)
    split = int(len(df) * 0.8)
    test = df.iloc[split:]
    y = test[TARGET].to_numpy(dtype=float)
    pred = _predict(model, test[FEATURES])
    n = len(y)

    acc = _acc(pred, y)
    up_rate = float(np.mean(y > 0))
    baseline = max(up_rate, 1 - up_rate)
    lo, hi = _wilson(acc, n)
    z = (acc - 0.5) / math.sqrt(0.25 / n)
    p_value = math.erfc(abs(z) / math.sqrt(2))

    rmse = float(np.sqrt(np.mean((y - pred) ** 2)))
    mae = float(np.mean(np.abs(y - pred)))
    naive_rmse = float(np.sqrt(np.mean(y ** 2)))  # "predict no change" forecast

    up_mask, down_mask = pred > 0, pred < 0
    up_prec = float(np.mean(y[up_mask] > 0)) if up_mask.any() else None
    down_prec = float(np.mean(y[down_mask] < 0)) if down_mask.any() else None

    order = np.argsort(-np.abs(pred))
    tiers = []
    for frac, label in ((0.5, "Top 50% most confident calls"), (0.25, "Top 25% most confident calls")):
        k = max(1, int(n * frac))
        idx = order[:k]
        tiers.append({"label": label, "n": int(k), "accuracy": _acc(pred[idx], y[idx])})

    # Split-conformal 90% interval: calibrate residual quantiles on the first
    # half of the hold-out, measure real coverage on the second half.
    h = n // 2
    r_cal = y[:h] - pred[:h]
    q_lo, q_hi = np.quantile(r_cal, 0.05), np.quantile(r_cal, 0.95)
    lo_b, hi_b = pred[h:] + q_lo, pred[h:] + q_hi
    coverage = float(np.mean((y[h:] >= lo_b) & (y[h:] <= hi_b)))

    return {
        "model": "XGBoost regressor (next-day return)",
        "test_days": int(n),
        "test_period": [str(test['Date'].iloc[0])[:10], str(test['Date'].iloc[-1])[:10]],
        "directional_accuracy": acc,
        "accuracy_ci95": [lo, hi],
        "majority_baseline": baseline,
        "edge_vs_baseline": acc - baseline,
        "p_value_vs_coin_flip": p_value,
        "statistically_significant": bool(p_value < 0.05),
        "up_call_precision": up_prec,
        "down_call_precision": down_prec,
        "rmse": rmse,
        "mae": mae,
        "naive_rmse": naive_rmse,
        "skill_vs_naive": 1 - rmse / naive_rmse,
        "confidence_tiers": tiers,
        "interval": {
            "nominal": 0.90,
            "measured_coverage": coverage,
            "eval_days": int(n - h),
            "avg_width_pct": float(np.mean(hi_b - lo_b) * 100),
        },
        "caveats": [
            "Single stock (Apple), about 846 trading days in total.",
            "The deployed model was chosen using this same hold-out, so results are slightly optimistic.",
            "Next-day direction is close to a coin flip in efficient markets; treat accuracy as indicative.",
        ],
        "computed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


@router.get("/metrics")
def get_model_metrics(refresh: bool = False):
    try:
        key = (MODEL_PATH.stat().st_mtime, DATA_PATH.stat().st_mtime)
        if refresh or _cache["key"] != key:
            _cache["value"], _cache["key"] = _compute(), key
        return _cache["value"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics computation failed: {e}")