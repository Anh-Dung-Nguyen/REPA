import pandas as pd
from pymongo import MongoClient

csv_file = '../Output/all_topics_ranked.csv'
df = pd.read_csv(csv_file)

client = MongoClient('mongodb://localhost:27017/')
db = client['research_db']
collection = db['impact_all_topic']

data = df.to_dict(orient='records')
collection.insert_many(data)

print("Data inserted successfully into MongoDB collection 'impact_all_topic'.")