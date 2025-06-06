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

def build_graph(csv_path):
    df = pd.read_csv(csv_path, header=None, names=["super_topic_uri", "predicate", "sub_topic_uri"])
    df["super_topic"] = df["super_topic_uri"].apply(extract_topic)
    df["sub_topic"] = df["sub_topic_uri"].apply(extract_topic)
    df = df.dropna(subset=["super_topic", "sub_topic"])

    G = nx.DiGraph()
    for _, row in df.iterrows():
        G.add_edge(row["super_topic"], row["sub_topic"])
    return G

def find_specific_topics(G, max_out_degree=2):
    return sorted([
        node for node in G.nodes
        if G.out_degree(node) <= max_out_degree
    ])

def export_topics(topics, filename):
    with open(filename, "w", encoding="utf-8") as f:
        for topic in topics:
            f.write(topic + "\n")
    print(f"{len(topics)} specific topics written to {filename}")

def main():
    csv_path = "Documents/CSO.3.4.1.csv"
    print("Building topic graph...")
    G = build_graph(csv_path)

    print("Finding specific topics...")
    specific_topics = find_specific_topics(G)

    export_topics(specific_topics, "specific_topics.txt")

if __name__ == "__main__":
    main()