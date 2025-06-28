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
    const [hasFetchedAuthors, setHasFetchedAuthors] = useState(false);
    const AUTHORS_PER_PAGE = 51;

    useEffect(() => {
        const fetchPaginatedAuthors = async () => {
            try {
                setLoading(true);
                const res = await axios.get("http://localhost:8000/authors", {
                    params: {
                        page: currentPage,
                        limit: AUTHORS_PER_PAGE
                }
                });
                setAuthors(res.data.authors);
                setTotalPages(res.data.totalPages);
                setHasFetchedAuthors(true);
            } catch (error) {
                console.error("Error fetching paginated authors:", error);
            } finally {
                setLoading(false);
            }
        };

        if (!searchTerm && (!hasFetchedAuthors || authors.length === 0)) {
            fetchPaginatedAuthors();
        }
    }, [currentPage, searchTerm, hasFetchedAuthors, authors.length]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const response = await axios.get(`http://localhost:8000/authors/search`, {
                params: { name: searchTerm }
            });
            console.log("Search results: ", response.data.authors);
            setSearchResults(response.data.authors || []);
        } catch (error) {
            console.error("Error searching authors:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (researcher) => {
        navigate(`/researchers/${researcher.authorid}`);
    };

    const handleCompare = (researcher) => {
        console.log("Compare researcher: ", researcher.name);
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <SearchBar
                searchTerm = {searchTerm}
                setSearchTerm = {setSearchTerm}
                onSearch = {handleSearch}
                placeholder = "Search researcher by name ..."
            />

            {loading && (
                <div className = 'flex justify-center mt-6'>
                    <div className = "animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            )}

            {!loading && (
                <>
                    {searchResults.length > 0 ? (
                        <div className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {searchResults.map((author) => (
                                <ResearcherCard
                                    key = {author.authorid}
                                    researcher = {author}
                                    onViewDetails = {handleViewDetails}
                                    onCompare = {handleCompare}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {authors.map((author) => (
                                <ResearcherCard
                                    key = {author.authorid}
                                    researcher = {author}
                                    onViewDetails = {handleViewDetails}
                                    onCompare = {handleCompare}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {!loading && !searchTerm && authors.length > 0 && (
                <div className = "w-full bg-white mt-8 z-50">
                    <div className = "flex justify-center mt-4 mb-4 space-x-4">
                        <button
                            onClick = {() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled = {currentPage === 1}
                            className = {`px-4 py-2 rounded-md ${
                                currentPage === 1
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            Previous
                        </button>
                            <span className = "self-center text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                        <button
                            onClick = {() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled = {currentPage === totalPages}
                            className = {`px-4 py-2 rounded-md ${
                                currentPage === totalPages
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Researchers;