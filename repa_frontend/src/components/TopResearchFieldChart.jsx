import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TopResearchFieldsChart = ({ fieldsData }) => {
  return (
    <div className = "bg-white rounded-lg shadow-md p-6">
      <h3 className = "text-lg font-semibold text-gray-900 mb-4">Top Research Fields</h3>
      <ResponsiveContainer width = "100%" height = {300}>
        <BarChart data = {fieldsData}>
          <CartesianGrid strokeDasharray = "3 3" />
          <XAxis dataKey = "name" angle = {0} textAnchor = "middle" height = {20} interval = {0} />
          <YAxis />
          <Tooltip />
          <Bar dataKey = "researchers" fill = "#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopResearchFieldsChart;
