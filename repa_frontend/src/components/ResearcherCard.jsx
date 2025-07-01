import React from "react";
import { Eye, BarChart3 } from "lucide-react";

const ResearcherCard = ({ researcher, onViewDetails, onCompare }) => (
    <div className="bg-white rounded-2xl shadow hover:shadow-xl transition-shadow p-6 flex flex-col h-full border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xl shadow-inner">
                    {researcher.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                </div>
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{researcher.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{researcher.specific_topic}</p>
            </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Stat label="H-Index" value={researcher.hindex} color="text-blue-600" />
            <Stat label="Papers" value={researcher.papercount} color="text-green-600" />
            <Stat label="Citations" value={researcher.citationcount} color="text-purple-600" />
            <Stat label="Co-authors" value={researcher.unique_coauthors_count} color="text-yellow-600" />
        </div>

        <p className="text-sm text-gray-700 mb-4 line-clamp-3">
            <span className="font-medium">Recent work: </span>
            {researcher.latest_paper_title}
        </p>

        <div className="mt-auto flex gap-3 pt-2">
            <button
                onClick={() => onViewDetails(researcher)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors shadow-sm"
            >
                <Eye className="h-4 w-4" />
                View Details
            </button>
            <button
                onClick={() => onCompare(researcher)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-xl transition-colors shadow-sm"
            >
                <BarChart3 className="h-4 w-4" />
                Compare
            </button>
        </div>
    </div>
);

const Stat = ({ label, value, color }) => (
    <div className="text-center">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
);

export default ResearcherCard;