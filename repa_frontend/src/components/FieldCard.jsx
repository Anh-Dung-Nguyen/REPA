import React from "react";
import {ChevronRight} from 'lucide-react';

const FieldCard = ({ field, onViewResearchers }) => (
    <div 
        className = "bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer" 
        onClick={() => onViewResearchers(field)}
    >
    <div className = "flex items-center justify-between mb-4">
      <h3 className = "text-lg font-semibold text-gray-900">{field.name}</h3>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </div>
    <div className = "grid grid-cols-2 gap-4">
      <div>
        <p className = "text-sm text-gray-600">Researchers</p>
        <p className = "text-xl font-bold text-blue-600">{field.researchers}</p>
      </div>
      <div>
        <p className = "text-sm text-gray-600">Avg H-Index</p>
        <p className = "text-xl font-bold text-green-600">{field.avgHIndex}</p>
      </div>
    </div>
  </div>
);

export default FieldCard;