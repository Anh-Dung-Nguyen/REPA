import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, TrendingUp, User, Calendar, ExternalLink } from 'lucide-react';
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

    const [authorList, setAuthorList] = useState([]);
    const [authorPage, setAuthorPage] = useState(1);
    const AUTHORS_PER_PAGE = 10;
    const [authorTotal, setAuthorTotal] = useState(0);

    const [paperList, setPaperList] = useState([]);
    const [paperPage, setPaperPage] = useState(1);
    const PAPERS_PER_PAGE = 10;
    const [paperTotal, setPaperTotal] = useState(0);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [
                    countsResponse,
                    avgHindexResponse,
                    corpusResponse,
                    authorResponse,
                    paperResponse
                ] = await Promise.all([
                    axios.get(`http://localhost:8000/specific_topics/topic_author_corpus_counts/${topicName}`),
                    axios.get(`http://localhost:8000/author_specific_topics/group_by_topic/${topicName}/average_hindex`),
                    axios.get(`http://localhost:8000/corpus_specific_topics/group_by_topic/${topicName}/stats`),
                    axios.get(`http://localhost:8000/author_specific_topics/group_by_topic/${topicName}?page=${authorPage}&pageSize=${AUTHORS_PER_PAGE}`),
                    axios.get(`http://localhost:8000/corpus_specific_topics/group_by_topic/${topicName}?page=${paperPage}&pageSize=${PAPERS_PER_PAGE}`)
                ]);

                setTopicCounts(countsResponse.data);
                setAverageHindex(avgHindexResponse.data);
                setCorpusStat(corpusResponse.data);

                setAuthorTotal(authorResponse.data.total || 0);
                const authorIds = authorResponse.data.authorIds || [];
                const authorDetails = await Promise.all(
                    authorIds.map(id => 
                        axios.get(`http://localhost:8000/authors/${id}`).then(res => res.data).catch(() => null)
                    )
                );
                setAuthorList(authorDetails.filter(Boolean));

                setPaperTotal(paperResponse.data.total || 0);
                const paperIds = paperResponse.data.corpusIds || [];
                const paperDetails = await Promise.all(
                    paperIds.map(id =>
                        axios.get(`http://localhost:8000/papers_with_annotations/${id}`).then(res => res.data).catch(() => null)
                    )
                );
                setPaperList(paperDetails.filter(Boolean));

                const details = corpusResponse.data.details || [];

                if (details.length > 0) {
                    const evolutionByYear = {};
                    const citationByYear = {};
                    const referenceByYear = {};

                    details.forEach(({ year, citationCount, referenceCount }) => {
                        evolutionByYear[year] = (evolutionByYear[year] || 0) + 1;

                        citationByYear[year] = (citationByYear[year] || 0) + citationCount;

                        referenceByYear[year] = (referenceByYear[year] || 0) + referenceCount;
                    });

                    setTopicEvolutionData(
                        Object.entries(evolutionByYear)
                            .map(([year, topicCount]) => ({ year: Number(year), topicCount }))
                            .sort((a, b) => a.year - b.year)
                    );

                    setCitationEvolutionData(
                        Object.entries(citationByYear)
                            .map(([year, citationCount]) => ({ year: Number(year), citationCount }))
                            .sort((a, b) => a.year - b.year)
                    );

                    setReferenceEvolutionData(
                        Object.entries(referenceByYear)
                            .map(([year, referenceCount]) => ({ year: Number(year), referenceCount }))
                            .sort((a, b) => a.year - b.year)
                    );
                }

            } catch (error) {
                console.error('Error fetching topic data:', error);
                setError('Failed to load data.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [topicName, paperPage, authorPage]);

    const handleAuthorClick = async (author) => {
        if(author.authorid){
            navigate(`/researchers/${author.authorid}`);
        }
    };

    const handlePaperClick = async (paper) => {
        window.open(paper.url, '_blank');
    };

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

                    <div className='bg-white rounded-lg shadow-md mb-6 mt-6'>
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
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6 flex flex-col">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <User className="text-blue-600" size={20} />
                                                Top 10 Authors
                                            </h3>
                                            <div className='space-y-3'>
                                                {authorList.map((author, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                                        onClick={() => handleAuthorClick(author)}
                                                    >
                                                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                            {author.name?.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-800 truncate">{author.name}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('authors')}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium w-full text-center pt-2"
                                            >
                                                Show more
                                            </button>
                                        </div>

                                        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6 flex flex-col">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                <BookOpen className="text-green-600" size={20} />
                                                Top 10 Papers
                                            </h3>
                                            <div className='space-y-3'>
                                                {paperList.slice(0, 10).map((paper, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                                        onClick={() => handlePaperClick(paper)}
                                                    >
                                                        <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                                                            {paper.year || "N/A"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-800 truncate">{paper.title}</p>
                                                            <p className='text-xs font-semibold text-gray-500'>Citation: {paper.citationcount || 0}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('papers')}
                                                className="text-green-600 hover:text-green-800 text-sm font-medium w-full text-center pt-2"
                                            >
                                                Show more
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'papers' && (
                                <div className="bg-white rounded-lg shadow-md">
                                    <div className="p-6 border-b border-gray-200">
                                        <h2 className="text-xl font-semibold text-gray-800">Papers</h2>
                                        <p className="text-gray-600 mt-1">
                                            {paperTotal} total papers found
                                        </p>
                                    </div>

                                    <div className="divide-y divide-gray-200">
                                        {paperList.map((paper, index) => (
                                            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <h3
                                                            className="text-lg font-medium text-gray-800 hover:text-blue-600 cursor-pointer transition-colors mb-2"
                                                            onClick={() => handlePaperClick(paper)}
                                                        >
                                                            {paper.title}
                                                        </h3>

                                                        {paper.abstract && (
                                                            <p className="text-gray-600 text-sm mb-3 line-clamp-3">{paper.abstract}</p>
                                                        )}

                                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                            {paper.year && (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={14} />
                                                                    <span>{paper.year}</span>
                                                                </div>
                                                            )}
                                                            {paper.citationcount !== undefined && (
                                                                <div className="flex items-center gap-1">
                                                                    <TrendingUp size={14} />
                                                                    <span>{paper.citationcount} citations</span>
                                                                </div>
                                                            )}
                                                            {paper.venue && (
                                                                <div className="flex items-center gap-1">
                                                                    <FileText size={14} />
                                                                    <span>{paper.venue}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                                                            {paper.annotation?.union && (
                                                                <div className="flex items-center gap-1">
                                                                    <BookOpen size={14} />
                                                                    <span>
                                                                        {paper.annotation.union.length > 0
                                                                            ? paper.annotation.union.join(', ')
                                                                            : 'No topics'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            <span className="font-medium text-sm text-gray-500">Authors:</span>
                                                            {paper.authors?.map(author => (
                                                                <button
                                                                    key={author.authorId}
                                                                    onClick={() => navigate(`/researchers/${author.authorId}`)}
                                                                    className="bg-gray-200 rounded-lg px-2 py-1 text-gray-500 hover:text-blue-500 text-sm"
                                                                >
                                                                    {author.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handlePaperClick(paper)}
                                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                                                    >
                                                        <ExternalLink size={14} />
                                                        View
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {paperList.length === 0 && (
                                            <div className="p-12 text-center">
                                                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-800 mb-2">No Papers Found</h3>
                                                <p className="text-gray-600">This topic doesn't have any papers in our database yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center p-4 border-t border-gray-200">
                                        <button
                                            onClick={() => setPaperPage(prev => Math.max(prev - 1, 1))}
                                            disabled={paperPage === 1}
                                            className={`px-4 py-2 rounded-lg ${
                                            paperPage === 1
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Page {paperPage} of {Math.ceil(paperTotal / PAPERS_PER_PAGE)}
                                        </span>
                                        <button
                                            onClick={() => setPaperPage(prev => prev + 1)}
                                            disabled={paperPage >= Math.ceil(paperTotal / PAPERS_PER_PAGE)}
                                            className={`px-4 py-2 rounded-lg ${
                                            paperPage >= Math.ceil(paperTotal / PAPERS_PER_PAGE)
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'authors' && (
                                <div className="bg-white rounded-lg shadow-md">
                                    <div className="p-6 border-b border-gray-200">
                                        <h2 className="text-xl font-semibold text-gray-800">Authors</h2>
                                        <p className="text-gray-600 mt-1">
                                            {authorTotal} total authors found
                                        </p>
                                    </div>

                                    <div className="divide-y divide-gray-200">
                                        {authorList.map((author, index) => (
                                            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-center gap-4">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <User size={20} className="text-blue-600" />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <h3
                                                                className="text-lg font-medium text-gray-800 hover:text-blue-600 cursor-pointer transition-colors truncate"
                                                                onClick={() => handleAuthorClick(author)}
                                                            >
                                                                {author.name}
                                                            </h3>

                                                            <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-1">
                                                                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                                    Author ID: {author.authorid}
                                                                </span>
                                                                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                                    H-Index: {author.hindex}
                                                                </span>
                                                                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                                    Papers: {author.papercount}
                                                                </span>
                                                                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                                    Citations: {author.citationcount}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleAuthorClick(author)}
                                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-4 py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
                                                    >
                                                        <ExternalLink size={14} />
                                                        View Profile
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {authorList.length === 0 && (
                                            <div className="p-12 text-center">
                                                <User size={48} className="text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-medium text-gray-800 mb-2">No Authors Found</h3>
                                                <p className="text-gray-600">This topic doesn't have recorded authors in our database yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center p-4 border-t border-gray-200">
                                        <button
                                            onClick={() => setAuthorPage(prev => Math.max(prev - 1, 1))}
                                            disabled={authorPage === 1}
                                            className={`px-4 py-2 rounded-lg ${
                                            authorPage === 1
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Page {authorPage} of {Math.ceil(authorTotal / AUTHORS_PER_PAGE)}
                                        </span>
                                        <button
                                            onClick={() => setAuthorPage(prev => prev + 1)}
                                            disabled={authorPage >= Math.ceil(authorTotal / AUTHORS_PER_PAGE)}
                                            className={`px-4 py-2 rounded-lg ${
                                            authorPage >= Math.ceil(authorTotal / AUTHORS_PER_PAGE)
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            Next
                                        </button>
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