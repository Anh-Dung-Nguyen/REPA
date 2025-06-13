import pandas as pd
import numpy as np
import urllib.parse
import re
import networkx as nx
from nltk.stem import WordNetLemmatizer
from collections import defaultdict, deque
import nltk

try:
    nltk.download('wordnet', quiet=True)
    nltk.download('omw-1.4', quiet=True)
except:
    pass

class CSOImpactCalculator:
    def __init__(self, csv_file_path, specific_topics_file):
        self.csv_file = csv_file_path
        self.specific_topics_file = specific_topics_file
        self.lemmatizer = WordNetLemmatizer()
        self.graph = nx.DiGraph()
        self.reverse_graph = defaultdict(list)
        self.equivalents = defaultdict(list)
        self.contributions = defaultdict(list)
        self.specific_topics = set()
        
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
            lemmatized = [self.lemmatizer.lemmatize(word, pos='n') for word in words]
            topics = " ".join(lemmatized)
            return topics
        return None
        
    def load_data(self):
        print("Chargement des données...")
        
        with open(self.specific_topics_file, 'r', encoding='utf-8') as f:
            self.specific_topics = set(line.strip() for line in f if line.strip())
        
        print(f"Topics spécifiques chargés: {len(self.specific_topics)}")
        
        df = pd.read_csv(self.csv_file, header=None)
        df.columns = ["super_topic_uri", "predicate", "sub_topic_uri"]
        
        print("Preprocessing des topics...")
        df["super_topic"] = df["super_topic_uri"].apply(self.extract_topic)
        df["sub_topic"] = df["sub_topic_uri"].apply(self.extract_topic)
        df = df.dropna(subset=["super_topic", "sub_topic"])
        
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
    
    # calcul la profondeur d'un sujet (topic)
    def calculate_depth(self, topic):
        if topic not in self.reverse_graph:
            return 1 
        
        visited = set()
        queue = deque([(topic, 0)])
        max_depth = 0
        
        while queue:
            current, depth = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            max_depth = max(max_depth, depth)
            
            for parent in self.reverse_graph.get(current, []):
                if parent not in visited:
                    queue.append((parent, depth + 1))
        
        return max_depth + 1
    
    # calcule une mesure d’influence d’un sujet (topic) en se basant sur l’influence de ses parents dans un graphe orienté.
    def get_parent_influence(self, topic):
        parents = self.reverse_graph.get(topic, [])
        if not parents:
            return 0.1
        
        max_influence = 0
        for parent in parents:
            try:
                descendants = len(nx.descendants(self.graph, parent))
                influence = np.log(descendants + 1)
                max_influence = max(max_influence, influence)  # Un seul parent très influent peut suffire à rendre un sujet pertinent -> évite que des petits parents diluent l’impact du grand
            except:
                influence = 0.1
                max_influence = max(max_influence, influence)
        
        return max_influence
    
    # calcule une densité sémantique d’un sujet donné (topic) en se basant sur 2 critères: équivalent et contribution
    def calculate_semantic_density(self, topic):
        equivalent_count = len(self.equivalents.get(topic, []))
        contribution_count = len(self.contributions.get(topic, []))
        
        return equivalent_count + 0.5 * contribution_count
    
    # calcule un facteur d'impact d'un sujet (topic) donné à partir de 3 indicateurs pondérés
    def calculate_impact_factor(self, topic):
        if topic not in self.specific_topics:
            return 0
        
        alpha, beta, gamma = 0.35, 0.40, 0.25
        
        depth = self.calculate_depth(topic)
        specialization_score = min(np.log(depth + 1) / np.log(20), 1.0) # Plus un topic est profond, plus il est spécialisé
                                                                        # On suppose que profondeur max typique = 20
        
        parent_influence = self.get_parent_influence(topic)
        #  15 est probablement une valeur empirique : basée sur l’observation que les influence log(descendants) atteignent rarement au-delà de 15 dans leur graphe.
        max_influence = 15
        influence_score = min(parent_influence / max_influence, 1.0) # Plus les parents ont d’impact ou ont beaucoup de descendants, plus le score monte.
        
        semantic_density = self.calculate_semantic_density(topic)
        # 10 est un seuil empirique raisonnable dans une ontologie comme CSO.
        max_density = 10 
        density_score = min(semantic_density / max_density, 1.0) # Plus un sujet a d’équivalents et de contributions, plus il est dense sémantiquement.
        
        fits_score = (alpha * specialization_score + 
                     beta * influence_score + 
                     gamma * density_score)
        
        return fits_score
    
    def calculate_all_impacts(self):
        results = {}
        total_topics = len(self.specific_topics)
        
        print(f"Calcul des facteurs d'impact pour {total_topics} topics...")
        
        for i, topic in enumerate(self.specific_topics):
            if i % 500 == 0:
                print(f"Progression: {i}/{total_topics}")
            
            results[topic] = self.calculate_impact_factor(topic)
        
        return results
    
    def analyze_results(self, results):
        scores = list(results.values())
        non_zero_scores = [s for s in scores if s > 0]
        
        print(f"\n=== ANALYSE DES RÉSULTATS ===")
        print(f"Topics traités: {len(results)}")
        print(f"Scores > 0: {len(non_zero_scores)}")
        print(f"Score moyen: {np.mean(scores):.4f}")
        print(f"Score médian: {np.median(scores):.4f}")
        print(f"Score max: {np.max(scores):.4f}")
        print(f"Score min: {np.min(scores):.4f}")
        print(f"Écart-type: {np.std(scores):.4f}")
        
        return {
            'mean': np.mean(scores),                 # valeur moyenne globale
            'median': np.median(scores),             # valeur centrale
            'max': np.max(scores),
            'min': np.min(scores),
            'std': np.std(scores),                   # mesure la variablité des score
            'non_zero_count': len(non_zero_scores)
        }
    
    def get_top_topics(self, results, n=50):
        filtered_results = {k: v for k, v in results.items() if v > 0}
        sorted_topics = sorted(filtered_results.items(), key=lambda x: x[1], reverse=True)
        return sorted_topics[:n]
    
    def export_results(self, results, output_file):
        df = pd.DataFrame(list(results.items()), columns=['Topic', 'Impact_Factor'])
        df = df.sort_values('Impact_Factor', ascending=False)
        df.to_csv(output_file, index=False, encoding='utf-8')
        print(f"Résultats exportés vers {output_file}")

if __name__ == "__main__":
    calculator = CSOImpactCalculator(
        csv_file_path="Input/CSO.3.4.1.csv",
        specific_topics_file="Output/specific_topics.txt"
    )
    
    calculator.load_data()
    
    impact_results = calculator.calculate_all_impacts()
    
    stats = calculator.analyze_results(impact_results)
    
    calculator.export_results(impact_results, "Output/cso_impact_factors.csv")