import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import FieldCard from '../components/FieldCard';

const ResearchFields = () => {
  const [loading, setLoading] = useState(false);
  const [fieldsData, setFieldsData] = useState([]);
  const [fieldsPage, setFieldsPage] = useState(1);
  const [fieldsTotalPages, setFieldsTotalPages] = useState(1);
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');
  const [fieldSearchResults, setFieldSearchResults] = useState([]);
  const FIELDS_PER_PAGE = 60;

  useEffect(() => {
    const fetchResearchFieldsData = async () => {
      if (fieldSearchTerm) return; 

      setLoading(true);
      try {
        const authorCountsRes = await axios.get('http://localhost:8000/specific_topics/topic_author_counts', {
          params: {
            page: fieldsPage,
            limit: FIELDS_PER_PAGE
          }
        });

        const paperCountsRes = await axios.get('http://localhost:8000/specific_topics/topic_corpus_counts', {
          params: {
            page: fieldsPage,
            limit: FIELDS_PER_PAGE
          }
        });

        const authorTopics = authorCountsRes.data.topics;
        const paperTopics = paperCountsRes.data.topics;

        const paperCountsMap = {};
        paperTopics.forEach(topic => {
          paperCountsMap[topic.topic] = topic.count || 0;
        });

        const combinedFields = authorTopics.map(authorTopic => ({
          ...authorTopic,
          count_author: authorTopic.count, 
          count_paper: paperCountsMap[authorTopic.topic] || 0 
        }));

        setFieldsData(combinedFields);
        setFieldsTotalPages(authorCountsRes.data.totalPages);

      } catch (error) {
        console.error("Error fetching research fields data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResearchFieldsData();
  }, [fieldsPage, fieldSearchTerm]);

  const handleFieldSearch = async () => {
    if (!fieldSearchTerm.trim()) {
      setFieldSearchResults([]);
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      let allAuthorTopics = [];
      let allPaperTopics = [];
      
      try {
        const searchRes = await axios.get('http://localhost:8000/specific_topics/search', {
          params: { topic: fieldSearchTerm }
        });
        
        if (searchRes.data && searchRes.data.topics) {
          allAuthorTopics = searchRes.data.topics;
          const paperRes = await axios.get('http://localhost:8000/specific_topics/topic_corpus_counts', {
            params: { limit: 50000 }
          });
          allPaperTopics = paperRes.data.topics || [];
        }
      } catch (searchError) {
        console.log("No search endpoint, fetching all data with pagination...");
        
        const fetchAllPages = async (endpoint) => {
          let allData = [];
          let currentPage = 1;
          let hasMore = true;
          
          while (hasMore && currentPage <= 100) { 
            try {
              const response = await axios.get(endpoint, {
                params: {
                  page: currentPage,
                  limit: 1000 
                }
              });
              
              const pageData = response.data.topics || [];
              allData = [...allData, ...pageData];
              
              hasMore = pageData.length === 1000;
              currentPage++;
              
              console.log(`Fetched page ${currentPage - 1}, got ${pageData.length} items, total so far: ${allData.length}`);
              
            } catch (error) {
              console.log(`Error fetching page ${currentPage}, trying single high-limit request...`);
              try {
                const response = await axios.get(endpoint, {
                  params: { limit: 50000 }
                });
                return response.data.topics || [];
              } catch (fallbackError) {
                console.error("Fallback also failed:", fallbackError);
                return allData; 
              }
            }
          }
          
          return allData;
        };
        
        allAuthorTopics = await fetchAllPages('http://localhost:8000/specific_topics/topic_author_counts');
        
        allPaperTopics = await fetchAllPages('http://localhost:8000/specific_topics/topic_corpus_counts');
      }

      console.log(`Total author topics fetched: ${allAuthorTopics.length}`);
      console.log(`Total paper topics fetched: ${allPaperTopics.length}`);

      const filteredAuthorTopics = allAuthorTopics.filter(topic => 
        topic.topic && topic.topic.toLowerCase().includes(fieldSearchTerm.toLowerCase())
      );

      console.log(`Filtered author topics: ${filteredAuthorTopics.length}`);

      const paperCountsMap = {};
      allPaperTopics.forEach(topic => {
        if (topic.topic) {
          paperCountsMap[topic.topic] = topic.count || 0;
        }
      });

      const combinedSearchResults = filteredAuthorTopics.map(authorTopic => ({
        ...authorTopic,
        count_author: authorTopic.count,
        count_paper: paperCountsMap[authorTopic.topic] || 0
      }));

      console.log("Final search results:", combinedSearchResults.length);
      setFieldSearchResults(combinedSearchResults);

    } catch (error) {
      console.error("Error searching research fields:", error);
      setFieldSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldClick = (field) => {
    console.log("Field clicked:", field);
  };

  return (
    <div className = "container mx-auto px-4 py-6">
      <SearchBar 
        searchTerm = {fieldSearchTerm}
        setSearchTerm = {setFieldSearchTerm}
        onSearch = {handleFieldSearch}
        placeholder = "Search research fields by name..."
      />

      {loading && (
        <div className = 'flex justify-center mt-6'>
          <div className = "animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {!loading && (
        <>
          {fieldSearchResults.length > 0 ? (
            <div className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-6'>
              {fieldSearchResults.map((field, index) => (
                <FieldCard
                  key = {index}
                  field = {field} 
                  onViewResearchers = {() => handleFieldClick(field)}
                />
              ))}
            </div>
          ) : (
            <div className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 mt-6'>
              {fieldsData.map((field, index) => (
                <FieldCard
                  key = {index}
                  field = {field} 
                  onViewResearchers={() => handleFieldClick(field)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !fieldSearchTerm && fieldsData.length > 0 && (
        <div className = "w-full bg-white mt-8 z-50">
          <div className = "flex justify-center py-4 mt-8 space-x-4">
            <button
              onClick = {() => setFieldsPage((prev) => Math.max(prev - 1, 1))}
              disabled = {fieldsPage === 1 || loading}
              className = {`px-4 py-2 rounded-md transition-colors duration-200 ${
                fieldsPage === 1 || loading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Previous
            </button>

            <span className = "self-center text-gray-700">
              Page {fieldsPage} of {fieldsTotalPages}
            </span>

            <button
              onClick = {() => setFieldsPage((prev) => Math.min(prev + 1, fieldsTotalPages))}
              disabled = {fieldsPage === fieldsTotalPages || loading}
              className = {`px-4 py-2 rounded-md transition-colors duration-200 ${
                fieldsPage === fieldsTotalPages || loading
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

export default ResearchFields;