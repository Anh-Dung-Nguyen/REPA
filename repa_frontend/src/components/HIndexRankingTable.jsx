import React from 'react';

const HIndexRankingTable = ({ data }) => {
  const sortedData = [...data].sort((a, b) => b.hindex - a.hindex).slice(0, 50);

  return (
    <div>
    <h3 className="text-xl font-semibold mb-4 text-gray-800">Top Researchers by H-Index</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600 text-sm uppercase">
            <th className="py-2 px-4 border-b">Rank</th>
            <th className="py-2 px-4 border-b">Researcher</th>
            <th className="py-2 px-4 border-b">H-Index</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((author, index) => (
            <tr key={author.authorid} className="hover:bg-gray-50 text-gray-800 text-sm">
              <td className="py-2 px-4 border-b">{index + 1}</td>
              <td className="py-2 px-4 border-b">{author.name}</td>
              <td className="py-2 px-4 border-b">{author.hindex}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default HIndexRankingTable;