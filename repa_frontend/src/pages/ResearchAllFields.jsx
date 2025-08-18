import React, { useState, useEffect } from 'react';
import OntologyTree from '../components/OntologyTree';

const ResearchAllFields = () => {
  const [treeData, setTreeData] = useState(null);
  const [rootTopics, setRootTopics] = useState([]);
  const [selectedRoot, setSelectedRoot] = useState('computer science');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightPaths, setHighlightPaths] = useState([]);
  const [searchTarget, setSearchTarget] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/topics/root')
      .then(res => res.json())
      .then(data => {
        setRootTopics(data.roots);
      })
      .catch(err => {
        console.error("Error fetching root topics:", err);
      });
  }, []);

  useEffect(() => {
    if (!selectedRoot) return;

    fetch(`http://localhost:8000/topics/children/${encodeURIComponent(selectedRoot.toLowerCase())}`)
      .then(res => res.json())
      .then(data => {
        const root = {
          name: data.topic,
          children: data.children.map(child => ({
            name: child,
            children: null,
            _children: null
          }))
        };

        setTreeData(root);
      })
      .catch(err => {
        console.error("Error loading topic tree:", err);
      });
  }, [selectedRoot]);

  const handleSearch = async () => {
    if (!searchTerm) return;

    const res = await fetch(`http://localhost:8000/topics/paths/${encodeURIComponent(searchTerm)}`);
    const json = await res.json();
    if (json.paths && json.paths.length > 0) {
      const newPaths = json.paths;
      const newRootName = newPaths[0][0];

      if (selectedRoot.toLowerCase() !== newRootName.toLowerCase()) {
        setSelectedRoot(newRootName);
      }

      setHighlightPaths(newPaths);
      setSearchTarget(searchTerm);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">Ontology Graph Viewer</h1>

      <div className="mb-6 text-center">
        <label htmlFor="rootSelector" className="mr-2">Select Root Topic:</label>
        <select
          id="rootSelector"
          className="p-2 border border-gray-300 rounded"
          value={selectedRoot}
          onChange={e => setSelectedRoot(e.target.value)}
        >
          {rootTopics.map((topic, index) => (
            <option key={index} value={topic}>
              {topic.charAt(0).toUpperCase() + topic.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {treeData && (
        <OntologyTree
          rootNode={treeData}
          width={1200}
          height={900}
          searchTarget={searchTarget}
          pathsToHighlight={highlightPaths}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={handleSearch}
        />
      )}
    </div>
  );
};

export default ResearchAllFields;
