import pandas as pd
import numpy as np
import networkx as nx
from impact_un_topic import CSOImpactCalculator
from itertools import combinations

class MultiTopicImpactCalculator:
    def __init__(self, cso_calculator):
        self.cso_calc = cso_calculator
        self.graph = cso_calculator.graph
        self.reverse_graph = cso_calculator.reverse_graph
        self.equivalents = cso_calculator.equivalents
        self.contributions = cso_calculator.contributions

    def calculate_topic_overlap(self, topics):
        if len(topics) <= 1:
            return 0.0

        descendants_sets = []
        for topic in topics:
            if topic in self.graph:
                descendants = set(nx.descendants(self.graph, topic))
                descendants.add(topic)
                descendants_sets.append(descendants)
            else:
                descendants_sets.append({topic})

        intersection = set.intersection(*descendants_sets)
        union = set.union(*descendants_sets)

        return len(intersection) / len(union) if union else 0.0

    def calculate_semantic_coherence(self, topics):
        if len(topics) <= 1:
            return 1.0

        scores = []
        for t1, t2 in combinations(topics, 2):
            direct = 1.0 if (t1 in self.graph and t2 in self.graph.successors(t1)) or \
                             (t2 in self.graph and t1 in self.graph.successors(t2)) else 0.0

            equivalent = 1.0 if t2 in self.equivalents.get(t1, []) else 0.0

            contribution = 0.5 if t2 in self.contributions.get(t1, []) or \
                                   t1 in self.contributions.get(t2, []) else 0.0

            try:
                distance = nx.shortest_path_length(self.graph.to_undirected(), t1, t2)
                dist_score = 1.0 / (distance + 1)
            except:
                dist_score = 0.0

            scores.append(max(direct, equivalent, contribution, dist_score))

        return np.mean(scores) if scores else 0.0

    def calculate_coverage_breadth(self, topics):
        visited = set()
        for topic in topics:
            queue = [topic]
            while queue:
                current = queue.pop(0)
                if current in visited:
                    continue
                visited.add(current)
                queue.extend(self.reverse_graph.get(current, []))

        total_nodes = self.graph.number_of_nodes()
        return min(len(visited) / total_nodes, 1.0) if total_nodes else 0.0

    def calculate_multi_topic_impact(self, topics, weights=None):
        if not topics:
            return {'final_impact': 0.0}

        if weights is None:
            weights = {
                'individual_weight': 0.5,
                'overlap_penalty_weight': 0.2,
                'coherence_bonus_weight': 0.2,
                'coverage_bonus_weight': 0.1
            }

        impacts = [self.cso_calc.calculate_impact_factor(t) for t in topics]
        base = np.mean(impacts)

        overlap = self.calculate_topic_overlap(topics)
        coherence = self.calculate_semantic_coherence(topics)
        coverage = self.calculate_coverage_breadth(topics)

        final = (
            base * weights['individual_weight'] +
            coherence * weights['coherence_bonus_weight'] +
            coverage * weights['coverage_bonus_weight'] -
            overlap * weights['overlap_penalty_weight']
        )

        return {'final_impact': max(0.0, min(1.0, final))}

if __name__ == "__main__":
    calculator = CSOImpactCalculator(
        csv_file_path="Input/CSO.3.4.1.csv",
        specific_topics_file="Output/specific_topics.txt"
    )
    calculator.load_data()

    multi_calc = MultiTopicImpactCalculator(calculator)

    topics = ["ahp method", "analytic hierarchy", "index weight"]
    result = multi_calc.calculate_multi_topic_impact(topics)
    print(f"Impact final: {result['final_impact']:.4f}")