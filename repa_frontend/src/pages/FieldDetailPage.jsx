import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, TrendingUp, User } from 'lucide-react';
import axios from 'axios';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const FieldDetailPage = () => {
    const { topicName } = useParams();
    const navigate = useNavigate();
    const decodedTopic = decodeURIComponent(topicName);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [topicCounts, setTopicCounts] = useState(null);
    const [averageHindex, setAverageHindex] = useState([]);
    const [corpusStat, setCorpusStat] = useState([]);
    const [topicEvolutionData, setTopicEvolutionData] = useState([]);
    const [citationEvolutionData, setCitationEvolutionData] = useState([]);
    const [referenceEvolutionData, setReferenceEvolutionData] = useState([]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const [
                    countsRes,
                    avgHindexRes,
                    corpusRes
                ] = await Promise.all([
                    axios.get(`http://localhost:8000/specific_topics/topic_author_corpus_counts/${topicName}`),
                    axios.get(`http://localhost:8000/author_specific_topics/group_by_topic/${topicName}/average_hindex`),
                    axios.get(`http://localhost:8000/corpus_specific_topics/group_by_topic/${topicName}/stats`)
                ]);

                setTopicCounts(countsRes.data);
                setAverageHindex(avgHindexRes.data);
                setCorpusStat(corpusRes.data);

                if (corpusRes.data.details) {
                    const counts = {};
                    corpusRes.data.details.forEach(item => {
                        counts[item.year] = (counts[item.year] || 0) + 1;
                    });

                    const evolution = Object.entries(counts)
                        .map(([year, topicCount]) => ({ year: Number(year), topicCount}))
                        .sort((a, b) => a.year - b.year);
                    
                    setTopicEvolutionData(evolution);
                }

                if (corpusRes.data.details) {
                    const yearToCitation = {};
                    corpusRes.data.details.forEach(item => {
                        const year = item.year;
                        if (!yearToCitation[year]) {
                            yearToCitation[year] = 0;
                        }
                        yearToCitation[year] += item.citationCount;
                    });

                    const evolution = Object.entries(yearToCitation)
                        .map(([year, citationCount]) => ({ year: Number(year), citationCount}))
                        .sort((a, b) => a.year - b.year);
                    
                    setCitationEvolutionData(evolution);
                }

                if (corpusRes.data.details) {
                    const yearToReference = {};
                    corpusRes.data.details.forEach(item => {
                        const year = item.year;
                        if (!yearToReference[year]) {
                            yearToReference[year] = 0;
                        }
                        yearToReference[year] += item.referenceCount;
                    });

                    const evolution = Object.entries(yearToReference)
                        .map(([year, referenceCount]) => ({ year: Number(year), referenceCount }))
                        .sort((a, b) => a.year - b.year);

                    setReferenceEvolutionData(evolution);
                }
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
        <div className='min-h-screen bg-gray-50'>
            <div className='container mx-auto px-4 py-8'>
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className='flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mb-4'
                    >
                        <ArrowLeft size={20} />
                        Back to Research Fields
                    </button>

                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <div className='flex flex-col md:flex-row md:items-center gap-4'>
                            <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center'>
                                <FileText size={32} className='text-blue-600' />
                            </div>
                            <div className='flex-1'>
                                <h1 className='text-3xl font-bold text-gray-800 mb-2'>
                                    {decodedTopic}
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className='bg-white rounded-lg shadow-md mb-6'>
                        <div className='flex border-b border-gray-200'>
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                                    activeTab === 'overview'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <TrendingUp size={18} />
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('papers')}
                                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                                    activeTab === 'papers'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <BookOpen size={18} />
                                Papers
                            </button>
                            <button
                                onClick={() => setActiveTab('authors')}
                                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                                    activeTab === 'authors'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                <User size={18} />
                                Authors
                            </button>
                        </div>
                    </div>

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

                            {activeTab === "overview" && topicCounts && (
                                <div className='space-y-6'>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                        <div className='bg-white rounded-lg shadow-md p-4 border-t-4 border-blue-500 hover:scale-105 transition-transform'>
                                            <div className='text-2xl font-bold text-blue-600'>{topicCounts.count_author}</div>
                                            <div className='text-sm text-gray-600'>Number of Authors</div>
                                        </div>
                                        <div className='bg-white rounded-lg shadow-md p-4 border-t-4 border-yellow-500 hover:scale-105 transition-transform'>
                                            <div className='text-2xl font-bold text-yellow-600'>{topicCounts.count_paper}</div>
                                            <div className='text-sm text-gray-600'>Number of Papers</div>
                                        </div>
                                        <div className='bg-white rounded-lg shadow-md p-4 border-t-4 border-orange-500 hover:scale-105 transition-transform'>
                                            <div className='text-2xl font-bold text-orange-600'>{averageHindex.averageHindex}</div>
                                            <div className='text-sm text-gray-600'>Average of H-Index</div>
                                        </div>
                                        <div className='bg-white rounded-lg shadow-md p-4 border-t-4 border-green-500 hover:scale-105 transition-transform'>
                                            <div className='text-2xl font-bold text-green-600'>{corpusStat.averagePages}</div>
                                            <div className='text-sm text-gray-600'>Average of Pages</div>
                                        </div>
                                        <div className='bg-white rounded-lg shadow-md p-4 border-t-4 border-pink-500 hover:scale-105 transition-transform'>
                                            <div className='text-2xl font-bold text-pink-600'>{corpusStat.totalCitations}</div>
                                            <div className='text-sm text-gray-600'>Total of Citations</div>
                                        </div>
                                        <div className='bg-white rounded-lg shadow-md p-4 border-t-4 border-purple-500 hover:scale-105 transition-transform'>
                                            <div className='text-2xl font-bold text-purple-600'>{corpusStat.totalReferences}</div>
                                            <div className='text-sm text-gray-600'>Total of References</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <TrendingUp className="text-blue-600" size={20} />
                                                Number of Papers by Year
                                            </h3>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={topicEvolutionData}>
                                                    <XAxis dataKey="year" stroke="#4B5563" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Line type="monotone" dataKey="topicCount" stroke="#3B82F6" strokeWidth={2} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <TrendingUp className="text-green-600" size={20} />
                                                Citations by Year
                                            </h3>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={citationEvolutionData}>
                                                    <XAxis dataKey="year" stroke="#4B5563" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Line type="monotone" dataKey="citationCount" stroke="#10B981" strokeWidth={2} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="bg-white rounded-lg shadow-md p-6">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <TrendingUp className="text-purple-600" size={20} />
                                                References by Year
                                            </h3>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={referenceEvolutionData}>
                                                    <XAxis dataKey="year" stroke="#4B5563" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Line type="monotone" dataKey="referenceCount" stroke="#8E24AA" strokeWidth={2} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FieldDetailPage;