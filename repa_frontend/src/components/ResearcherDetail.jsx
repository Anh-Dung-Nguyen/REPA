import React from "react";
import { ChevronRight } from "lucide-react";

const ResearcherDetail = ({ researcher, researcherTitle, handleTitle, onClose }) => {
    return (
        <div className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className = "bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className = "p-6 border-b border-gray-200">
                    <div className = "flex items-center justify-between">
                        <h2 className = "text-2xl font-bold text-gray-900">{researcher.name}</h2>
                        <button
                            onClick = {onClose}
                            className = "text-gray-500 hover:text-gray-700 text-xl font-bold"
                        >
                            x
                        </button>
                    </div>
                    <p className = "text-gray-600 mt-1">{researcher.specific_topic}</p>
                </div>

                <div className = "p-6">
                    <div className = "grid grid-cols-1 gap-6">
                        <div>
                            <h3 className = "text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                            <div className = "space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">H-Index</span>
                                    <span className="text-blue-600 font-bold">{researcher.hindex}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Publications</span>
                                    <span className="text-green-600 font-bold">{researcher.papercount}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Citations</span>
                                    <span className="text-orange-600 font-bold">{researcher.citationcount}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Co-Authors</span>
                                    <span className="text-purple-600 font-bold">{researcher.unique_coauthors_count}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className = "p-6">
                    <div className = "grid grid-cols-1 gap-6">
                        <div>
                            <h3 className = "text-lg font-semibold text-gray-900 mb-4">Titles</h3>
                            <div className="space-y-4">
                            {Array.isArray(researcherTitle) && researcherTitle.length > 0 ? (
                                <div className="list-disc list-inside space-y-1">
                                    {researcherTitle.map((paper, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleTitle(paper)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex items-center justify-between shadow bg-gray-50 rounded-lg py-3 px-3 font-semibold hover:bg-blue-400">
                                            {paper.title}
                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                ) : (
                                <p>No titles available</p>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResearcherDetail;