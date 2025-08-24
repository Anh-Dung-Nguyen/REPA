/**
 * 
 * @param {Object} node
 * @param {Set<string>} authorTopics
 * @returns {Object|null}
 */
export function filterOntologyTree(node, authorTopics) {
  const nodeName = node.name.toLowerCase();

  const isAuthorTopic = authorTopics.has(nodeName);

  if (node.children && node.children.length > 0) {
    const filteredChildren = node.children
      .map(child => filterOntologyTree(child, authorTopics))
      .filter(Boolean);

    if (filteredChildren.length > 0 || isAuthorTopic) {
      return { ...node, children: filteredChildren };
    }
  }

  return isAuthorTopic ? { ...node, children: [] } : null;
}
