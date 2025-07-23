import React, { useState, useEffect } from 'react';
import OntologyTree from '../components/OntologyTree';

const ResearchAllFields = () => {
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/topics/children/computer science')
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
        console.error("Error loading root topic:", err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">Ontology Graph Viewer</h1>
      {treeData && <OntologyTree rootNode={treeData} width={1200} height={900} />}
    </div>
  );
};

export default ResearchAllFields;
