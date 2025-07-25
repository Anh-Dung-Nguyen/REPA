from pymongo import MongoClient
from pymongo.errors import BulkWriteError
from threading import Thread, Lock
from queue import Queue
from tqdm import tqdm
import logging
import time

DB_NAME = "research_db"
ALL_TOPICS_COLLECTION = "all_topics"
AUTHOR_TOPICS_COLLECTION = "author_topics"
CORPUS_TOPICS_COLLECTION = "corpus_topics"
NEW_COLLECTION = "topic_author_corpus_counts"

client = MongoClient("mongodb://localhost:27017/")
db = client[DB_NAME]

NUM_WORKERS = 4
QUEUE_MAXSIZE = 1000

author_queue = Queue(maxsize=QUEUE_MAXSIZE)
corpus_queue = Queue(maxsize=QUEUE_MAXSIZE)
results_lock = Lock()
pbar_lock = Lock()

author_counts_map = {}
corpus_counts_map = {}

logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] %(message)s",
    level=logging.INFO
)

def safe_update_pbar(pbar):
    with pbar_lock:
        pbar.update(1)

def author_worker(pbar):
    while True:
        topic = author_queue.get()
        if topic is None:
            break
        count = db[AUTHOR_TOPICS_COLLECTION].aggregate([
            {"$match": {"topics": topic}},
            {"$group": {"_id": "$authorId"}},
            {"$count": "count"}
        ])
        count = next(count, {}).get("count", 0)
        with results_lock:
            author_counts_map[topic] = count
        author_queue.task_done()
        safe_update_pbar(pbar)

def corpus_worker(pbar):
    while True:
        topic = corpus_queue.get()
        if topic is None:
            break
        count = db[CORPUS_TOPICS_COLLECTION].aggregate([
            {"$match": {"topics": topic}},
            {"$group": {"_id": "$_id"}},
            {"$count": "count"}
        ])
        count = next(count, {}).get("count", 0)
        with results_lock:
            corpus_counts_map[topic] = count
        corpus_queue.task_done()
        safe_update_pbar(pbar)

if __name__ == "__main__":
    start_time = time.time()
    logging.info("Démarrage du traitement...")

    all_topics = db[ALL_TOPICS_COLLECTION].find({}, {"_id": 0, "topic": 1})
    all_topic_names = [doc["topic"] for doc in all_topics]
    logging.info(f"{len(all_topic_names)} topics chargés.")

    db[NEW_COLLECTION].drop()

    total_tasks = len(all_topic_names)
    pbar = tqdm(total=total_tasks * 2, desc="Processing Topics", unit="task")

    author_workers = [Thread(target=author_worker, args=(pbar,)) for _ in range(NUM_WORKERS)]
    for w in author_workers:
        w.start()

    corpus_workers = [Thread(target=corpus_worker, args=(pbar,)) for _ in range(NUM_WORKERS)]
    for w in corpus_workers:
        w.start()

    for topic in all_topic_names:
        author_queue.put(topic)
        corpus_queue.put(topic)

    for _ in range(NUM_WORKERS):
        author_queue.put(None)
        corpus_queue.put(None)

    for w in author_workers + corpus_workers:
        w.join()

    pbar.close()

    logging.info("Fusion des résultats et insertion dans MongoDB...")

    merged_results = []
    for topic in all_topic_names:
        count_author = author_counts_map.get(topic, 0)
        count_paper = corpus_counts_map.get(topic, 0)
        merged_results.append({
            "topic": topic,
            "count_author": count_author,
            "count_paper": count_paper,
            "total": count_author + count_paper
        })

    merged_results.sort(key=lambda x: x["total"], reverse=True)
    try:
        db[NEW_COLLECTION].insert_many(merged_results, ordered=False)
    except BulkWriteError as bwe:
        logging.warning("Bulk write error: %s", bwe.details)

    logging.info(f"Insertion terminée avec {len(merged_results)} topics.")
    logging.info(f"Terminé en {round(time.time() - start_time, 2)} secondes.")
