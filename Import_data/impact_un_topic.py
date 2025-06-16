import pandas as pd
import numpy as np
import urllib.parse
import re
import networkx as nx
from nltk.stem import WordNetLemmatizer
from collections import defaultdict
import math
import nltk

try:
    nltk.download('wordnet', quiet = True)
    nltk.download('omw-1.4', quiet = True)
except:
    pass

class CSOTopicImpactCalculator:
    def __init__(self, csv_file_path, specific_topics_file):
        self.csv_file = csv_file_path
        self.specific_topics_file = specific_topics_file
        self.lemmatizer = WordNetLemmatizer()
        
        self.graph = nx.DiGraph()
        self.reverse_graph = defaultdict(list)
        self.equivalents = defaultdict(list)
        self.contributions = defaultdict(list)
        self.specific_topics = set()
        
        self.depth_cache = {}
        self.influence_cache = {}
        self.centrality_cache = {}
        self.frequency_cache = {}
        
        self.alpha = 0.4
        self.beta = 0.35
        self.gamma = 0.25
        
        self.load_data()
        self._compute_topic_frequencies()
        self._compute_centrality_measures()
    
    def extract_topic(self, uri):
        if isinstance(uri, str) and "topics/" in uri:
            topics = uri.split("/")[-1]
            topics = urllib.parse.unquote(topics)
            topics = topics.lower()
            topics = re.sub(r"\s*\([^)]*\)", "", topics)
            topics = topics.replace("-", "").replace("_", " ")
            topics = topics.strip().lower().strip(">")
            topics = re.sub(r"\s+", " ", topics).strip()
            words = topics.split()
            lemmatized = [self.lemmatizer.lemmatize(word, pos = 'n') for word in words]
            topics = " ".join(lemmatized)
            return topics
        return None
    
    def load_data(self):
        print("Chargement des données...")
        
        with open(self.specific_topics_file, 'r', encoding = 'utf-8') as f:
            self.specific_topics = set(line.strip() for line in f if line.strip())
        print(f"Topics spécifiques chargés: {len(self.specific_topics)}")
        
        df = pd.read_csv(self.csv_file, header = None)
        df.columns = ["super_topic_uri", "predicate", "sub_topic_uri"]
        
        print("Preprocessing des topics...")
        df["super_topic"] = df["super_topic_uri"].apply(self.extract_topic)
        df["sub_topic"] = df["sub_topic_uri"].apply(self.extract_topic)
        df = df.dropna(subset = ["super_topic", "sub_topic"])
        
        for _, row in df.iterrows():
            self.graph.add_edge(row["super_topic"], row["sub_topic"])
            self.reverse_graph[row["sub_topic"]].append(row["super_topic"])
        
        for _, row in df.iterrows():
            super_topic = row["super_topic"]
            sub_topic = row["sub_topic"]
            predicate = row["predicate"]
            
            if 'relatedEquivalent' in predicate:
                self.equivalents[super_topic].append(sub_topic)
                self.equivalents[sub_topic].append(super_topic)
            elif 'contributesTo' in predicate:
                self.contributions[super_topic].append(sub_topic)
        
        print(f"Graphe construit: {self.graph.number_of_nodes()} noeuds, {self.graph.number_of_edges()} arêtes")
    
    def _compute_topic_frequencies(self):
        for node in self.graph.nodes():
            in_degree = self.graph.in_degree(node)
            out_degree = self.graph.out_degree(node)
            
            frequency = in_degree + out_degree + len(self.equivalents.get(node, []))
            self.frequency_cache[node] = max(1, frequency)  
    
    def _compute_centrality_measures(self):
        degree_centrality = nx.degree_centrality(self.graph)
        
        try:
            closeness_centrality = nx.closeness_centrality(self.graph)
        except:
            closeness_centrality = {node: 0 for node in self.graph.nodes()}
        
        try:
            if self.graph.number_of_nodes() < 1000:
                betweenness_centrality = nx.betweenness_centrality(self.graph)
            else:
                betweenness_centrality = nx.betweenness_centrality(self.graph, k = min(100, self.graph.number_of_nodes()))
        except:
            betweenness_centrality = {node: 0 for node in self.graph.nodes()}
        
        for node in self.graph.nodes():
            combined_centrality = (
                0.4 * degree_centrality.get(node, 0) +
                0.3 * closeness_centrality.get(node, 0) +
                0.3 * betweenness_centrality.get(node, 0)
            )
            self.centrality_cache[node] = combined_centrality
    
    def calculate_depth(self, topic_id, visited = None):
        if visited is None:
            visited = set()

        if topic_id in self.depth_cache:
            return self.depth_cache[topic_id]
        
        if topic_id in visited:
            return 0
        
        if topic_id not in self.graph.nodes():
            self.depth_cache[topic_id] = 0
            return 0

        visited.add(topic_id)
        
        predecessors = list(self.graph.predecessors(topic_id))
        if not predecessors:
            self.depth_cache[topic_id] = 0
            return 0

        max_depth = 0
        for parent in predecessors:
            parent_depth = self.calculate_depth(parent, visited.copy())  
            max_depth = max(max_depth, parent_depth + 1)

        self.depth_cache[topic_id] = max_depth
        return max_depth

    
    def calculate_information_content(self, topic_id):
        if topic_id not in self.frequency_cache:
            return 0.0
        
        total_freq = sum(self.frequency_cache.values())
        if total_freq == 0:
            return 0.0
        
        prob = self.frequency_cache[topic_id] / total_freq
        return -math.log(prob + 1e-10)
    
    def find_lowest_common_ancestor(self, topic1, topic2):
        if topic1 not in self.graph.nodes() or topic2 not in self.graph.nodes():
            return None
        
        try:
            ancestors1 = set(nx.ancestors(self.graph, topic1))
            ancestors1.add(topic1)
            
            ancestors2 = set(nx.ancestors(self.graph, topic2))
            ancestors2.add(topic2)
            
            common_ancestors = ancestors1.intersection(ancestors2)
            if not common_ancestors:
                return None
            
            lca = max(common_ancestors, key = lambda x: self.calculate_depth(x))
            return lca
        except:
            return None
    
    def calculate_lin_similarity(self, topic1, topic2):
        if topic1 == topic2:
            return 1.0
        
        if topic2 in self.equivalents.get(topic1, []):
            return 0.9 
        
        lca = self.find_lowest_common_ancestor(topic1, topic2)
        if not lca:
            return 0.0
        
        ic1 = self.calculate_information_content(topic1)
        ic2 = self.calculate_information_content(topic2)
        ic_lca = self.calculate_information_content(lca)
        
        if ic1 + ic2 == 0:
            return 0.0
        
        return (2 * ic_lca) / (ic1 + ic2)
    
    def calculate_influence_score(self, topic_id):
        if topic_id in self.influence_cache:
            return self.influence_cache[topic_id]
        
        if topic_id not in self.graph.nodes():
            return 0.0
        
        centrality_score = self.centrality_cache.get(topic_id, 0)
        
        children_count = self.graph.out_degree(topic_id)
        parents_count = self.graph.in_degree(topic_id)
        
        equiv_count = len(self.equivalents.get(topic_id, []))
        contrib_count = len(self.contributions.get(topic_id, []))
        
        connectivity_score = children_count + 0.5 * parents_count + 0.3 * equiv_count + 0.2 * contrib_count
        
        influence = 0.6 * centrality_score + 0.4 * math.log(1 + connectivity_score)
        
        self.influence_cache[topic_id] = influence
        return influence
    
    def calculate_semantic_weight(self, topic_id, reference_topics):
        if not reference_topics:
            if self.specific_topics:
                reference_topics = list(self.specific_topics.intersection(set(self.graph.nodes())))[:20]
            else:
                sorted_topics = sorted(self.centrality_cache.items(), key = lambda x: x[1], reverse = True)
                reference_topics = [t[0] for t in sorted_topics[:20]]
        
        if not reference_topics:
            return 0.0
        
        similarities = []
        for ref_topic in reference_topics:
            if ref_topic != topic_id and ref_topic in self.graph.nodes():
                sim = self.calculate_lin_similarity(topic_id, ref_topic)
                similarities.append(sim)
        
        return np.mean(similarities) if similarities else 0.0
    
    def calculate_impact_factor(self, topic_id, reference_topics):
        if topic_id not in self.graph.nodes():
            return {'error': f'Topic {topic_id} not found'}
        
        depth = self.calculate_depth(topic_id)
        max_depth = max([self.calculate_depth(t) for t in self.graph.nodes()]) if self.graph.nodes() else 1
        depth_score = depth / max_depth if max_depth > 0 else 0
        
        influence = self.calculate_influence_score(topic_id)
        max_influence = max(self.influence_cache.values()) if self.influence_cache else 1
        influence_score = influence / max_influence if max_influence > 0 else 0
        
        semantic_score = self.calculate_semantic_weight(topic_id, reference_topics)
        
        impact_factor = (
            self.alpha * depth_score +
            self.beta * influence_score +
            self.gamma * semantic_score
        )
        
        is_specific = topic_id in self.specific_topics
        if is_specific:
            impact_factor *= 1.1
        
        return {
            'topic_id': topic_id,
            'topic_label': topic_id.replace('_', ' ').title(),
            'depth': depth,
            'depth_score': depth_score,
            'influence_score': influence_score,
            'semantic_score': semantic_score,
            'impact_factor': impact_factor,
            'frequency': self.frequency_cache.get(topic_id, 0),
            'centrality': self.centrality_cache.get(topic_id, 0),
            'is_specific_topic': is_specific,
            'equivalents_count': len(self.equivalents.get(topic_id, [])),
            'contributions_count': len(self.contributions.get(topic_id, []))
        }
    
    def rank_topics_by_impact(self, topic_ids=None, top_k=10, specific_topics_only=False):
        if topic_ids is None:
            if specific_topics_only:
                topic_ids = list(self.specific_topics.intersection(set(self.graph.nodes())))
            else:
                topic_ids = list(self.graph.nodes())

        print(f"Analyse de {len(topic_ids)} topics...")

        reference_topics = list(self.specific_topics.intersection(set(self.graph.nodes())))[:20]
        if not reference_topics:
            sorted_topics = sorted(self.centrality_cache.items(), key=lambda x: x[1], reverse=True)
            reference_topics = [t[0] for t in sorted_topics[:20]]

        results = []
        for i, topic_id in enumerate(topic_ids):
            if i % 100 == 0:
                print(f"Progression: {i}/{len(topic_ids)}")

            impact_data = self.calculate_impact_factor(topic_id, reference_topics)
            if 'error' not in impact_data:
                results.append(impact_data)

        results.sort(key=lambda x: x['impact_factor'], reverse=True)

        return results[:top_k]
    
if __name__ == "__main__":
    calculator = CSOTopicImpactCalculator(
        csv_file_path = "Input/CSO.3.4.1.csv",
        specific_topics_file = "Output/specific_topics.txt"
    )

    print("\nExportation des topics spécifiques classés par facteur d'impact...")
    all_specific_ranked = calculator.rank_topics_by_impact(specific_topics_only = True, top_k = len(calculator.specific_topics))
    df_export = pd.DataFrame(all_specific_ranked)
    df_export.to_csv("Output/specific_topics_ranked.csv", index = False, encoding = 'utf-8')
    print("Export terminé : Output/specific_topics_ranked.csv")