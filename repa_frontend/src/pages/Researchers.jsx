import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopicFilter from '../components/TopicFilter';
import SearchBar from '../components/SearchBar';
import ResearcherCard from '../components/ResearcherCard';

const Researchers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
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
            } catch (error) {
                console.error('Error fetching paginated authors:', error);
                setAuthors([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPaginatedAuthors();
    }, [currentPage, searchTerm, selectedTopic]);

    const handleSearch = useCallback(
        debounce(async () => {
            if (!searchTerm.trim()) {
                setSearchResults([]);
                setCurrentPage(1);
                return;
            }
            
            setLoading(true);
            try {
                const response = await axios.get('http://localhost:8000/authors/search', {
                    params: { query: searchTerm }
                });
                setSearchResults(response.data.authors || []);
            } catch (error) {
                console.error('Error searching authors:', error);
                setSearchResults([]);
            } finally {
                setLoading(false);
            }
        }, 500), [searchTerm]
    );

    const handleTopicFilter = useCallback(
        debounce(async (topic) => {
            if (!topic) {
                setSearchResults([]);
                setCurrentPage(1);
                return;
            }
            
            setLoading(true);
            try {
                const response = await axios.get('http://localhost:8000/authors', {
                    params: { topic: topic, page: 1, limit: AUTHORS_PER_PAGE }
                });
                setSearchResults(response.data.authors || []);
                setTotalPages(response.data.totalPages || 1);
                setCurrentPage(1);
            } catch (error) {
                console.error('Error filtering by topic:', error);
                setSearchResults([]);
            } finally {
                setLoading(false);
            }
        }, 500), []
    );

    useEffect(() => {
        handleSearch();
        return handleSearch.cancel;
    }, [searchTerm, handleSearch]);

    useEffect(() => {
        if (selectedTopic) {
            handleTopicFilter(selectedTopic);
        }
        return () => handleTopicFilter.cancel && handleTopicFilter.cancel();
    }, [selectedTopic, handleTopicFilter]);

    const handleViewDetails = (researcher) => {
        navigate(`/researchers/${researcher.authorid}`);
    };

    const handleCompare = (researcher) => {
        console.log('Compare researcher:', researcher.name);
    };

    const handleTopicSelect = (topic) => {
        setSelectedTopic(topic);
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleTopicClear = () => {
        setSelectedTopic('');
        setSearchResults([]);
        setCurrentPage(1);
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
                    />
                ))}
            </div>
        ) : (
            <div className = "mt-10 text-center text-gray-500">
                {searchTerm || selectedTopic ? 'No researchers found matching your criteria.' : 'No researchers found.'}
            </div>
        )
    );

    const renderPagination = () => (
        <div className="flex justify-center mt-8 space-x-2">
            <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
                Previous
            </button>
            <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700">
                Page {currentPage} of {totalPages}
            </span>
            <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
                Next
            </button>
        </div>
    );

    const isFiltered = searchTerm || selectedTopic;
    const displayedAuthors = isFiltered ? searchResults : authors;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSearch={handleSearch}
                placeholder="Search by researcher name or author ID..."
            />

            <TopicFilter
                selectedTopic={selectedTopic}
                onTopicSelect={handleTopicSelect}
                onTopicClear={handleTopicClear}
            />

            {loading ? (
                <div className="flex justify-center mt-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {renderAuthors(displayedAuthors)}
                    {(!isFiltered || (selectedTopic && totalPages > 1)) && displayedAuthors.length > 0 && renderPagination()}
                </>
            )}
        </div>
    );
};

export default Researchers;