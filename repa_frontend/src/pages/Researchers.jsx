import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import ResearcherCard from '../components/ResearcherCard';

const Researchers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const AUTHORS_PER_PAGE = 51;

    useEffect(() => {
        const fetchPaginatedAuthors = async () => {
            try {
                setLoading(true);
                const res = await axios.get('http://localhost:8000/authors', {
                    params: { page: currentPage, limit: AUTHORS_PER_PAGE }
                });
                setAuthors(res.data.authors);
                setTotalPages(res.data.totalPages);
            } catch (error) {
                console.error('Error fetching paginated authors:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!searchTerm) {
            fetchPaginatedAuthors();
        }
    }, [currentPage, searchTerm]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
            const response = await axios.get('http://localhost:8000/authors/search', {
                params: { name: searchTerm }
            });
            setSearchResults(response.data.authors || []);
        } catch (error) {
            console.error('Error searching authors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (researcher) => {
        navigate(`/researchers/${researcher.authorid}`);
    };

    const handleCompare = (researcher) => {
        console.log('Compare researcher:', researcher.name);
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
            <div className="mt-10 text-center text-gray-500">No researchers found.</div>
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

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSearch={handleSearch}
                placeholder="Search researcher by name ..."
            />

            {loading ? (
                <div className="flex justify-center mt-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {searchTerm ? renderAuthors(searchResults) : renderAuthors(authors)}
                    {!searchTerm && authors.length > 0 && renderPagination()}
                </>
            )}
        </div>
    );
};

export default Researchers;