import React, { useState, useEffect, useCallback } from 'react';
import { Filter, X } from 'lucide-react';
import debounce from 'lodash.debounce';
import axios from 'axios';

const TopicFilter = ({ selectedTopic, onTopicSelect, onTopicClear }) => {
    const [topicSearch, setTopicSearch] = useState('');
    const [topics, setTopics] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    const debouncedTopicSearch = useCallback(
        debounce(async (searchTerm) => {
            if (!searchTerm.trim()) {
                setTopics([]);
                return;
            }
            
            setLoading(true);
            try {
                const response = await axios.get('http://localhost:8000/all_topic', {
                    params: { search: searchTerm, limit: 20 }
                });
                setTopics(response.data.topics || []);
            } catch (error) {
                console.error('Error fetching topics:', error);
                setTopics([]);
            } finally {
                setLoading(false);
            }
        }, 300), []
    );

    useEffect(() => {
        if (topicSearch) {
            debouncedTopicSearch(topicSearch);
            setShowDropdown(true);
        } else {
            setTopics([]);
            setShowDropdown(false);
        }
        
        return debouncedTopicSearch.cancel;
    }, [topicSearch, debouncedTopicSearch]);

    const handleTopicSelect = (topic) => {
        onTopicSelect(topic);
        setTopicSearch('');
        setShowDropdown(false);
    };

    const handleTopicClear = () => {
        onTopicClear();
        setTopicSearch('');
        setShowDropdown(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter by Topic:</span>
                </div>
                
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search topics..."
                        value={topicSearch}
                        onChange={(e) => setTopicSearch(e.target.value)}
                        onFocus={() => topicSearch && setShowDropdown(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    
                    {showDropdown && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                            {loading ? (
                                <div className="p-3 text-center text-gray-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                                </div>
                            ) : topics.length > 0 ? (
                                topics.map((topic, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleTopicSelect(topic)}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                                    >
                                        {topic}
                                    </button>
                                ))
                            ) : topicSearch ? (
                                <div className="p-3 text-center text-gray-500 text-sm">No topics found</div>
                            ) : null}
                        </div>
                    )}
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
        </div>
    );
};

export default TopicFilter;
