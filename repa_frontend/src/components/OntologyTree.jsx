import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import SearchBarOntology from './SearchBarOntology';

const OntologyTree = ({ rootNode, width = 1200, height = 800, searchTarget, pathsToHighlight, searchTerm, setSearchTerm, onSearch }) => {
  const svgRef = useRef();
  const rootRef = useRef();
  const zoomRef = useRef();
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    loading: false
  });

  const tooltipTimeoutRef = useRef();

  const fetchTopicStats = async (topicName) => {
    try {
      const response = await fetch(`http://localhost:8000/topics/topic_author_corpus_counts/${encodeURIComponent(topicName)}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching topic stats:', error);
      return null;
    }
  };

  const showTooltip = async (event, topicName) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    const rect = event.target.getBoundingClientRect();
    const svgRect = svgRef.current.getBoundingClientRect();
    
    setTooltip({
      visible: true,
      x: rect.right - svgRect.left + 10,
      y: rect.top - svgRect.top,
      data: null,
      loading: true
    });

    const stats = await fetchTopicStats(topicName);
    
    setTooltip(prev => ({
      ...prev,
      data: stats,
      loading: false
    }));
  };

  const hideTooltip = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip({
        visible: false,
        x: 0,
        y: 0,
        data: null,
        loading: false
      });
    }, 150);
  };

  const cancelHideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  };

  const handleViewDetails = (topicName) => {
    window.location.href = `http://localhost:3000/research-fields/${encodeURIComponent(topicName)}`;
  };

  useEffect(() => {
    if (!rootNode) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const mainContainer = svg
      .attr('width', width)
      .attr('height', height);

    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    mainContainer.call(zoom);
    zoomRef.current = zoom;

    const container = mainContainer
      .append('g')
      .attr('class', 'tree-container');
    
    rootRef.current = d3.hierarchy(rootNode, d => d.children);
    rootRef.current.x0 = 0; 
    rootRef.current.y0 = 0;
    
    if (rootRef.current.children) {
      rootRef.current.children.forEach(collapse);
    }

    function collapse(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    const treeLayout = d3.tree().nodeSize([35, 300]);

    const update = (source) => {
      const treeData = treeLayout(rootRef.current);
      const nodes = treeData.descendants();
      const links = treeData.links();

      const node = container.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++i));

      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${source.y0},${source.x0})`)
        .style('cursor', 'pointer')
        .on('click', async (event, d) => {
          event.stopPropagation();
          
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else if (d._children) {
            d.children = d._children;
            d._children = null;
          } else {
            const topicName = d.data.name;
            try {
              const response = await fetch(`http://localhost:8000/topics/children/${encodeURIComponent(topicName)}`);
              if (response.ok) {
                const result = await response.json();
                
                if (result.children && result.children.length > 0) {
                  const newChildren = result.children.map(child => ({
                    name: child,
                    children: null,
                    _children: null,
                  }));

                  d.data.children = newChildren;
                  d.children = d3.hierarchy({ children: newChildren }, node => node.children).children;
                  
                  if (d.children) {
                    d.children.forEach(child => {
                      child.parent = d;
                      child.depth = d.depth + 1;
                      child.x0 = d.x0;
                      child.y0 = d.y0;
                    });
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching children:', error);
            }
          }
          
          update(d);

          if (source === rootRef.current && nodes.length > 0) {
            const rootNode = nodes[0];
            const centerX = width / 2 - rootNode.y;
            const centerY = height / 2 - rootNode.x;

            svg.transition()
              .duration(750)
              .call(zoomRef.current.transform, d3.zoomIdentity.translate(centerX, centerY));
          }
        });

      nodeEnter.append('circle')
        .attr('r', 1e-6)
        .style('fill', d => {
          const name = d.data.name.toLowerCase();
          const inHighlight = pathsToHighlight?.some(path =>
            path.map(p => p.toLowerCase()).includes(name)
          );

          return inHighlight ? '#FF9800' : d._children ? '#4CAF50' : d.children ? '#2196F3' : '#fff';
        })
        .style('stroke', '#333')
        .style('stroke-width', '2px')
        .on('mouseenter', function(event, d) {
          const cleanTopicName = d.data.name.replace(/\s*\[[\d,]+\]$/, '');
          showTooltip(event, cleanTopicName);
        })
        .on('mouseleave', hideTooltip);

      nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('x', d => d.children || d._children ? -13 : 13)
        .style('text-anchor', d => d.children || d._children ? 'end' : 'start')
        .text(d => {
          const name = d.data.name;
          const match = name.match(/\[(\d+(?:,\d+)*)\]$/);
          if (match) {
            return name.replace(/\s*\[[\d,]+\]$/, '') + ` [${match[1]}]`;
          }
          return name;
        })
        .style('font-size', '12px')
        .style('font-family', 'Arial, sans-serif')
        .style('fill', '#333')
        .on('mouseenter', function(event, d) {
          const cleanTopicName = d.data.name.replace(/\s*\[[\d,]+\]$/, '');
          showTooltip(event, cleanTopicName);
        })
        .on('mouseleave', hideTooltip);

      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate.transition()
        .duration(500)
        .attr('transform', d => `translate(${d.y},${d.x})`);

      nodeUpdate.select('circle')
        .attr('r', 8)
        .style('fill', d => d._children ? '#4CAF50' : d.children ? '#2196F3' : '#fff')
        .style('stroke', '#333')
        .style('stroke-width', '2px');

      nodeUpdate.select('text')
        .style('fill-opacity', 1);

      const nodeExit = node.exit().transition()
        .duration(500)
        .attr('transform', d => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select('circle')
        .attr('r', 1e-6);

      nodeExit.select('text')
        .style('fill-opacity', 1e-6);

      const link = container.selectAll('path.link')
        .data(links, d => d.target.id);

      const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('d', d => {
          const o = {x: source.x0, y: source.y0};
          return diagonal(o, o);
        })
        .style('fill', 'none')
        .style('stroke', '#ccc')
        .style('stroke-width', '2px');

      linkEnter.merge(link).transition()
        .duration(500)
        .attr('d', d => diagonal(d.source, d.target))
        .style('stroke', d => {
          const src = d.source.data.name.toLowerCase();
          const tgt = d.target.data.name.toLowerCase();
          const isHighlighted = pathsToHighlight?.some(path => {
            for (let i = 0; i < path.length - 1; i++) {
              if (path[i].toLowerCase() === src && path[i + 1].toLowerCase() === tgt) {
                return true;
              }
            }
            return false;
          });
          return isHighlighted ? '#FF9800' : '#ccc';
        });
      
      link.exit().transition()
        .duration(500)
        .attr('d', d => {
          const o = {x: source.x, y: source.y};
          return diagonal(o, o);
        })
        .remove();

      nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    function diagonal(s, d) {
      const path = `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                      ${(s.y + d.y) / 2} ${d.x},
                      ${d.y} ${d.x}`;
      return path;
    }

    let i = 0; 

    update(rootRef.current);

    setTimeout(() => {
      const rootNode = rootRef.current;
      const treeData = treeLayout(rootNode);
      const nodes = treeData.descendants();

      if (nodes.length > 0) {
        const root = nodes[0];
        const centerX = width / 2 - root.y;
        const centerY = height / 2 - root.x;

        svg.transition()
          .duration(750)
          .call(zoomRef.current.transform, d3.zoomIdentity.translate(centerX, centerY));
      }
    }, 0);

    if (!pathsToHighlight || pathsToHighlight.length === 0) return;

    const expandPath = async (path) => {
      let current = rootRef.current;
      
      for (let i = 1; i < path.length; i++) {
        const targetName = path[i];
        let child = (current.children || current._children || []).find(
          d => d.data.name.toLowerCase() === targetName.toLowerCase()
        );

        if (!child) {
          const res = await fetch(`http://localhost:8000/topics/children/${encodeURIComponent(current.data.name)}`);
          if (!res.ok) return;
          const result = await res.json();

          const newChildren = (result.children || []).map(name => ({
            name,
            children: null,
            _children: null,
          }));

          current.data.children = newChildren;

          current.children = d3.hierarchy({ children: newChildren }, d => d.children).children;
          current.children.forEach(child => {
            child.parent = current;
            child.depth = current.depth + 1;
            child.x0 = current.x0;
            child.y0 = current.y0;
          });

          child = current.children.find(
            d => d.data.name.toLowerCase() === targetName.toLowerCase()
          );
        }

        if (!child) return;

        current.children = current.children || [];
        child._children = null;

        current = child;
      }

      update(current);
    };

    pathsToHighlight.forEach(path => expandPath(path));

  }, [rootNode, width, height, searchTarget, pathsToHighlight]); 

  const centerTree = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    
    if (zoom && svg) {
      const centerTransform = d3.zoomIdentity
        .translate(width / 2, height / 2);
      
      svg.transition()
        .duration(750)
        .call(zoom.transform, centerTransform);
    }
  };

  const resetZoom = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    
    if (zoom && svg) {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(100, height / 2));
    }
  };

  const zoomIn = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    
    if (zoom && svg) {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 1.5);
    }
  };

  const zoomOut = () => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    
    if (zoom && svg) {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 0.67);
    }
  };

  return (
    <div className="w-full relative">
      <div className="mb-4 flex gap-2 flex-wrap">
        <button 
          onClick={centerTree}
          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          Center
        </button>
        <button 
          onClick={resetZoom}
          className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
        >
          Reset Zoom
        </button>
        <button 
          onClick={zoomIn}
          className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
        >
          Zoom In (+)
        </button>
        <button 
          onClick={zoomOut}
          className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          Zoom Out (-)
        </button>

        <div className='flex gap-2 items-center ml-auto'>
          <SearchBarOntology 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            onSearch={onSearch} 
          />
        </div>
      </div>
      
      <div className="relative">
        <svg 
          ref={svgRef} 
          className="border rounded-lg bg-white shadow-md p-6 mb-6 cursor-grab active:cursor-grabbing" 
          style={{ width: '100%', height: `${height}px` }}
        />
        
        {tooltip.visible && (
          <div 
            className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-48 max-w-64"
            style={{ 
              left: `${tooltip.x}px`, 
              top: `${tooltip.y}px`,
              pointerEvents: 'auto'
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
                    <span className="font-medium text-blue-600">{tooltip.data.count_author.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Papers:</span>
                    <span className="font-medium text-green-600">{tooltip.data.count_paper.toLocaleString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleViewDetails(tooltip.data.topic)}
                  className="w-full mt-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                >
                  View Details
                </button>
              </div>
            ) : (
              <div className="text-sm text-red-500 py-2">
                Failed to load data
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-600 mt-2">
        <div className="mb-2">
          <strong>Controls:</strong> Click and drag to pan • Mouse wheel to zoom • Click nodes to expand/collapse • Hover nodes for statistics
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span>Node Types:</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500 border border-gray-800"></div>
              <span className="text-xs">Has collapsed children</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500 border border-gray-800"></div>
              <span className="text-xs">Has expanded children</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-800"></div>
              <span className="text-xs">Leaf node</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OntologyTree;