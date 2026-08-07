import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Find root directory (2 levels up from data_pipeline/news_data/)
root_dir = Path(__file__).resolve().parent.parent.parent
env_path = root_dir / '.env'

# Explicitly load .env from root
load_dotenv(dotenv_path=env_path)

def fetch_company_news(api_key: str, query: str = "stock market"):
    """Fetch news headlines using NewsAPI."""
    if not api_key:
        raise ValueError(f"NEWS_API_KEY is missing! Looking at path: {env_path}")
        
    # Updated URL with language=en
    url = f"https://newsapi.org/v2/everything?q={query}&language=en&sortBy=publishedAt&apiKey={api_key}"
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json().get("articles", [])
    else:
        print(f"Error fetching news: {response.status_code} - {response.text}")
        return []

if __name__ == "__main__":
    api_key = os.getenv("NEWS_API_KEY")
    articles = fetch_company_news(api_key=api_key, query="Apple stock")
    
    print(f"--- Fetched {len(articles)} News Articles ---")
    for article in articles[:3]:
        print(f"Headline: {article['title']}")
        print(f"Published At: {article['publishedAt']}\n")