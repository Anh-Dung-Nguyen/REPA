# Step 4: Aggregate all annotated topics of all papers of each author

from pymongo import MongoClient
from threading import Thread, Lock
from queue import Queue
from collections import defaultdict
from tqdm import tqdm
import logging
import time
import itertools

DB_NAME = "research_db"
SOURCE_COLLECTION = "author_paper_topics"
DESTINATION_COLLECTION = "author_topics"
BATCH_SIZE = 1000
NUM_WORKERS = 4
QUEUE_MAXSIZE = 1000

client = MongoClient("mongodb://localhost:27017/")
db = client[DB_NAME]

logging.basicConfig(
    format = "%(asctime)s - [%(levelname)s] %(message)s",
    level = logging.INFO
)

batch_queue = Queue(maxsize = QUEUE_MAXSIZE)
global_author_topic = defaultdict(set)
global_lock = Lock()

def chunked_cursor(cursor, size):
    while True:
        batch = list(itertools.islice(cursor, size))
        if not batch:
            break
        yield batch

def worker(worker_id, pbar):
    local_data = defaultdict(set)

    while True:
        batch = batch_queue.get()
        if batch is None:
            break

        for doc in batch:
            author_id = doc.get("authorId")
            topics = doc.get("topics", [])

            if author_id:
                local_data[author_id].update(topics)

        batch_queue.task_done()
        pbar.update(1)
    
    with global_lock:
        for aid, topics in local_data.items():
            global_author_topic[aid].update(topics)

    logging.info(f"[Worker-{worker_id}] terminé.")

def producer():
    cursor = db[SOURCE_COLLECTION].find({}, no_cursor_timeout = True).batch_size(BATCH_SIZE)
    try:
        for batch in chunked_cursor(cursor, BATCH_SIZE):
            batch_queue.put(batch)
    
    finally:
        cursor.close()

def save_to_db():
    docs = [{"authorId": k, "topics": list(v)} for k, v in global_author_topic.items()]
    for i in range(0, len(docs), 1000):
        db[DESTINATION_COLLECTION].insert_many(docs[i : i + 1000], ordered = False)

if __name__ == '__main__':
    start_time = time.time()
    logging.info("Début de l'agrégation des topics par auteur ... ")
    db[DESTINATION_COLLECTION].drop()

    total_docs = db[SOURCE_COLLECTION].estimated_document_count()
    total_batches = total_docs // BATCH_SIZE + (1 if total_docs % BATCH_SIZE else 0)

    pbar = tqdm(total = total_batches, desc = "Aggregation", unit = "batch")

    workers = [Thread(target = worker, args = (i, pbar)) for i in range(NUM_WORKERS)]

    for w in workers:
        w.start()

    producer()

    for _ in range(NUM_WORKERS):
        batch_queue.put(None)

    for w in workers:
        w.join()

    pbar.close()
    logging.info("Insertion des résultats finaux dans MongoDB ... ")
    save_to_db()

    logging.info(f"Agrégation terminée en {round(time.time() - start_time, 2)} secondes.")