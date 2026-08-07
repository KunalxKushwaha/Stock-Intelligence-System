import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Add project root to sys.path (3 levels up from fake_news_detection/collectors/)
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(root_dir))

# Load .env file from the correct project root
load_dotenv(root_dir / '.env')

def search_fact_check_claims(query: str, api_key: str = None) -> list:
    """Queries the Google Fact Check Tools API for claim reviews."""
    if not api_key:
        api_key = os.getenv("GOOGLE_FACT_CHECK_API_KEY")
        
    if not api_key:
        raise ValueError(f"GOOGLE_FACT_CHECK_API_KEY is missing! Check your .env file at {root_dir / '.env'}")
        
    url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {
        'query': query,
        'key': api_key,
        'languageCode': 'en'
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        claims = response.json().get('claims', [])
        return claims
    else:
        print(f"Error querying Fact Check API: {response.status_code} - {response.text}")
        return []

if __name__ == "__main__":
    test_query = "stock market"
    print(f"--- Fetching Fact-Check Claims for: '{test_query}' ---")
    results = search_fact_check_claims(test_query)
    
    print(f"Found {len(results)} claims.")
    for idx, claim in enumerate(results[:2], start=1):
        print(f"\n[{idx}] Claim: {claim.get('text')}")
        if 'claimReview' in claim and len(claim['claimReview']) > 0:
            review = claim['claimReview'][0]
            print(f"    Publisher: {review.get('publisher', {}).get('name')}")
            print(f"    Rating: {review.get('textualRating')}")