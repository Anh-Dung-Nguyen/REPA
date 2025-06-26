import React from "react";

const MetricCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4">
    <div className={`p-3 rounded-full`} style={{ backgroundColor: color, opacity: 0.8 }}>
      {Icon && <Icon size={24} color="white" />}
    </div>
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default MetricCard;