import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt

def plot_cso_graph(csv_path, max_nodes=50):
    df = pd.read_csv(csv_path)

    col_names = df.columns[:2]
    source_col, target_col = col_names[0], col_names[1]

    G = nx.DiGraph()
    edges = list(zip(df[source_col], df[target_col]))

    if max_nodes:
        edges = edges[:max_nodes]

    G.add_edges_from(edges)

    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(G, k=0.5)
    nx.draw(G, pos, with_labels=True, node_size=800, node_color="skyblue", 
            font_size=8, font_weight='bold', edge_color="gray", arrows=True)
    plt.title("CSO Class Hierarchy Graph")
    plt.show()

if __name__ == '__main__':
    plot_cso_graph("Input/CSO.3.4.1.csv", max_nodes = 100000)    