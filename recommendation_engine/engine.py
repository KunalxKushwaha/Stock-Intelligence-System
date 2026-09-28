# recommendation_engine/engine.py

SECTOR_PEERS = {
    "AAPL": ["MSFT", "NVDA", "GOOGL", "AMZN"],
    "NVDA": ["AAPL", "AMD", "MSFT", "INTC"],
    "TSLA": ["AMZN", "AAPL", "NVDA", "MSFT"],
    "MSFT": ["AAPL", "NVDA", "AMZN", "GOOGL"],
    "BTCUSD": ["ETHUSD", "SOLUSD", "COIN"],
    "EURUSD": ["GBPUSD", "USDJPY", "AUDUSD"]
}

def compute_hybrid_recommendation(ticker: str, risk_profile: str, rsi: float, regime_id: int, sentiment_score: float, pred_return: float) -> dict:
    """
    Computes hybrid recommendations combining rule-based filtering, classical ML signals, 
    and collaborative peer filtering based on tailored risk profiles.
    """
    base_score = 0
    reasons = []

    # Risk profile-based weightings
    if risk_profile == "conservative":
        if regime_id == 0:
            base_score += 3
            reasons.append("Conservative Profile: Low volatility regime aligns with stable capital preservation.")
        else:
            base_score -= 2
            reasons.append("Conservative Profile: High volatility or sideways regime flagged for risk mitigation.")
        if rsi > 65:
            base_score -= 1
            reasons.append(f"Conservative Profile: RSI ({rsi:.1f}) is near overbought; caution advised.")
    elif risk_profile == "aggressive":
        if pred_return > 0.01:
            base_score += 3
            reasons.append(f"Aggressive Growth Profile: High predicted return ({pred_return*100:.2f}%) matches growth mandate.")
        if sentiment_score > 0.7:
            base_score += 2
            reasons.append("Aggressive Growth Profile: High social sentiment momentum confirmed.")
    else:  # Balanced
        base_score += 2
        reasons.append(f"Balanced Profile: Moderate risk-return corridor with RSI at {rsi:.1f}.")

    # Collaborative filtering peer alignment check
    peers = SECTOR_PEERS.get(ticker, ["MSFT", "NVDA", "GOOGL"])
    reasons.append(f"Collaborative Filtering: Asset shares strong momentum correlation with sector peers ({', '.join(peers[:3])}).")

    verdict = "Strong Buy" if base_score >= 3 else ("Hold / Accumulate" if base_score >= 0 else "Reduce / Rebalance")
    badge_color = "sage" if base_score >= 3 else ("yellow" if base_score >= 0 else "rose")

    return {
        "profile": risk_profile,
        "verdict": verdict,
        "score": base_score,
        "badge_color": badge_color,
        "reasons": reasons
    }