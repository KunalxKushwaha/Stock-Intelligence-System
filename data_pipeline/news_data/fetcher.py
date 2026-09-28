import os
import requests
from dotenv import load_dotenv

load_dotenv()

ASSET_NEWS_QUERIES = {
    "AAPL": "Apple Inc OR AAPL stock",
    "NVDA": "Nvidia OR NVDA stock OR artificial intelligence chips",
    "TSLA": "Tesla Motors OR TSLA stock OR Elon Musk",
    "MSFT": "Microsoft OR MSFT stock OR Azure",
    "AMZN": "Amazon.com OR AMZN stock OR AWS",
    "GOOGL": "Alphabet Google OR GOOGL stock",
    "META": "Meta Platforms OR Facebook stock",
    "NFLX": "Netflix streaming OR NFLX stock",
    "AMD": "Advanced Micro Devices OR AMD stock",
    "JPM": "JPMorgan Chase OR JPM banking",
    "BTCUSD": "Bitcoin OR BTC crypto market",
    "ETHUSD": "Ethereum OR ETH crypto",
    "EURUSD": "Euro Dollar OR EURUSD forex",
    "GC=F": "Gold futures OR bullion market",
    "SPY": "S&P 500 ETF OR SPY market index"
}

NOISE_FILTER_KEYWORDS = ["pypi", "python package", "npm", "github commit", "pull request", "merge branch"]

def is_article_relevant(title: str, ticker: str) -> bool:
    t_lower = title.lower()
    for noise in NOISE_FILTER_KEYWORDS:
        if noise in t_lower:
            return False
    return True

def analyze_news_impact_and_relevance(title: str, ticker: str) -> dict:
    t_lower = title.lower()
    
    positive_keywords = ["surge", "jump", "beat", "growth", "high", "bull", "inflow", "profit", "record", "rally", "gain", "strong", "approval", "partnership", "launch", "upgrade"]
    negative_keywords = ["drop", "fall", "miss", "loss", "bear", "down", "lawsuit", "slump", "risk", "warning", "decline", "cut", "probe", "investigation", "downgrade", "weak"]

    pos_score = sum(1 for kw in positive_keywords if kw in t_lower)
    neg_score = sum(1 for kw in negative_keywords if kw in t_lower)

    if pos_score > neg_score:
        impact = "Positive"
    elif neg_score > pos_score:
        impact = "Negative"
    else:
        impact = "Neutral"

    if "launch" in t_lower or "unveils" in t_lower or "released" in t_lower or "introducing" in t_lower:
        relevance = f"Directly drives hardware/software adoption cycles and expands ecosystem monetization potential for {ticker}."
    elif "earnings" in t_lower or "revenue" in t_lower or "profit" in t_lower or "sales" in t_lower:
        relevance = f"Directly impacts quarterly financial performance expectations and institutional valuation models for {ticker}."
    elif "fpi" in t_lower or "selling" in t_lower or "flows" in t_lower or "institutional" in t_lower:
        relevance = f"Reflects broader foreign portfolio investor capital allocation shifts directly influencing liquidity for {ticker}."
    elif "ai" in t_lower or "intelligence" in t_lower or "chip" in t_lower:
        relevance = f"Strengthens technological positioning and competitive differentiation in high-growth AI sectors for {ticker}."
    elif "lawsuit" in t_lower or "sec" in t_lower or "probe" in t_lower or "antitrust" in t_lower:
        relevance = f"Introduces regulatory scrutiny and legal compliance overhead that could cap near-term valuation multiples for {ticker}."
    elif "upgrade" in t_lower or "target" in t_lower or "analyst" in t_lower:
        relevance = f"Alters Wall Street consensus price targets and institutional sentiment driving retail order flow for {ticker}."
    else:
        key_snippet = " ".join([w for w in title.split() if len(w) > 4][:3])
        relevance = f"Discussion regarding '{key_snippet}' alters near-term trading sentiment and volatility expectations for {ticker}."

    return {
        "impact": impact,
        "relevance": relevance
    }

def fetch_company_news(ticker: str) -> list:
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        print("⚠️ NEWS_API_KEY not found in environment variables.")
        return []

    clean_ticker = ticker.upper().strip()
    query = ASSET_NEWS_QUERIES.get(clean_ticker, f"{clean_ticker} stock market")
    
    url = f"https://newsapi.org/v2/everything?q={requests.utils.quote(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey={api_key}"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            articles = data.get("articles", [])
            formatted_articles = []
            for art in articles:
                title = art.get("title", "")
                if title and title != "[Removed]":
                    if is_article_relevant(title, clean_ticker):
                        analysis = analyze_news_impact_and_relevance(title, clean_ticker)
                        formatted_articles.append({
                            "title": title,
                            "url": art.get("url", "#"),
                            "source": art.get("source", {}).get("name", "Financial News"),
                            "published_at": art.get("publishedAt", "Recent").split("T")[0],
                            "impact": analysis["impact"],
                            "relevance": analysis["relevance"]
                        })
            return formatted_articles
        else:
            print(f"Error fetching news: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"⚠️ News fetch exception: {e}")
    
    return []