import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HIndexComparisonChart = ({ data, researchers }) => {
  return (
    <div className = "bg-white rounded-lg shadow-md p-6">
      <h3 className = "text-lg font-semibold text-gray-900 mb-4">H-Index Comparison Over Time</h3>
      <ResponsiveContainer width = "100%" height = {300}>
        <LineChart data = {data}>
          <CartesianGrid strokeDasharray = "3 3" />
          <XAxis dataKey = "year" />
          <YAxis />
          <Tooltip />
          <Legend />
          {researchers.map((r, index) => (
            <Line
              key = {r.id}
              type = "monotone"
              dataKey = {r.dataKey}
              stroke = {r.color}
              strokeWidth = {2}
              name = {r.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HIndexComparisonChart;