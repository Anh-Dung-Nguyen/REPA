import React from 'react';

const PaperRankingTable = ({data}) => {
    const sortedData = [...data].sort((a, b) => b.citationcount - a.citationcount).slice(0, 50);

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Top Papers by Citation Count</h3>
            <div className="overflow-x-auto">
            <table className="min-w-full bg-white border-collapse">
                <thead>
                <tr className="bg-gray-100 text-left text-gray-600 text-sm uppercase">
                    <th className="py-2 px-4 border-b">Rank</th>
                    <th className="py-2 px-4 border-b">Paper Title</th>
                    <th className="py-2 px-4 border-b">Citations</th>
                </tr>
                </thead>
                <tbody>
                {sortedData.map((item, index) => (
                    <tr key={item.corpusid} className="hover:bg-gray-50 text-gray-800 text-sm">
                    <td className="py-2 px-4 border-b">{index + 1}</td>
                    <td className="py-2 px-4 border-b">{item.title}</td>
                    <td className="py-2 px-4 border-b">{item.citationcount}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
    );
};

export default PaperRankingTable;