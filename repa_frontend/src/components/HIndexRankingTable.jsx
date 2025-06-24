import React from 'react';

const HIndexRankingTable = ({ data }) => {
  const sortedData = [...data].sort((a, b) => b.hindex - a.hindex).slice(0, 50);

  return (
    <div className = "bg-white rounded-lg shadow-md p-6 overflow-x-auto">
      <h3 className = "text-lg font-semibold text-gray-900 mb-4">Author H-Index Ranking</h3>
      <table className = "min-w-full divide-y divide-gray-200 text-sm text-left">
        <thead className = "bg-gray-50">
          <tr>
            <th className = "px-4 py-2 text-gray-600">Rank</th>
            <th className = "px-4 py-2 text-gray-600">Name</th>
            <th className = "px-4 py-2 text-gray-600">H-Index</th>
          </tr>
        </thead>
        <tbody className = "divide-y divide-gray-100">
          {sortedData.map((author, index) => (
            <tr key = {author.name}>
              <td className = "px-4 py-2">{index + 1}</td>
              <td className = "px-4 py-2">{author.name}</td>
              <td className = "px-4 py-2">{author.hindex}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HIndexRankingTable;