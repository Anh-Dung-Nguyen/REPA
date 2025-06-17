from impact_un_topic import CSOTopicImpactCalculator
import numpy as np
import networkx as nx

class TopicGroupImpactCalculator:
    def __init__(self, csocalculator):
        self.cso = csocalculator
        self.alpha = self.cso.alpha
        self.beta = self.cso.beta
        self.gamma = self.cso.gamma

    def compute_internal_cohesion(self, topics):
        n = len(topics)

        if n < 2:
            return 0.0

        total_similarity = 0.0
        count = 0

        for i in range(n):
            for j in range(i + 1, n):
                t1, t2 = topics[i], topics[j]
                if t1 in self.cso.graph.nodes() and t2 in self.cso.graph.nodes():
                    sim = self.cso.calculate_lin_similarity(t1, t2)
                    total_similarity += sim
                    count += 1

        return total_similarity / count if count > 0 else 0.0

    def compute_group_impact(self, topics):
        valid_topics = [t for t in topics if t in self.cso.graph.nodes()]
        n = len(valid_topics)
        m = self.cso.graph.number_of_nodes()
        
        if n == 0:
            return {'error': 'Aucun topic valide dans le groupe.'}
        
        if n == 1:
            topic = valid_topics[0]
            reference_topics = list(self.cso.specific_topics.intersection(set(self.cso.graph.nodes())))[:m]
            impact = self.cso.calculate_impact_factor(topic, reference_topics)
            return impact

        depths = [self.cso.calculate_depth(t) for t in valid_topics]
        max_depth = max(self.cso.depth_cache.values()) if self.cso.depth_cache else 1
        mean_depth_score = np.mean([d / max_depth for d in depths]) if max_depth > 0 else 0

        influences = [self.cso.calculate_influence_score(t) for t in valid_topics]
        max_infl = max(self.cso.influence_cache.values()) if self.cso.influence_cache else 1
        mean_influence_score = np.mean([i / max_infl for i in influences]) if max_infl > 0 else 0

        cohesion_score = self.compute_internal_cohesion(valid_topics)

        impact_factor = (
            self.alpha * mean_depth_score +
            self.beta * mean_influence_score +
            self.gamma * cohesion_score
        )

        return {
            'group_topics': valid_topics,
            'depth_score': mean_depth_score,
            'influence_score': mean_influence_score,
            'semantic_cohesion': cohesion_score,
            'impact_factor': impact_factor
        }

if __name__ == "__main__":
    calculator = CSOTopicImpactCalculator(
        csv_file_path = "Input/CSO.3.4.1.csv",
        specific_topics_file = "Output/specific_topics.txt"
    )

    group_calculator = TopicGroupImpactCalculator(calculator)

    topics = ["chromosome translocation 18"]
    result = group_calculator.compute_group_impact(topics)
    
    print("\nRésultat du facteur d'impact du groupe :")
    for key, value in result.items():
        print(f"{key}: {value}")