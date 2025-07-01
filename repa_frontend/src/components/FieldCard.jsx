import React from "react";
import { ChevronRight } from "lucide-react";

const FieldCard = ({ field, onViewResearchers }) => (
  <div
    onClick={() => onViewResearchers(field)}
    className="bg-white rounded-2xl border border-gray-100 shadow hover:shadow-lg transition cursor-pointer p-5 flex flex-col gap-4"
  >
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900">{field.topic}</h3>
      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </div>

    <div className="grid grid-cols-3 gap-4 mt-2">
      <Stat label="Researchers" value={field.count_author} color="text-blue-600" />
      <Stat label="Papers" value={field.count_paper} color="text-green-600" />
      <Stat label="Avg H-Index" value={field.avg_hindex} color="text-purple-600" />
    </div>
  </div>
);

const Stat = ({ label, value, color }) => (
  <div className="text-center">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg font-semibold ${color}`}>{value}</p>
  </div>
);

export default FieldCard;