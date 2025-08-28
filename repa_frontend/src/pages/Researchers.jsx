import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopicFilter from '../components/TopicFilter';
import SearchBar from '../components/SearchBar';
import ResearcherCard from '../components/ResearcherCard';
import { X, Users } from 'lucide-react';

const Researchers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [filteredResults, setFilteredResults] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalAuthors, setTotalAuthors] = useState(0);
    const [selectedForComparison, setSelectedForComparison] = useState([]);
    const AUTHORS_PER_PAGE = 21;

    useEffect(() => {
        const fetchPaginatedAuthors = async () => {
            if (searchTerm || selectedTopic) return; 

            try {
                setLoading(true);
                const res = await axios.get('http://localhost:8000/authors', {
                    params: { page: currentPage, limit: AUTHORS_PER_PAGE }
                });
                setAuthors(res.data.authors);
                setTotalPages(res.data.totalPages);
                setTotalAuthors(res.data.total || res.data.authors.length);
            } catch (error) {
                console.error('Error fetching paginated authors:', error);
                setAuthors([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPaginatedAuthors();
    }, [currentPage, searchTerm, selectedTopic]);

    const handleCombinedFilter = useCallback(
        debounce(async () => {
            if (!searchTerm.trim() && !selectedTopic) {
                setFilteredResults([]);
                setCurrentPage(1);
                return;
            }
            
            setLoading(true);
            try {
                let results = [];

                if (searchTerm.trim() && !selectedTopic) {
                    console.log('Performing search only for:', searchTerm);
                    const searchResponse = await axios.get('http://localhost:8000/authors/search', {
                        params: { query: searchTerm }
                    });
                    results = searchResponse.data.authors || [];
                    console.log('Search results:', results.length);
                    setTotalPages(1);
                    setTotalAuthors(results.length);
                }
                
                else if (!searchTerm.trim() && selectedTopic) {
                    console.log('Performing topic filter only for:', selectedTopic, 'page:', currentPage);
                    const topicResponse = await axios.get(
                        `http://localhost:8000/author_topics/group_by_topic/${encodeURIComponent(selectedTopic)}`,
                        {
                            params: { 
                                page: currentPage, 
                                pageSize: AUTHORS_PER_PAGE 
                            }
                        }
                    );

                    const { authorIds, total } = topicResponse.data;
                    console.log('Topic filter authorIds:', authorIds?.length || 0, 'total:', total);
                    
                    if (authorIds && authorIds.length > 0) {
                        const calculatedTotalPages = Math.ceil(total / AUTHORS_PER_PAGE);
                        setTotalPages(calculatedTotalPages);
                        setTotalAuthors(total);

                        const authorDetailsPromises = authorIds.map(async (authorId) => {
                            try {
                                const authorResponse = await axios.get(`http://localhost:8000/authors/${authorId}`);
                                return authorResponse.data;
                            } catch (error) {
                                console.error(`Error fetching author ${authorId}:`, error);
                                return null;
                            }
                        });

                        const authorDetails = await Promise.all(authorDetailsPromises);
                        results = authorDetails.filter(author => author !== null);
                    } else {
                        setTotalPages(1);
                        setTotalAuthors(0);
                    }
                }
                
                else if (searchTerm.trim() && selectedTopic) {
                    console.log('Performing combined filter - search:', searchTerm, 'topic:', selectedTopic);
                    
                    const searchResponse = await axios.get('http://localhost:8000/authors/search', {
                        params: { query: searchTerm }
                    });
                    const searchResults = searchResponse.data.authors || [];
                    console.log('Search results count:', searchResults.length);

                    if (searchResults.length > 0) {
                        let allTopicAuthorIds = [];
                        let page = 1;
                        let hasMorePages = true;

                        while (hasMorePages) {
                            try {
                                const topicResponse = await axios.get(
                                    `http://localhost:8000/author_topics/group_by_topic/${encodeURIComponent(selectedTopic)}`,
                                    {
                                        params: { 
                                            page: page, 
                                            pageSize: 1000 
                                        }
                                    }
                                );

                                const { authorIds, total } = topicResponse.data;
                                
                                if (authorIds && authorIds.length > 0) {
                                    allTopicAuthorIds.push(...authorIds);
                                    
                                    if (allTopicAuthorIds.length >= total) {
                                        hasMorePages = false;
                                    } else {
                                        page++;
                                    }
                                } else {
                                    hasMorePages = false;
                                }
                            } catch (error) {
                                console.error('Error fetching topic page:', page, error);
                                hasMorePages = false;
                            }
                        }

                        console.log('Total topic authorIds fetched:', allTopicAuthorIds.length);
                        
                        if (allTopicAuthorIds.length > 0) {
                            const topicAuthorIdsSet = new Set(allTopicAuthorIds.map(id => String(id)));
                            
                            results = searchResults.filter(author => {
                                const authorIdStr = String(author.authorid);
                                const isMatch = topicAuthorIdsSet.has(authorIdStr);
                                if (isMatch) {
                                    console.log('Found match:', author.name, 'ID:', authorIdStr);
                                }
                                return isMatch;
                            });
                            
                            console.log('Combined filter results:', results.length);
                        } else {
                            console.log('No authors found for topic:', selectedTopic);
                            results = [];
                        }
                    } else {
                        console.log('No search results found for:', searchTerm);
                        results = [];
                    }

                    setTotalPages(1);
                    setTotalAuthors(results.length);
                }

                setFilteredResults(results);
                
            } catch (error) {
                console.error('Error in combined filter:', error);
                setFilteredResults([]);
                setTotalPages(1);
                setTotalAuthors(0);
            } finally {
                setLoading(false);
            }
        }, 500), [searchTerm, selectedTopic, currentPage]
    );

    useEffect(() => {
        handleCombinedFilter();
        return handleCombinedFilter.cancel;
    }, [searchTerm, selectedTopic, currentPage, handleCombinedFilter]);

    const handleViewDetails = (researcher) => {
        navigate(`/researchers/${researcher.authorid}`);
    };

    const handleCompare = (researcher) => {
        const isAlreadySelected = selectedForComparison.some(
            selected => selected.authorid === researcher.authorid
        );

        if (isAlreadySelected) {
            setSelectedForComparison(prev => 
                prev.filter(selected => selected.authorid !== researcher.authorid)
            );
        } else {
            if (selectedForComparison.length < 2) {
                setSelectedForComparison(prev => [...prev, researcher]);
            }
        }
    };

    const handleStartComparison = () => {
        if (selectedForComparison.length === 2) {
            const [researcher1, researcher2] = selectedForComparison;
            navigate(`/compare/${researcher1.authorid}/${researcher2.authorid}`);
        }
    };

    const handleClearComparison = () => {
        setSelectedForComparison([]);
    };

    const handleTopicSelect = (topic) => {
        setSelectedTopic(topic);
        setCurrentPage(1);
    };

    const handleTopicClear = () => {
        setSelectedTopic('');
        setCurrentPage(1);
    };

    const handleSearchClear = () => {
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const renderComparisonBar = () => {
        if (selectedForComparison.length === 0) return null;

        return (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[400px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users size={20} className="text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-800">
                                {selectedForComparison.length === 1 
                                    ? "Select another researcher to compare"
                                    : `Comparing ${selectedForComparison.length} researchers`
                                }
                            </p>
                            <p className="text-xs text-gray-600">
                                {selectedForComparison.map(r => r.name).join(" vs ")}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedForComparison.length === 2 && (
                            <button
                                onClick={handleStartComparison}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                                Compare
                            </button>
                        )}
                        <button
                            onClick={handleClearComparison}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderAuthors = (list) => (
        list.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {list.map(author => (
                    <ResearcherCard
                        key={author.authorid}
                        researcher={author}
                        onViewDetails={handleViewDetails}
                        onCompare={handleCompare}
                        isSelectedForComparison={selectedForComparison.some(
                            selected => selected.authorid === author.authorid
                        )}
                        canSelectForComparison={selectedForComparison.length < 2 || 
                            selectedForComparison.some(selected => selected.authorid === author.authorid)
                        }
                    />
                ))}
            </div>
        ) : (
            <div className="mt-10 text-center text-gray-500">
                {searchTerm || selectedTopic ? 'No researchers found matching your criteria.' : 'No researchers found.'}
            </div>
        )
    );

    const renderPagination = () => {
        if (searchTerm || totalPages <= 1) return null;
        
        return (
            <div className="flex justify-center items-center mt-8 space-x-4">
                <button
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    Previous
                </button>
                
                <div className="flex items-center space-x-2">
                    <span className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm">
                        Page {currentPage} of {totalPages}
                    </span>
                    {totalAuthors > 0 && (
                        <span className="text-sm text-gray-500">
                            ({totalAuthors} total researchers)
                        </span>
                    )}
                </div>
                
                <button
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    Next
                </button>
            </div>
        );
    };

    const renderActiveFilters = () => {
        if (!searchTerm && !selectedTopic) return null;

        return (
            <div className="flex flex-wrap gap-2 mt-4 mb-2">
                {searchTerm && (
                    <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        <span>Search: "{searchTerm}"</span>
                        <button
                            onClick={handleSearchClear}
                            className="ml-2 hover:text-blue-600"
                        >
                            ×
                        </button>
                    </div>
                )}
                {selectedTopic && (
                    <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        <span>Topic: {selectedTopic}</span>
                        <button
                            onClick={handleTopicClear}
                            className="ml-2 hover:text-green-600"
                        >
                            ×
                        </button>
                    </div>
                )}
                {searchTerm && selectedTopic && (
                    <div className="text-sm text-gray-600 px-3 py-1">
                        Showing researchers named "{searchTerm}" who work on "{selectedTopic}"
                    </div>
                )}
            </div>
        );
    };

    const isFiltered = searchTerm || selectedTopic;
    const displayedAuthors = isFiltered ? filteredResults : authors;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSearch={handleCombinedFilter}
                placeholder="Search by researcher name or author ID..."
            />

            <TopicFilter
                selectedTopic={selectedTopic}
                onTopicSelect={handleTopicSelect}
                onTopicClear={handleTopicClear}
            />

            {renderActiveFilters()}

            {loading ? (
                <div className="flex justify-center mt-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {renderAuthors(displayedAuthors)}
                    {renderPagination()}
                </>
            )}

            {renderComparisonBar()}
        </div>
    );
};

export default Researchers;