// src/components/OntologyGraph.jsx
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const OntologyGraph = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef();
  const [visibleNodes, setVisibleNodes] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Parse triples and build graph
    const nodesMap = new Map();
    const links = [];

    data.forEach(row => {
      const subject = row.subject?.replace(/[<>]/g, '') || '';
      const predicate = row.predicate?.replace(/[<>]/g, '') || '';
      const object = row.object?.replace(/[<>]/g, '') || '';

      const getLabel = url => {
        const last = url.split('/').pop();
        return decodeURIComponent(last).replace(/_/g, ' ');
      };

      const subjectId = getLabel(subject);
      const objectId = getLabel(object);
      const relationship = predicate.split('#')[1] || 'related';

      if (!nodesMap.has(subjectId)) {
        nodesMap.set(subjectId, { id: subjectId });
      }
      if (!nodesMap.has(objectId)) {
        nodesMap.set(objectId, { id: objectId });
      }

      links.push({ source: subjectId, target: objectId, relationship });
    });

    // Find root(s) – nodes that never appear as object
    const allSubjects = new Set(links.map(d => d.source));
    const allObjects = new Set(links.map(d => d.target));
    const rootNodes = [...allSubjects].filter(x => !allObjects.has(x));

    const graph = {
      nodes: Array.from(nodesMap.values()),
      links
    };

    const getChildren = (parentId) =>
      links.filter(l => l.source === parentId).map(l => l.target);

    // Manage expanded nodes
    const updateVisibility = () => {
      const queue = [...rootNodes];
      const seen = new Set(queue);

      while (queue.length) {
        const current = queue.shift();
        if (expandedNodes.has(current)) {
          const children = getChildren(current);
          for (const child of children) {
            if (!seen.has(child)) {
              seen.add(child);
              queue.push(child);
            }
          }
        }
      }

      setVisibleNodes(seen);
    };

    updateVisibility();

    // Build graph from visible nodes/links
    const visibleLinks = links.filter(d => visibleNodes.has(d.source) && visibleNodes.has(d.target));
    const visibleNodesArr = graph.nodes.filter(n => visibleNodes.has(n.id));

    const simulation = d3.forceSimulation(visibleNodesArr)
      .force('link', d3.forceLink(visibleLinks).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const zoom = d3.zoom().scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    svg.call(zoom);

    const container = svg.append('g');

    // Draw links
    container.selectAll('line')
      .data(visibleLinks)
      .enter()
      .append('line')
      .attr('stroke', d => {
        if (d.relationship === 'superTopicOf') return '#ff6b6b';
        if (d.relationship === 'contributesTo') return '#4ecdc4';
        return '#45b7d1';
      })
      .attr('stroke-width', 2);

    // Draw nodes
    const nodeGroup = container.selectAll('g.node')
      .data(visibleNodesArr)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    nodeGroup.append('circle')
      .attr('r', 20)
      .attr('fill', '#70a1ff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (_, d) => {
        const isExpanded = expandedNodes.has(d.id);
        const next = new Set(expandedNodes);
        isExpanded ? next.delete(d.id) : next.add(d.id);
        setExpandedNodes(next);
      })
      .append('title')
      .text(d => d.id);

    nodeGroup.append('text')
      .text(d => d.id.length > 20 ? d.id.slice(0, 20) + '...' : d.id)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('dy', 35);

    simulation.on('tick', () => {
      container.selectAll('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();

  }, [data, expandedNodes, visibleNodes]);

  return (
    <div className="ontology-graph">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg"
        style={{ background: '#fefefe' }}
      />
      <div className="text-xs text-gray-600 mt-2">
        Click nodes to expand/collapse children. Drag and zoom to explore.
      </div>
    </div>
  );
};

export default OntologyGraph;
