# Step 1: Load Data into MongoDB Collections

import jsonlines
from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor
import os

client = MongoClient('mongodb://localhost:27017/')
db = client['research_db']

collections = {
    'Input/authors.jsonl': db['authors'],
    'Input/D3_annotated_papers.jsonl': db['annotated_papers'],
    'Input/papers.jsonl': db['papers']
}

def import_jsonl_to_mongo(filepath, collection, batch_size = 1000):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    total_inserted = 0
    batch = []
    
    with jsonlines.open(filepath) as reader:
        for doc in reader:
            batch.append(doc)
            if len(batch) >= batch_size:
                collection.insert_many(batch)
                total_inserted += len(batch)
                print(f"[{collection.name}] Inserted batch of {len(batch)} (Total: {total_inserted})")
                batch.clear()

        if batch:
            collection.insert_many(batch)
            total_inserted += len(batch)
            print(f"[{collection.name}] Inserted final batch of {len(batch)} (Total: {total_inserted})")

    print(f"[{collection.name}] Finished inserting {total_inserted} documents from {filepath}")      

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers = 3) as executor:
        futures = []
        for filepath, collection in collections.items():
            futures.append(executor.submit(import_jsonl_to_mongo, filepath, collection))
        
        for future in futures:
            future.result()