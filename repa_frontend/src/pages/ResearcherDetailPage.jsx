import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User2, BookOpen, Award, Quote, ExternalLink, TrendingUp, Calendar, FileText, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ResearcherDetailPage = () => {
    const { authorId } = useParams();
    const navigate = useNavigate();
    
    const [researcher, setResearcher] = useState(null);
    const [researcherPapers, setResearcherPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const [showAllTopics] = useState(false);

    useEffect(() => {
        const fetchResearcherData = async () => {
            if (!authorId) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const researcherResponse = await axios.get(`http://localhost:8000/authors/${authorId}`);
                setResearcher(researcherResponse.data);

                const papersResponse = await axios.get(`http://localhost:8000/authors_papers_annotations/${authorId}`);
                
                const papers = Array.isArray(papersResponse.data?.papers)
                    ? papersResponse.data.papers.map(paper => ({
                        title: paper.title,
                        corpusid: paper.annotation.corpusid,
                        year: paper.year,
                        citationcount: paper.citationcount,
                        venue: paper.venue,
                        abstract: paper.abstract,
                        numberOfCoAuthors: paper.numberOfCoAuthors,
                        specificTopics: paper.specificTopics || []
                        }))
                    : [];
                
                setResearcherPapers(papers);
                
                console.log('Papers response:', papersResponse.data);
                console.log('Processed papers:', papers);
                
            } catch (error) {
                console.error("Error fetching researcher data:", error);
                setError("Failed to load researcher data");
            } finally {
                setLoading(false);
            }
        };

        fetchResearcherData();
    }, [authorId]);

    const handlePaperClick = async (paper) => {
        if (!paper?.corpusid) {
            alert("No corpusid found for this paper.");
            return;
        }
        
        try {
            const res = await axios.get(`http://localhost:8000/papers_with_annotations/url/${paper.corpusid}`);
            if (res.data?.url) {
                const cleanUrl = res.data.url.replace(/^"|"$/g, '');
                window.open(cleanUrl, '_blank');
            } else {
                alert("URL not found for this paper.");
            }
        } catch (error) {
            console.error("Error fetching paper URL:", error);
            alert("Failed to load paper URL.");
        }
    };

    const handleCoAuthorClick = (coAuthor) => {
        if (coAuthor.authorid) {
            navigate(`/researchers/${coAuthor.authorid}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !researcher) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Researcher Not Found</h2>
                        <p className="text-gray-600 mb-6">{error || "The researcher you're looking for doesn't exist."}</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const specificTopics = researcher.specific_topic
        ? researcher.specific_topic.split(',').map(topic => topic.trim()).filter(Boolean)
        : [];

    const coAuthors = researcher.coauthors || [];

    const papersByYear = {};

    researcherPapers.forEach((paper) => {
        if (paper.year) {
            if (!papersByYear[paper.year]) {
                papersByYear[paper.year] = { year: paper.year, citations: 0, topics: new Set() };
            }

            papersByYear[paper.year].citations += paper.citationcount || 0;

            (paper.specificTopics || []).forEach(topic => {
                papersByYear[paper.year].topics.add(topic.trim());
            });
        }
    });

    const topicEvolutionData = Object.values(papersByYear)
        .sort((a, b) => a.year - b.year)
        .map(item => ({
            year: item.year,
            topicCount: item.topics.size,
        }));

    const citationsEvolutionData = Object.values(papersByYear)
        .sort((a, b) => a.year - b.year)
        .map(item => ({
            year: item.year,
            citations: item.citations,
        }));

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mb-4"
                    >
                        <ArrowLeft size={20} />
                        Back to Researchers
                    </button>
                
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                <User2 size={32} className="text-blue-600" />
                            </div>
                            
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">{researcher.name}</h1>
                                <div className="flex flex-wrap gap-4 text-gray-600">
                                    {researcher.hindex && (
                                        <div className="flex items-center gap-1">
                                            <Award size={16} />
                                            <span>H-Index: {researcher.hindex}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <FileText size={16} />
                                        <span>{researcher.papercount} Papers</span>
                                    </div>
                                    {researcher.citationcount && (
                                        <div className="flex items-center gap-1">
                                            <Quote size={16} />
                                            <span>{researcher.citationcount} Citations</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md mb-6">
                    <div className="flex border-b border-gray-200">
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
                            onClick={() => setActiveTab('publications')}
                            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                                activeTab === 'publications'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <BookOpen size={18} />
                            Publications
                        </button>
                        <button
                            onClick={() => setActiveTab('topics')}
                            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                            activeTab === 'topics'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <FileText size={18} />
                            Research Fields
                        </button>
                        <button
                            onClick={() => setActiveTab('coauthors')}
                            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                                activeTab === 'coauthors'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                            >
                                <Users size={18} />
                                Co-Authors
                        </button>
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg shadow-md p-4 border-t-4 border-blue-500 hover:scale-105 transition-transform">
                                <div className="text-2xl font-bold text-blue-600">{researcher.papercount || 'N/A'}</div>
                                <div className="text-sm text-gray-600">Papers Published</div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-4 border-t-4 border-green-500 hover:scale-105 transition-transform">
                                <div className="text-2xl font-bold text-green-600">{researcher.hindex || 'N/A'}</div>
                                <div className="text-sm text-gray-600">H-Index Score</div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-4 border-t-4 border-purple-500 hover:scale-105 transition-transform">
                                <div className="text-2xl font-bold text-purple-600">{researcher.citationcount || 'N/A'}</div>
                                <div className="text-sm text-gray-600">Total Citations</div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-4 border-t-4 border-orange-500 hover:scale-105 transition-transform">
                                <div className="text-2xl font-bold text-orange-600">{researcher.unique_coauthors_count || coAuthors.length}</div>
                                <div className="text-sm text-gray-600">Collaborators</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <TrendingUp className="text-blue-600" size={20} />
                                    Topic Evolution
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
                                    <Quote className="text-green-600" size={20} />
                                    Author Citations Evolution
                                </h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={citationsEvolutionData}>
                                        <XAxis dataKey="year" stroke="#4B5563" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="citations" stroke="#10B981" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Users className="text-purple-600" size={20} />
                                    Co-Authors Citations Evolution
                                </h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={citationsEvolutionData}>
                                        <XAxis dataKey="year" stroke="#4B5563" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="citations" stroke="#8B5CF6" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="text-blue-600" size={20} />
                                    Recent Publications
                                </h3>
                                <div className="space-y-4">
                                    {researcherPapers.slice(0, 5).map((paper, index) => (
                                        <div
                                            key={index}
                                            className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                            onClick={() => handlePaperClick(paper)}
                                        >
                                            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                                                {paper.year || 'N/A'}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-800 mb-1 line-clamp-2">{paper.title}</h4>
                                                <p className="text-sm text-gray-600">{paper.citationcount || 0} citations</p>
                                            </div>
                                        </div>
                                    ))}
                                    {researcherPapers.length > 5 && (
                                        <button
                                            onClick={() => setActiveTab('publications')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            View all {researcherPapers.length} publications →
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Calendar className="text-green-600" size={20} />
                                    Career Timeline
                                </h3>
                                <div className="space-y-4">
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {researcherPapers.length > 0 ? Math.min(...researcherPapers.map(p => p.year || 2024)) : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600">First Publication</div>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {researcherPapers.length > 0 ? Math.max(...researcherPapers.map(p => p.year || 2024)) : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600">Latest Work</div>
                                    </div>
                                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">{specificTopics.length}</div>
                                        <div className="text-sm text-gray-600">Research Areas</div>
                                    </div>
                                </div>
                            </div>

                            {specificTopics.length > 0 && (
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Award className="text-orange-600" size={20} />
                                        Research Topics
                                    </h3>
                                    <div className="space-y-4">
                                        {(showAllTopics ? specificTopics : specificTopics.slice(0, 6)).map((topic, index) => (
                                            <div key={index} className="border-l-4 border-orange-200 pl-4">
                                                <h4 className="font-medium text-gray-800">{topic}</h4>
                                            </div>
                                        ))}
                                        {specificTopics.length > 5 && (
                                            <button
                                                onClick={() => setActiveTab('topics')}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
                                            >
                                                View all topics →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {coAuthors.length > 0 && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <User2 className="text-purple-600" size={20} />
                                Top Co-Authors
                            </h3>
                            <div className="space-y-3">
                                {coAuthors.slice(0, 12).map((coAuthor, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                    onClick={() => handleCoAuthorClick(coAuthor)}
                                >
                                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    {coAuthor.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{coAuthor.name}</p>
                                    </div>
                                </div>
                                ))}
                                {coAuthors.length > 5 && (
                                <button
                                    onClick={() => setActiveTab('coauthors')}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium w-full text-center pt-2"
                                >
                                    View all {coAuthors.length} co-authors →
                                </button>
                                )}
                            </div>
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {activeTab === 'publications' && (
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800">Publications</h2>
                            <p className="text-gray-600 mt-1">{researcherPapers.length} total publications found</p>
                        </div>
                        
                        <div className="divide-y divide-gray-200">
                            {researcherPapers.map((paper, index) => (
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
                                                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                                                {paper.abstract}
                                                </p>
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
                                                {paper.numberOfCoAuthors && (
                                                    <div className="flex items-center gap-1">
                                                        <Users size={14} />
                                                        <span>{paper.numberOfCoAuthors}</span>
                                                    </div>
                                                )}
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
                            
                            {researcherPapers.length === 0 && (
                                <div className="p-12 text-center">
                                    <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Publications Found</h3>
                                    <p className="text-gray-600">This researcher doesn't have any publications in our database yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'topics' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Research Topics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {specificTopics.map((topic, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500">
                                    <h4 className="font-medium text-gray-800 capitalize">{topic}</h4>
                                </div>
                            ))}
                        </div>
                        {specificTopics.length === 0 && (
                            <div className="text-center py-12">
                                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-800 mb-2">No Topics Found</h3>
                                <p className="text-gray-600">No specific research topics have been identified for this researcher.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'coauthors' && (
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800">Co-Authors</h2>
                            <p className="text-gray-600 mt-1">{coAuthors.length} collaborators</p>
                        </div>

                        <div className="divide-y divide-gray-200">
                            {coAuthors.map((coAuthor, index) => (
                                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <User2 size={20} className="text-blue-600" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-medium text-gray-800 hover:text-blue-600 cursor-pointer transition-colors truncate"
                                                    onClick={() => handleCoAuthorClick(coAuthor)}>
                                                    {coAuthor.name}
                                                </h3>
                                                
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                        Author ID: {coAuthor.authorid}
                                                    </span>
                                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                        H-Index: {coAuthor.hindex}
                                                    </span>
                                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                        Papers: {coAuthor.papercount}
                                                    </span>
                                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                        Citations: {coAuthor.citationcount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleCoAuthorClick(coAuthor)}
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-4 py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
                                        >
                                            <ExternalLink size={14} />
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {coAuthors.length === 0 && (
                                <div className="p-12 text-center">
                                    <Users size={48} className="text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Co-Authors Found</h3>
                                    <p className="text-gray-600">This researcher doesn't have recorded co-authors in our database yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearcherDetailPage;