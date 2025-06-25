import React from "react";
import {Eye, BarChart3} from 'lucide-react';

const ResearcherCard = ({researcher, onViewDetails, onCompare}) => (
    <div className = "bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
        <div className = "flex items-start justify-between mb-4">
            <div className = "flex items-center gap-3">
                <div className = "w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {researcher.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                    <h3 className = "text-lg font-semibold text-gray-900">{researcher.name}</h3>
                    <p className = "text-sm text-gray-600 line-clamp-2">{researcher.specific_topic}</p>
                </div>
            </div>
        </div>

        <div className = "grid grid-cols-4 gap-4 mb-4">
            <div className = "text-center">
                <p className = "text-sm text-gray-600">H-Index</p>
                <p className = "text-lg font-bold text-blue-600">{researcher.hindex}</p>
            </div>
            <div className = "text-center">
                <p className = "text-sm text-gray-600">Paper count</p>
                <p className = "text-lg font-bold text-green-600">{researcher.papercount}</p>
            </div>
            <div className = "text-center">
                <p className = "text-sm text-gray-600">Citation count</p>
                <p className = "text-lg font-bold text-orange-600">{researcher.citationcount}</p>
            </div>
            <div className = "text-center">
                <p className = "text-sm text-gray-600">Co-authors</p>
                <p className = "text-lg font-bold text-purple-600">{researcher.unique_coauthors_count}</p>
            </div>
        </div>

        <p className = "text-sm text-gray-700 mb-4">
            <span className = "font-medium line-clamp-3">Recent work:</span> {researcher.latest_paper_title}
        </p>

        <div className = "flex gap-2 mt-auto pt-4">
            <button
                onClick = {() => onViewDetails(researcher)}
                className = "flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Eye className = "h-4 w-4"/>
                    View Details
            </button>
            <button
                onClick = {() => onCompare(researcher)}
                className = "flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <BarChart3 className = "h-4 w-4"/>
                    Compare
            </button>
        </div>
    </div>
);

export default ResearcherCard;