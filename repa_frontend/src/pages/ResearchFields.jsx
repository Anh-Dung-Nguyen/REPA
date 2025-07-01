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
    const fetchFields = async () => {
      if (fieldSearchTerm) return;
      setLoading(true);
      try {
        const [authorCountsRes, paperCountsRes] = await Promise.all([
          axios.get('http://localhost:8000/specific_topics/topic_author_counts', { params: { page: fieldsPage, limit: FIELDS_PER_PAGE }}),
          axios.get('http://localhost:8000/specific_topics/topic_corpus_counts', { params: { page: fieldsPage, limit: FIELDS_PER_PAGE }})
        ]);

        const paperCountsMap = Object.fromEntries(
          paperCountsRes.data.topics.map(topic => [topic.topic, topic.count || 0])
        );

        const combined = authorCountsRes.data.topics.map(t => ({
          ...t,
          count_author: t.count,
          count_paper: paperCountsMap[t.topic] || 0
        }));

        setFieldsData(combined);
        setFieldsTotalPages(authorCountsRes.data.totalPages);
      } catch (err) {
        console.error('Error fetching fields:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, [fieldsPage, fieldSearchTerm]);

  const handleFieldSearch = async () => {
    if (!fieldSearchTerm.trim()) {
      setFieldSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const [searchRes, paperRes] = await Promise.all([
        axios.get('http://localhost:8000/specific_topics/search', { params: { topic: fieldSearchTerm } }),
        axios.get('http://localhost:8000/specific_topics/topic_corpus_counts', { params: { limit: 50000 } })
      ]);

      const paperCountsMap = Object.fromEntries(
        (paperRes.data.topics || []).map(t => [t.topic, t.count || 0])
      );

      const filtered = (searchRes.data.topics || []).map(t => ({
        ...t,
        count_author: t.count,
        count_paper: paperCountsMap[t.topic] || 0
      }));
      setFieldSearchResults(filtered);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldClick = (field) => {
    console.log('Clicked field:', field);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SearchBar
        searchTerm={fieldSearchTerm}
        setSearchTerm={setFieldSearchTerm}
        onSearch={handleFieldSearch}
        placeholder="Search research fields..."
      />

      {loading && (
        <div className="flex justify-center mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {!loading && (
        <>
          {(fieldSearchResults.length > 0 || fieldsData.length > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 animate-fade-in">
              {(fieldSearchResults.length > 0 ? fieldSearchResults : fieldsData).map((field, idx) => (
                <FieldCard
                  key={idx}
                  field={field}
                  onViewResearchers={() => handleFieldClick(field)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-12">
              No research fields found.
            </div>
          )}
        </>
      )}

      {!loading && !fieldSearchTerm && fieldsTotalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            onClick={() => setFieldsPage(prev => Math.max(prev - 1, 1))}
            disabled={fieldsPage === 1}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              fieldsPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 transition'
            }`}
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {fieldsPage} of {fieldsTotalPages}
          </span>
          <button
            onClick={() => setFieldsPage(prev => Math.min(prev + 1, fieldsTotalPages))}
            disabled={fieldsPage === fieldsTotalPages}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              fieldsPage === fieldsTotalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 transition'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ResearchFields;