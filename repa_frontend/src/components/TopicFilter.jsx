import React, { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';

const TopicFilter = ({ selectedTopic, onTopicSelect, onTopicClear }) => {
    const [topicInput, setTopicInput] = useState('');

    const handleTopicSubmit = (e) => {
        e.preventDefault();
        const topic = topicInput.trim();
        if (topic) {
            onTopicSelect(topic);
            setTopicInput('');
        }
    };

    const handleTopicClear = () => {
        onTopicClear();
        setTopicInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTopicSubmit(e);
        }
    };

    const commonTopics = [
        'machine learning',
        'deep learning',
        'artificial intelligence',
        'computer vision',
        'natural language processing',
        'neural networks',
        'data mining',
        'algorithms'
    ];

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter by Topic:</span>
                </div>
                
                <div className="flex-1">
                    <form onSubmit={handleTopicSubmit} className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Enter topic name (e.g., 'deep learning', 'machine learning')..."
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!topicInput.trim()}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                topicInput.trim()
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Search className="h-4 w-4" />
                            Search
                        </button>
                    </form>
                </div>

                {selectedTopic && (
                    <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                        <span className="text-sm text-blue-800">{selectedTopic}</span>
                        <button
                            onClick={handleTopicClear}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {!selectedTopic && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Popular topics:</p>
                    <div className="flex flex-wrap gap-2">
                        {commonTopics.map((topic) => (
                            <button
                                key={topic}
                                onClick={() => onTopicSelect(topic)}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicFilter;