// src/pages/ResearchAllFields.jsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import OntologyGraph from '../components/OntologyGraph';

const ResearchAllFields = () => {
  const [csvData, setCsvData] = useState([]);

  useEffect(() => {
    // Load CSV from public folder
    fetch('/CSO.3.4.1.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load CSV file.');
        }
        return response.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            const triples = results.data.map(row => ({
              subject: row[0],
              predicate: row[1],
              object: row[2]
            }));
            setCsvData(triples);
          }
        });
      })
      .catch(err => {
        console.error('Error loading CSV:', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">Ontology Graph Viewer</h1>
      <OntologyGraph data={csvData} width={1000} height={700} />
    </div>
  );
};

export default ResearchAllFields;
