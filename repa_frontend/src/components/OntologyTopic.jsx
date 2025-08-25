import React from 'react';
import ResearcherOntologyTree from './ResearcherOntologyTree';

const OntologyTopic = ({ topics = [] }) => {
  const validTopics = topics
    .filter(topic => topic && topic.trim())
    .map(topic => typeof topic === 'string' ? topic.trim() : String(topic).trim());

  console.log('OntologyTopic received topics:', validTopics);

  if (!validTopics || validTopics.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No topics available for this researcher</div>
        <p className="text-sm text-gray-400">
          The researcher needs to have specific topics assigned to display the ontology tree.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Research Topics Ontology
        </h3>
        <p className="text-sm text-gray-600">
          This visualization shows the hierarchical relationship from Computer Science to each of the researcher's specific topics.
          Only the relevant paths are displayed, filtering out unrelated branches.
        </p>
      </div>
      
      <ResearcherOntologyTree 
        topics={validTopics}
        width={1200}
        height={700}
      />
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Understanding the Ontology</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Green Nodes:</strong> The researcher's specific topics (highlighted with bold border)</li>
          <li>• <strong>White Nodes:</strong> Other topics in the path (Computer Science root and intermediate topics)</li>
          <li>• <strong>Orange Links:</strong> The direct paths from Computer Science to each research topic</li>
        </ul>
      </div>
    </div>
  );
};

export default OntologyTopic;