import logging
import time
from pymongo import MongoClient, UpdateOne
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import itertools
import threading
import gc
from queue import Queue
import sys

DB_NAME = "research_db"
SOURCE_COLLECTION = "papers_with_annotations"
DESTINATION_COLLECTION = "authors_papers_annotations"
BATCH_SIZE = 1000 
MAX_WORKERS = 4    
MAX_PENDING_TASKS = 50  
BULK_CHUNK_SIZE = 500  

logging.basicConfig(
    level = logging.INFO,
    format = "%(asctime)s - %(levelname)s - %(message)s"
)

thread_local = threading.local()

def get_db_connection():
    if not hasattr(thread_local, 'client'):
        thread_local.client = MongoClient(
            "mongodb://localhost:27017",
            maxPoolSize = 10
        )
        thread_local.db = thread_local.client[DB_NAME]
        thread_local.output_collection = thread_local.db[DESTINATION_COLLECTION]
    
    return thread_local.output_collection

def batched_cursor(cursor, batch_size):
    while True:
        batch = list(itertools.islice(cursor, batch_size))
        if not batch:
            break
        yield batch

def process_batch_chunked(batch):
    try:
        output_collection = get_db_connection()
        
        author_papers = defaultdict(list)
        
        for paper in batch:
            paper_id = paper.get("_id")
            title = paper.get("title", "")
            annotation = paper.get("annotation", {})
            
            authors = paper.get("authors", [])
            if not authors:
                continue
                
            entry = {
                "paperId": paper_id,
                "title": title,
                "annotation": annotation
            }
            
            for author in authors:
                author_id = author.get("authorId")
                if author_id:
                    author_papers[author_id].append(entry)
        
        author_items = list(author_papers.items())
        total_processed = 0
        
        for i in range(0, len(author_items), BULK_CHUNK_SIZE):
            chunk = author_items[i : i + BULK_CHUNK_SIZE]
            requests = []
            
            for author_id, papers in chunk:
                requests.append(UpdateOne(
                    {"authorId": author_id},
                    {"$push": {"papers": {"$each": papers}}},
                    upsert=True
                ))
            
            if requests:
                try:
                    output_collection.bulk_write(requests, ordered = False)
                    total_processed += len(requests)
                except Exception as e:
                    logging.error(f"Erreur bulk_write chunk: {str(e)}")
                    continue
        
        del author_papers, author_items
        gc.collect()
        
        return len(batch)
        
    except Exception as e:
        logging.error(f"Erreur dans process_batch_chunked: {str(e)}")
        return 0

def create_indexes():
    client = MongoClient("mongodb://localhost:27017")
    db = client[DB_NAME]
    output_collection = db[DESTINATION_COLLECTION]
    
    try:
        output_collection.create_index("authorId", background=True)
        logging.info("Index créé sur authorId")
    except Exception as e:
        logging.warning(f"Erreur création index: {e}")
    finally:
        client.close()

def get_total_documents():
    client = MongoClient("mongodb://localhost:27017")
    db = client[DB_NAME]
    try:
        return db[SOURCE_COLLECTION].count_documents({})
    finally:
        client.close()

def main():
    start_time = time.time()
    
    logging.info("Création des index...")
    create_indexes()
    
    total_docs = get_total_documents()
    logging.info(f"Traitement de {total_docs:,} documents")
    
    main_client = MongoClient(
        "mongodb://localhost:27017",
        maxPoolSize=20,
        readPreference='secondaryPreferred'
    )
    db = main_client[DB_NAME]
    papers_collection = db[SOURCE_COLLECTION]
    
    cursor = papers_collection.find(
        {},
        {"_id": 1, "title": 1, "authors.authorId": 1, "annotation": 1},
        no_cursor_timeout=True,
        batch_size=1000
    )
    
    total_submitted = 0
    total_completed = 0
    pending_futures = []
    last_log_time = start_time
    
    try:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            batch_generator = batched_cursor(cursor, BATCH_SIZE)
            
            for batch in batch_generator:
                future = executor.submit(process_batch_chunked, batch)
                pending_futures.append(future)
                total_submitted += len(batch)
                
                if len(pending_futures) >= MAX_PENDING_TASKS:
                    completed_futures = []
                    for f in as_completed(pending_futures):
                        try:
                            result = f.result()
                            total_completed += result
                        except Exception as e:
                            logging.error(f"Erreur dans un thread: {e}")
                        completed_futures.append(f)
                    
                    pending_futures = [f for f in pending_futures if f not in completed_futures]
                
                current_time = time.time()
                if current_time - last_log_time > 30: 
                    elapsed = current_time - start_time
                    rate = total_completed / elapsed if elapsed > 0 else 0
                    progress = (total_completed / total_docs) * 100 if total_docs > 0 else 0
                    
                    logging.info(
                        f"Soumis: {total_submitted:,} | Terminé: {total_completed:,} | "
                        f"Progression: {progress:.1f}% | Vitesse: {rate:.0f} docs/sec | "
                        f"Tâches en attente: {len(pending_futures)}"
                    )
                    last_log_time = current_time
                
                if sys.getsizeof(pending_futures) > 100 * 1024 * 1024:
                    logging.warning("Limite mémoire atteinte, attente des tâches...")
                    for f in as_completed(pending_futures):
                        try:
                            result = f.result()
                            total_completed += result
                        except Exception as e:
                            logging.error(f"Erreur dans un thread: {e}")
                    pending_futures.clear()
            
            logging.info("Traitement des dernières tâches...")
            for f in as_completed(pending_futures):
                try:
                    result = f.result()
                    total_completed += result
                except Exception as e:
                    logging.error(f"Erreur dans un thread: {e}")
    
    except KeyboardInterrupt:
        logging.info("Interruption utilisateur")
    except Exception as e:
        logging.error(f"Erreur principale: {e}")
    finally:
        cursor.close()
        main_client.close()
    
    elapsed_time = time.time() - start_time
    logging.info(
        f"Traitement terminé: {total_completed:,} documents en {elapsed_time:.2f}s "
        f"({total_completed/elapsed_time:.0f} docs/sec)"
    )

if __name__ == "__main__":
    main()