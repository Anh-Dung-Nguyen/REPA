import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { ZoomIn, ZoomOut, RotateCcw, Target, Loader } from "lucide-react";

const ResearcherOntologyTree = ({ topics = [], width = 1200, height = 800 }) => {
  const svgRef = useRef();
  const zoomRef = useRef();
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightPaths, setHighlightPaths] = useState([]);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    loading: false,
  });

  const tooltipTimeoutRef = useRef();
  const statsCache = useRef({});

  const cleanTopics = topics
    .map((topic) =>
      typeof topic === "string" ? topic.trim().toLowerCase() : ""
    )
    .filter((topic) => topic && topic !== "computer science");

  const fetchTopicStats = async (topicName) => {
    if (statsCache.current[topicName]) {
      return statsCache.current[topicName];
    }
    try {
      const response = await fetch(
        `http://localhost:8000/topics/topic_author_corpus_counts/${encodeURIComponent(
          topicName
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        statsCache.current[topicName] = data;
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching topic stats:", error);
      return null;
    }
  };

  const showTooltip = async (event, topicName) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);

    const rect = event.target.getBoundingClientRect();
    const svgRect = svgRef.current.getBoundingClientRect();

    setTooltip((prev) => ({
      ...prev,
      visible: true,
      x: rect.right - svgRect.left + 10,
      y: rect.top - svgRect.top,
      loading: true,
      data: null,
    }));

    const stats = await fetchTopicStats(topicName.toLowerCase());
    setTooltip((prev) => ({
      ...prev,
      data: stats,
      loading: false,
    }));
  };

  const hideTooltip = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip({
        visible: false,
        x: 0,
        y: 0,
        data: null,
        loading: false,
      });
    }, 200);
  };

  const cancelHideTooltip = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
  };

  const fetchAllPaths = async () => {
    if (!cleanTopics.length) {
      setError("No topics provided for this researcher");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pathPromises = cleanTopics.map(async (topic) => {
        try {
          const response = await fetch(
            `http://localhost:8000/topics/paths/${encodeURIComponent(topic)}`
          );
          if (response.ok) {
            const data = await response.json();
            return { topic, paths: data.paths || [] };
          }
          return { topic, paths: [] };
        } catch (error) {
          console.error(`Error fetching paths for ${topic}:`, error);
          return { topic, paths: [] };
        }
      });

      const results = await Promise.all(pathPromises);

      const allPaths = [];
      results.forEach((result) => {
        if (result.paths && result.paths.length > 0) {
          allPaths.push(...result.paths);
        }
      });

      if (allPaths.length === 0) {
        setError("No paths found for any of the researcher's topics");
        setLoading(false);
        return;
      }

      const tree = buildTreeFromPaths(allPaths);
      setTreeData(tree);
      setHighlightPaths(allPaths);
    } catch (error) {
      console.error("Error fetching paths:", error);
      setError("Failed to load topic paths");
    } finally {
      setLoading(false);
    }
  };

  const buildTreeFromPaths = (paths) => {
    const nodeMap = new Map();

    paths.forEach((path) => {
      path.forEach((nodeName) => {
        if (!nodeMap.has(nodeName.toLowerCase())) {
          nodeMap.set(nodeName.toLowerCase(), {
            name: nodeName,
            children: [],
          });
        }
      });
    });

    paths.forEach((path) => {
      for (let i = 0; i < path.length - 1; i++) {
        const parent = nodeMap.get(path[i].toLowerCase());
        const child = nodeMap.get(path[i + 1].toLowerCase());

        if (parent && child) {
          if (
            !parent.children.find(
              (c) => c.name.toLowerCase() === child.name.toLowerCase()
            )
          ) {
            parent.children.push(child);
          }
        }
      }
    });

    const rootName = paths.length > 0 ? paths[0][0] : "computer science";
    return nodeMap.get(rootName.toLowerCase());
  };

  useEffect(() => {
    fetchAllPaths();
  }, [topics]);

  useEffect(() => {
    if (!treeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const mainContainer = svg.attr("width", width).attr("height", height);

    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    mainContainer.call(zoom);
    zoomRef.current = zoom;

    const container = mainContainer.append("g").attr("class", "tree-container");

    const root = d3.hierarchy(treeData, (d) => d.children);

    const treeLayout = d3.tree().nodeSize([40, 250]);
    const treeData2 = treeLayout(root);

    const nodes = treeData2.descendants();
    const links = treeData2.links();

    container
      .selectAll("path.link")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", (d) => {
        return `M ${d.source.y} ${d.source.x}
                C ${(d.source.y + d.target.y) / 2} ${d.source.x},
                  ${(d.source.y + d.target.y) / 2} ${d.target.x},
                  ${d.target.y} ${d.target.x}`;
      })
      .style("fill", "none")
      .style("stroke", (d) => {
        const isHighlighted = highlightPaths.some((path) => {
          for (let i = 0; i < path.length - 1; i++) {
            if (
              path[i].toLowerCase() === d.source.data.name.toLowerCase() &&
              path[i + 1].toLowerCase() === d.target.data.name.toLowerCase()
            ) {
              return true;
            }
          }
          return false;
        });
        return isHighlighted ? "#FF9800" : "#ccc";
      })
      .style("stroke-width", "2px");

    const node = container
      .selectAll("g.node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    node
      .append("circle")
      .attr("r", 8)
      .style("fill", (d) => {
        const isResearcherTopic = cleanTopics.includes(
          d.data.name.toLowerCase()
        );
        return isResearcherTopic ? "#4CAF50" : "#fff";
      })
      .style("stroke", "#333")
      .style("stroke-width", "2px")
      .on("mouseenter", (event, d) => showTooltip(event, d.data.name))
      .on("mouseleave", hideTooltip);

    node
      .append("text")
      .attr("dy", ".35em")
      .attr("x", (d) => (d.children ? -13 : 13))
      .style("text-anchor", (d) => (d.children ? "end" : "start"))
      .text((d) => d.data.name)
      .style("font-size", "12px")
      .style("font-weight", "normal")
      .style("font-family", "Arial, sans-serif")
      .style("fill", "#333")
      .on("mouseenter", (event, d) => showTooltip(event, d.data.name))
      .on("mouseleave", hideTooltip);
  }, [treeData, highlightPaths, cleanTopics, width, height]);

  const centerTree = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;

    if (zoom && svg) {
      const centerTransform = d3.zoomIdentity.translate(width / 2, height / 2);
      svg.transition().duration(750).call(zoom.transform, centerTransform);
    }
  };

  const resetZoom = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;

    if (zoom && svg) {
      svg
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(100, height / 2));
    }
  };

  const zoomIn = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;

    if (zoom && svg) {
      svg.transition().duration(300).call(zoom.scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;

    if (zoom && svg) {
      svg.transition().duration(300).call(zoom.scaleBy, 0.67);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin mr-2" size={20} />
        <span>Loading researcher's topic ontology...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={fetchAllPaths}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cleanTopics.length) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          This researcher has no specific topics assigned
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <button
          onClick={centerTree}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          <Target size={16} />
          Center
        </button>
        <button
          onClick={resetZoom}
          className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        <button
          onClick={zoomIn}
          className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
        >
          <ZoomIn size={16} />
          Zoom In
        </button>
        <button
          onClick={zoomOut}
          className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          <ZoomOut size={16} />
          Zoom Out
        </button>

        <div className="ml-auto">
          <div className="text-sm font-medium text-gray-700">
            Showing paths to {cleanTopics.length} research topic
            {cleanTopics.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          className="border rounded-lg bg-white shadow-md cursor-grab active:cursor-grabbing"
          style={{ width: "100%", height: `${height}px` }}
        />

        {tooltip.visible && (
          <div
            className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-48 max-w-64"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              pointerEvents: "auto",
            }}
            onMouseEnter={cancelHideTooltip}
            onMouseLeave={hideTooltip}
          >
            {tooltip.loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-600">Loading...</span>
              </div>
            ) : tooltip.data ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-800 border-b pb-1">
                  {tooltip.data.topic}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Authors:</span>
                    <span className="font-medium text-blue-600">
                      {tooltip.data.count_author.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Papers:</span>
                    <span className="font-medium text-green-600">
                      {tooltip.data.count_paper.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-500 py-2">Failed to load data</div>
            )}
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 mt-4">
        <div className="mb-2">
          <strong>Researcher's Ontology:</strong> This tree shows only the
          paths from Computer Science to this researcher's specific topics.
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500 border border-gray-800"></div>
              <span className="text-xs">Researcher's Topics</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-800"></div>
              <span className="text-xs">Other Topics in Path</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-0.5 bg-orange-500"></div>
              <span className="text-xs">Path to Researcher Topic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearcherOntologyTree;
