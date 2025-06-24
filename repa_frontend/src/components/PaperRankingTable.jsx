import React from 'react';

const PaperRankingTable = ({data}) => {
    const sortedData = [...data].sort((a, b) => b.citationcount - a.citationcount).slice(0, 50);

    return (
        <div className = 'bg-white rounded-lg shadow-md p-6 overflow-x-auto'>
            <h3 className = 'text-lg font-semibold text-gray-900 mb-4'>Top Cited Papers</h3>
            <table className = 'min-w-full divide-y divide-gray-200 text-sm text-left'>
                <thead className = 'bg-gray-50'>
                    <tr>
                        <th className = 'px-4 py-2 text-gray-600'>Rank</th>
                        <th className = 'px-4 py-2 text-gray-600'>Corpus ID</th>
                        <th className = 'px-4 py-2 text-gray-600'>Title</th>
                        <th className = 'px-4 py-2 text-gray-600'>Citation count</th>
                    </tr>
                </thead>
                <tbody className = 'divide-y divide-gray-100'>
                    {sortedData.map((paper, index) => (
                        <tr key = {paper.corpusid}>
                            <td className = 'px-4 py-2'>{index + 1}</td>
                            <td className = 'px-4 py-2'>{paper.corpusid}</td>
                            <td className = 'px-4 py-2'>{paper.title}</td>
                            <td className = 'px-4 py-2'>{paper.citationcount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PaperRankingTable;