import logging
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import sleep

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "research_db"
AUTHOR_COLLECTION = "authors_papers_annotations"
PAPER_COLLECTION = "papers_with_annotations"
NEW_COLLECTION_NAME = "enriched_authors_papers_annotations"
TOPICS_API_URL = "http://localhost:8000/author_specific_topics/filtered_author_paper_topics/author"

MAX_PAPER_THREADS = 4
BATCH_SIZE = 4000000
API_RETRIES = 3

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

session = requests.Session()


def fetch_topics(author_id):
    url = f"{TOPICS_API_URL}/{author_id}"
    for attempt in range(1, API_RETRIES + 1):
        try:
            response = session.get(url, timeout=25)
            response.raise_for_status()
            topics_list = response.json()
            return {int(item['corpusId']): item.get('topics', []) for item in topics_list}
        except requests.RequestException as e:
            wait = 2 ** attempt
            logging.warning(f"[Attempt {attempt}] Error fetching topics for authorId={author_id}: {e}. Retrying in {wait}s")
            sleep(wait)
    logging.error(f"Failed to fetch topics after retries for authorId={author_id}")
    return {}


def enrich_paper(paper, author_id, corpusIdToTopics):
    corpusid_str = paper.get('annotation', {}).get('corpusid')
    try:
        corpusid = int(corpusid_str)
    except (TypeError, ValueError):
        logging.warning(f"Invalid corpusid for authorId={author_id}: {corpusid_str}")
        return paper

    paper_details = db[PAPER_COLLECTION].find_one(
        {"corpusid": corpusid},
        {"_id": 0, "year": 1, "referencecount": 1, "citationcount": 1,
         "influentialcitationcount": 1, "venue": 1, "abstract": 1, "authors": 1}
    )

    num_coauthors = sum(
        1 for a in (paper_details.get("authors") or []) if a.get("authorId") != author_id
    ) if paper_details else 0

    specific_topics = corpusIdToTopics.get(corpusid, [])

    enriched = {
        **paper,
        **(paper_details or {}),
        "numberOfCoAuthors": num_coauthors,
        "specificTopics": specific_topics
    }
    return enriched


def enrich_all_papers(author_id, papers, corpusIdToTopics):
    enriched_papers = []
    with ThreadPoolExecutor(max_workers=MAX_PAPER_THREADS) as executor:
        futures = [executor.submit(enrich_paper, paper, author_id, corpusIdToTopics) for paper in papers]
        for future in as_completed(futures):
            try:
                enriched_papers.append(future.result())
            except Exception as e:
                logging.error(f"Error enriching paper for authorId={author_id}: {e}")
    return enriched_papers


def process_author(author):
    author_id = author.get("authorId")
    name = author.get("name")
    papers = author.get("papers", [])

    if not author_id or not papers:
        logging.warning(f"Skipping author with missing authorId or papers")
        return None

    corpusIdToTopics = fetch_topics(author_id)
    enriched_papers = enrich_all_papers(author_id, papers, corpusIdToTopics)

    return {
        "authorId": author_id,
        "name": name,
        "papers": enriched_papers
    }


def bulk_upsert(docs):
    if not docs:
        return
    try:
        requests = [
            UpdateOne(
                {"authorId": doc["authorId"]},
                {"$set": doc},
                upsert=True
            )
            for doc in docs
        ]
        result = db[NEW_COLLECTION_NAME].bulk_write(requests, ordered=False)
        logging.info(f"Bulk upsert done: {result.bulk_api_result}")
    except BulkWriteError as bwe:
        logging.error(f"Bulk write error: {bwe.details}")


def enrich_and_store_all_authors():
    logging.info("Starting to process all authors...")
    cursor = db[AUTHOR_COLLECTION].find(
        {},
        {"_id": 0, "authorId": 1, "name": 1, "papers.title": 1, "papers.annotation": 1},
        no_cursor_timeout=True
    )

    batch = []
    count = 0

    try:
        for author in cursor:
            enriched = process_author(author)
            if enriched:
                batch.append(enriched)
                count += 1

            if len(batch) >= BATCH_SIZE:
                bulk_upsert(batch)
                batch.clear()
                logging.info(f"Processed authors so far: {count}")

        if batch:
            bulk_upsert(batch)
            logging.info(f"Processed total authors: {count}")

    finally:
        cursor.close()
        logging.info("All authors processed!")


if __name__ == "__main__":
    logging.info("Script started")
    enrich_and_store_all_authors()
    logging.info("Script finished")