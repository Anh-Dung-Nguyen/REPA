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

    try {
      const res = await fetch(
        `http://localhost:8000/topics/paths/${encodeURIComponent(searchTerm)}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          alert(`No paths found for "${searchTerm}".`);
        } else {
          alert(`Error: ${res.status} ${res.statusText}`);
        }
        return;
      }

      const json = await res.json();

      if (!json.paths || json.paths.length === 0) {
        alert(`No paths found for "${searchTerm}".`);
        return;
      }

      const newPaths = json.paths;
      const newRootName = newPaths[0][0];

      if (selectedRoot.toLowerCase() !== newRootName.toLowerCase()) {
        setSelectedRoot(newRootName);
      }

      setHighlightPaths(newPaths);
      setSearchTarget(searchTerm);

    } catch (err) {
      console.error("Error fetching paths:", err);
      alert("Something went wrong while searching. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-semibold mb-4 text-center text-gray-800">Ontology Graph Viewer</h1>

      <div className="mb-6 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          {rootTopics.map((topic, index) => (
            <button
              key={index}
              onClick={() => setSelectedRoot(topic)}
              className={`px-2 py-1 rounded-lg border transition ${
                selectedRoot.toLowerCase() === topic.toLowerCase()
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              {topic.charAt(0).toUpperCase() + topic.slice(1)}
            </button>
          ))}
        </div>
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
