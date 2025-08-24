// components/OntologyTopic.jsx
import React, { useEffect, useState } from "react";
import OntologyTree from "./OntologyTree";
import { filterOntologyTree } from "../utils/filterOntologyTree";

const OntologyTopic = ({ topics }) => {
  const [rootNode, setRootNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!topics || topics.length === 0) {
        setRootNode(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // convert topics list to lowercase set
        const authorTopics = new Set(topics.map(t => t.toLowerCase()));

        // fetch ontology children of "computer science"
        const rootRes = await fetch(
          `http://localhost:8000/topics/children/computer%20science`
        );
        const ontology = await rootRes.json();

        // filter ontology down to author topics
        const pruned = filterOntologyTree(
          { name: "computer science", children: ontology.children || [] },
          authorTopics
        );

        setRootNode(pruned);
      } catch (e) {
        console.error("Failed to fetch ontology:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [topics]);

  if (loading) {
    return <div className="p-6 text-center">Loading ontology…</div>;
  }

  if (!rootNode) {
    return <div className="p-6 text-center">No ontology available for this author.</div>;
  }

  return <OntologyTree rootNode={rootNode} width={1200} height={800} />;
};

export default OntologyTopic;
