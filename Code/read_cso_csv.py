# Find the specific topics

import pandas as pd
import urllib.parse
from collections import defaultdict
import re
import networkx as nx

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

        if topics.endswith("s") and not topics.endswith("ss"):
            topics = topics[:-1]

        return topics
    return None

df["super_topic"] = df["super_topic_uri"].apply(extract_topic)
df["sub_topic"] = df["sub_topic_uri"].apply(extract_topic)

df = df.dropna(subset = ["super_topic", "sub_topic"])

G = nx.DiGraph()
for _, row in df.iterrows():
    G.add_edge(row["super_topic"], row["sub_topic"])

precise = [node for node in G.nodes if G.out_degree(node) == 0 or G.out_degree(node) <= 2]

specific_topics = []
for node in G.nodes:
    if precise:
        specific_topics.append(node)

specific_topics = sorted(set(specific_topics))

print(f"General topics: {list(specific_topics)}")
print(f"Total general topics: {len(specific_topics)}")

with open("specific_topics.txt", "w") as f:
    for topic in sorted(specific_topics):
        f.write(topic + "\n")