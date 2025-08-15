import pandas as pd
from pymongo import MongoClient
from pymongo.errors import BulkWriteError
from threading import Thread, Lock
from queue import Queue
from tqdm import tqdm
import logging
import time

CSV_FILE = "../Input/scimagojr_2024.csv"
DB_NAME = "research_db"
COLLECTION_NAME = "journal_data"
MONGO_URI = "mongodb://localhost:27017/"
NUM_WORKERS = 4
QUEUE_MAXSIZE = 1000

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

task_queue = Queue(maxsize=QUEUE_MAXSIZE)
pbar_lock = Lock()

logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] %(message)s",
    level=logging.INFO
)

def safe_update_pbar(pbar):
    with pbar_lock:
        pbar.update(1)

def worker(pbar):
    while True:
        row = task_queue.get()
        if row is None:
            break
        try:
            db[COLLECTION_NAME].insert_one(row)
        except BulkWriteError as bwe:
            logging.warning("Bulk write error: %s", bwe.details)
        except Exception as e:
            logging.error(f"Insert error: {e}")
        task_queue.task_done()
        safe_update_pbar(pbar)

if __name__ == "__main__":
    start_time = time.time()
    logging.info("Loading CSV file...")

    df = pd.read_csv(CSV_FILE, sep=";", encoding="utf-8", quotechar='"')

    df.columns = df.columns.str.strip().str.replace(" ", "_")

    records = df.to_dict(orient="records")
    total_records = len(records)
    logging.info(f"Loaded {total_records} records from CSV.")

    db[COLLECTION_NAME].drop()

    pbar = tqdm(total=total_records, desc="Inserting records", unit="doc")

    workers = [Thread(target=worker, args=(pbar,)) for _ in range(NUM_WORKERS)]
    for w in workers:
        w.start()

    for record in records:
        task_queue.put(record)

    for _ in range(NUM_WORKERS):
        task_queue.put(None)

    for w in workers:
        w.join()

    pbar.close()
    logging.info(f"Inserted {total_records} documents into MongoDB.")
    logging.info(f"Finished in {round(time.time() - start_time, 2)} seconds.")