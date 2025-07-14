import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const FieldDetailPage = () => {
    const { topicName } = useParams();
    const decodedTopic = decodeURIComponent(topicName);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [topicCounts, setTopicCounts] = useState(null);
    const [authorIds, setAuthorIds] = useState([]);
    const [corpusIds, setCorpusIds] = useState([]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                // do all requests in parallel
                const [
                    countsRes,
                    authorsRes,
                    corpusRes
                ] = await Promise.all([
                    axios.get(`http://localhost:8000/specific_topics/topic_author_corpus_counts/${topicName}`),
                    axios.get(`http://localhost:8000/author_specific_topics/group_by_topic/${topicName}`),
                    axios.get(`http://localhost:8000/corpus_specific_topics/group_by_topic/${topicName}`)
                ]);

                setTopicCounts(countsRes.data);
                setAuthorIds(authorsRes.data.authorIds);
                setCorpusIds(corpusRes.data.corpusIds);
            } catch (err) {
                console.error('Error fetching topic data:', err);
                setError('Failed to load data.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [topicName]);

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">
                Research Field: <span className="text-blue-600">{decodedTopic}</span>
            </h1>

            {loading && (
                <div className="flex justify-center mt-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            )}

            {error && (
                <div className="text-red-500 text-center mt-8">{error}</div>
            )}

            {!loading && !error && (
                <div className="mt-6 space-y-6">

                    {topicCounts && (
                        <div className="p-4 bg-white rounded shadow">
                            <h2 className="text-lg font-semibold mb-2">Topic Summary</h2>
                            <p>Author count: <span className="font-mono">{topicCounts.count_author}</span></p>
                            <p>Corpus count: <span className="font-mono">{topicCounts.count_paper}</span></p>
                        </div>
                    )}

                    <div className="p-4 bg-white rounded shadow">
                        <h2 className="text-lg font-semibold mb-2">Author IDs</h2>
                        <div className="flex flex-wrap gap-2 max-h-96 overflow-auto">
                            {authorIds.map((id) => (
                                <span key={id} className="text-xs bg-blue-100 px-2 py-1 rounded">{id}</span>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-white rounded shadow">
                        <h2 className="text-lg font-semibold mb-2">Corpus IDs</h2>
                        <div className="flex flex-wrap gap-2 max-h-96 overflow-auto">
                            {corpusIds.map((id) => (
                                <span key={id} className="text-xs bg-green-100 px-2 py-1 rounded">{id}</span>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default FieldDetailPage;