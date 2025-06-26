import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TopResearchFieldsChart = ({ fieldsData, height }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4 text-gray-800">Top 10 Research Fields by Researchers</h3>
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={fieldsData}
        margin={{
          top: 5, right: 30, left: 20, bottom: 5,
        }}
      >
        <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={130} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="researchers" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default TopResearchFieldsChart;
