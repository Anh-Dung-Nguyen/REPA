from pymongo import MongoClient
from threading import Thread
from queue import Queue
from collections import defaultdict
from tqdm import tqdm
import logging
import time
import itertools

DB_NAME = "research_db"
SOURCE_COLLECTION = "author_paper_topics"  
TEMP_COLLECTION = "temp_corpus_topics"
DESTINATION_COLLECTION = "corpus_topics"
BATCH_SIZE = 1000
NUM_WORKERS = 4
QUEUE_MAXSIZE = 1000

client = MongoClient("mongodb://localhost:27017/")
db = client[DB_NAME]

logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] %(message)s",
    level=logging.INFO
)

batch_queue = Queue(maxsize=QUEUE_MAXSIZE)

def chunked_cursor(cursor, size):
    while True:
        batch = list(itertools.islice(cursor, size))
        if not batch:
            break
        yield batch

def worker(worker_id, pbar):
    while True:
        batch = batch_queue.get()
        if batch is None:
            break

        local_data = defaultdict(set)

        for doc in batch:
            corpus_id = doc.get("corpusId")
            topics = doc.get("topics", [])

            if corpus_id:
                local_data[corpus_id].update(topics)

        docs = [{"corpusId": k, "topics": list(v)} for k, v in local_data.items()]
        if docs:
            db[TEMP_COLLECTION].insert_many(docs, ordered=False)

        batch_queue.task_done()
        pbar.update(1)

    logging.info(f"[Worker-{worker_id}] terminé.")

def producer():
    cursor = db[SOURCE_COLLECTION].find({}, no_cursor_timeout=True).batch_size(BATCH_SIZE)
    try:
        for batch in chunked_cursor(cursor, BATCH_SIZE):
            batch_queue.put(batch)
    finally:
        cursor.close()

def aggregate_and_save():
    logging.info("Agrégation finale dans MongoDB ...")

    pipeline = [
        {
            "$group": {
                "_id": "$corpusId",
                "topics": {"$addToSet": "$topics"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "corpusId": "$_id",
                "topics": {
                    "$reduce": {
                        "input": "$topics",
                        "initialValue": [],
                        "in": {"$setUnion": ["$$value", "$$this"]}
                    }
                }
            }
        },
        {
            "$out": DESTINATION_COLLECTION
        }
    ]

    db[TEMP_COLLECTION].aggregate(pipeline, allowDiskUse=True)
    logging.info("Agrégation enregistrée dans la collection finale.")

if __name__ == '__main__':
    start_time = time.time()
    logging.info("Nettoyage des anciennes collections ...")
    db[DESTINATION_COLLECTION].drop()
    db[TEMP_COLLECTION].drop()

    logging.info("Début de l'agrégation des topics par corpus ...")
    total_docs = db[SOURCE_COLLECTION].estimated_document_count()
    total_batches = total_docs // BATCH_SIZE + (1 if total_docs % BATCH_SIZE else 0)

    pbar = tqdm(total=total_batches, desc="Aggregation", unit="batch")

    workers = [Thread(target=worker, args=(i, pbar)) for i in range(NUM_WORKERS)]
    for w in workers:
        w.start()

    producer()

    for _ in range(NUM_WORKERS):
        batch_queue.put(None)

    for w in workers:
        w.join()

    pbar.close()
    aggregate_and_save()

    logging.info(f"Agrégation terminée en {round(time.time() - start_time, 2)} secondes.")