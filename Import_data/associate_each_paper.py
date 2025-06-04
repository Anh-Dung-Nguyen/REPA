# Step 3: Associate each paper with its authors and annotated topics

from pymongo import MongoClient
from pymongo.errors import BulkWriteError
from threading import Thread, Lock
from queue import Queue
from tqdm import tqdm
import time
import logging
import itertools

BATCH_SIZE = 1000
NUM_WORKERS = 4             
QUEUE_MAXSIZE = 1000         
DB_NAME = "research_db"
PAPERS_COLLECTION = "papers"
ANNOTATIONS_COLLECTION = "annotated_papers"
NEW_COLLECTION = "author_paper_topics"

client = MongoClient("mongodb://localhost:27017/")
db = client[DB_NAME]

batch_queue = Queue(maxsize = QUEUE_MAXSIZE)
pbar_lock = Lock()

logging.basicConfig(
    format = "%(asctime)s - [%(levelname)s] %(message)s",
    level = logging.INFO
)

def safe_update_pbar(pbar):
    with pbar_lock:
        pbar.update(1)

def load_all_annotations():
    logging.info("Préchargement des annotations...")
    annotations = {}
    cursor = db[ANNOTATIONS_COLLECTION].find({}, {
        "corpusid": 1,
        "syntactic": 1,
        "semantic": 1,
        "enhanced": 1,
        "union": 1
    })
    for doc in cursor:
        corpusid = doc["corpusid"]
        topics = set()
        for key in ["syntactic", "semantic", "enhanced", "union"]:
            topics.update(doc.get(key, []))
        annotations[corpusid] = list(topics)
    logging.info(f"{len(annotations)} annotations chargées en mémoire.")
    return annotations

def safe_insert_many(docs, batch_size = 500):
    for i in range(0, len(docs), batch_size):
        try:
            db[NEW_COLLECTION].insert_many(docs[i : i + batch_size], ordered = False)
        except BulkWriteError as e:
            logging.warning("Bulk write error: %s", e.details)

def worker(worker_id, pbar, annotations):
    while True:
        paper_batch = batch_queue.get()
        if paper_batch is None:
            break

        local_docs = []
        for paper in paper_batch:
            corpusid = paper.get("corpusid")
            authors = paper.get("authors", [])
            topics = annotations.get(corpusid)
            if not topics or not authors:
                continue

            for author in authors:
                doc = {
                    "authorId": author.get("authorId"),
                    "paperId": paper.get("_id"),
                    "corpusId": corpusid,
                    "topics": topics
                }
                local_docs.append(doc)

        if local_docs:
            safe_insert_many(local_docs)

        batch_queue.task_done()
        safe_update_pbar(pbar)

    logging.info(f"[Worker-{worker_id}] terminé.")

def chunked_cursor(cursor, size):
    while True:
        batch = list(itertools.islice(cursor, size))
        if not batch:
            break
        yield batch

def producer():
    cursor = db[PAPERS_COLLECTION].find({}, no_cursor_timeout = True).batch_size(BATCH_SIZE)
    batch_count = 0
    try:
        for batch in chunked_cursor(cursor, BATCH_SIZE):
            batch_queue.put(batch)
            batch_count += 1
        logging.info(f"[Producteur] {batch_count} batches envoyés à la file.")
    finally:
        cursor.close()

if __name__ == "__main__":
    start_time = time.time()

    db[NEW_COLLECTION].drop()
    logging.info("Collection cible vidée.")

    total_docs = db[PAPERS_COLLECTION].estimated_document_count()
    total_batches = total_docs // BATCH_SIZE + (1 if total_docs % BATCH_SIZE else 0)
    logging.info(f"Total de documents : {total_docs} → environ {total_batches} batches")

    annotations = load_all_annotations()

    pbar = tqdm(total=total_batches, desc="Progression", unit="batch")

    workers = [Thread(target = worker, args = (i, pbar, annotations)) for i in range(NUM_WORKERS)]
    for w in workers:
        w.start()

    producer()

    for _ in range(NUM_WORKERS):
        batch_queue.put(None)
    for w in workers:
        w.join()

    pbar.close()
    logging.info(f"Insertion terminée en {round(time.time() - start_time, 2)} secondes.")
