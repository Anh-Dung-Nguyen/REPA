import React from "react";

const MetricCard = ({title, value, icon: Icon, color = "#000"}) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <Icon className="h-8 w-8" style={{ color }} />
    </div>
  </div>
);

export default MetricCard;