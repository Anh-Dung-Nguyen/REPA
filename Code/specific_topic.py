# Step 5: Filter out general topics, keep only specific ones

from pymongo import MongoClient
from threading import Thread, Lock
from queue import Queue
import itertools
import logging
import time

DB_NAME = "research_db"
SOURCE_COLLECTION = "author_topics"
TARGET_COLLECTION = "author_specific_topics"

BATCH_SIZE = 1000
NUM_WORKERS = 4
QUEUE_MAXSIZE = 1000

client = MongoClient("mongodb://localhost:27017/")
db = client[DB_NAME]

logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] %(message)s",
    level = logging.INFO
)

with open("specific_topics.txt", "r") as f:
    specific_topics = set(line.strip().lower() for line in f if line.strip())

batch_queue = Queue(maxsize = QUEUE_MAXSIZE)
insert_lock = Lock() 

def chunked_cursor(cursor, size):
    while True:
        batch = list(itertools.islice(cursor, size))
        if not batch:
            break
        yield batch

def filter_batch(batch):
    filtered_docs = []
    for doc in batch:
        topics = doc.get("topics", [])
        filtered = [t for t in topics if t.lower() in specific_topics]
        if filtered:
            filtered_docs.append({
                "authorId": doc["authorId"],
                "topics": filtered
            })
    return filtered_docs

def worker(worker_id):
    while True:
        batch = batch_queue.get()
        if batch is None:
            batch_queue.task_done()
            logging.info(f"[Worker-{worker_id}] received stop signal.")
            break

        filtered_docs = filter_batch(batch)

        if filtered_docs:
            with insert_lock:
                try:
                    db[TARGET_COLLECTION].insert_many(filtered_docs, ordered = False)
                except Exception as e:
                    logging.error(f"[Worker-{worker_id}] Insert error: {e}")

        batch_queue.task_done()
        logging.info(f"[Worker-{worker_id}] processed a batch of size {len(batch)}")

def producer():
    cursor = db[SOURCE_COLLECTION].find({}, no_cursor_timeout = True).batch_size(BATCH_SIZE)
    try:
        for batch in chunked_cursor(cursor, BATCH_SIZE):
            batch_queue.put(batch)
    finally:
        cursor.close()

if __name__ == "__main__":
    start_time = time.time()
    logging.info("Starting filtering and insertion of specific topics ...")

    db[TARGET_COLLECTION].drop()

    workers = []
    for i in range(NUM_WORKERS):
        t = Thread(target = worker, args = (i,))
        t.start()
        workers.append(t)

    producer()

    for _ in range(NUM_WORKERS):
        batch_queue.put(None)

    batch_queue.join()

    for t in workers:
        t.join()

    logging.info(f"Filtering and insertion done in {round(time.time() - start_time, 2)} seconds.")