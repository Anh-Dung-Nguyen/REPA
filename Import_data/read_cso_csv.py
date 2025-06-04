# Find the specific topics

import pandas as pd
import urllib.parse
from collections import defaultdict
import re
import networkx as nx
from nltk.stem import WordNetLemmatizer

import nltk
nltk.download('wordnet')
nltk.download('omw-1.4')

lemmatizer = WordNetLemmatizer()

df = pd.read_csv("Documents/CSO.3.4.1.csv", header = None)
df.columns = ["super_topic_uri", "predicate", "sub_topic_uri"]

def extract_topic(uri):
    if isinstance(uri, str) and "topics/" in uri:
        topics = uri.split("/")[-1]
        topics = urllib.parse.unquote(topics)
        topics = topics.lower()
        topics = re.sub(r"\s*\([^)]*\)", "", topics)
        topics = topics.replace("-", "").replace("_", " ")
        topics = topics.strip().lower().strip(">")
        topics = re.sub(r"\s+", " ", topics).strip()

        words = topics.split()
        lemmatized = [lemmatizer.lemmatize(word, pos = 'n') for word in words]
        topics = " ".join(lemmatized)

        return topics
    return None

df["super_topic"] = df["super_topic_uri"].apply(extract_topic)
df["sub_topic"] = df["sub_topic_uri"].apply(extract_topic)

df = df.dropna(subset = ["super_topic", "sub_topic"])

G = nx.DiGraph()
for _, row in df.iterrows():
    G.add_edge(row["super_topic"], row["sub_topic"])

leaves = [node for node in G.nodes if G.out_degree(node) == 0 or G.out_degree(node) <= 2]

with open("specific_topics.txt", "w") as f:
    for topic in sorted(leaves):
        f.write(topic + "\n")

print(f"Total specific (leaf) topics: {len(leaves)}")