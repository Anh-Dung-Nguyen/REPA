# Step 2: Link papers with their annotated topics by corpusid

from pymongo import MongoClient
from concurrent.futures import ThreadPoolExecutor
import threading
from itertools import islice

client = MongoClient('mongodb://localhost:27017/')
db = client['research_db']

papers_col = db['papers']
annotated_col = db['annotated_papers']
linked_col = db['papers_with_annotations']

linked_col.delete_many({})

annotated_col.create_index('corpusid')

lock = threading.Lock()  
inserted_count = 0
batch_size = 1000
max_threads = 6

def link_annotation(paper):
    corpusid = paper.get('corpusid')
    if not corpusid:
        return paper

    annotation = annotated_col.find_one({'corpusid': corpusid})
    if annotation:
        annotation.pop('_id', None)
        paper['annotation'] = annotation
    else:
        paper['annotation'] = None
    return paper

def batched_iterator(cursor, size):
    while True:
        batch = list(islice(cursor, size))
        if not batch:
            break
        yield batch

if __name__ == '__main__':
    cursor = papers_col.find({}, no_cursor_timeout=True).batch_size(batch_size)

    for batch in batched_iterator(cursor, batch_size):
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            processed_batch = list(executor.map(link_annotation, batch))

        linked_col.insert_many(processed_batch)

        with lock:
            inserted_count += len(processed_batch)
            print(f"Inserted and linked {inserted_count} papers...")

    print(f"\nDone. Total inserted: {inserted_count} documents in '{linked_col.name}'")