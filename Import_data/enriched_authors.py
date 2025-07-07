import logging
import math
import time
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError
import requests

API_URL = "http://localhost:3000/authors"
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "research_db"
COLLECTION_NAME = "enriched_authors_from_api"
PAGE_SIZE = 50
MAX_RETRIES = 3
SLEEP_BETWEEN_RETRIES = 2

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

session = requests.Session()

def fetch_authors_page(page, limit):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            params = {"page": page, "limit": limit}
            response = session.get(API_URL, params=params, timeout=20)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            wait = SLEEP_BETWEEN_RETRIES ** attempt
            logging.warning(f"[Attempt {attempt}] Failed to fetch page {page}: {e}. Retrying in {wait}s...")
            time.sleep(wait)
    logging.error(f"Failed to fetch page {page} after {MAX_RETRIES} retries.")
    return None

def bulk_upsert_authors(authors):
    if not authors:
        return
    try:
        ops = [
            UpdateOne({"authorId": author["authorid"]}, {"$set": author}, upsert=True)
            for author in authors
        ]
        result = collection.bulk_write(ops, ordered=False)
        logging.info(f"Upserted authors: matched={result.matched_count}, upserted={len(result.upserted_ids)}")
    except BulkWriteError as bwe:
        logging.error(f"Bulk write error: {bwe.details}")

def main():
    logging.info("Starting to fetch authors from API and store to MongoDB...")

    first_page_data = fetch_authors_page(page=1, limit=PAGE_SIZE)
    if not first_page_data:
        logging.error("Could not fetch first page. Exiting.")
        return

    total_pages = first_page_data.get("totalPages", 1)
    total_authors = first_page_data.get("total", "?")
    logging.info(f"Total authors: {total_authors}, total pages: {total_pages}")

    bulk_upsert_authors(first_page_data.get("authors", []))

    for page in range(2, total_pages + 1):
        page_data = fetch_authors_page(page, PAGE_SIZE)
        if page_data:
            bulk_upsert_authors(page_data.get("authors", []))
            logging.info(f"Processed page {page}/{total_pages}")
        else:
            logging.warning(f"Skipping page {page} due to fetch failure.")

    logging.info("All authors fetched and stored!")

if __name__ == "__main__":
    main()