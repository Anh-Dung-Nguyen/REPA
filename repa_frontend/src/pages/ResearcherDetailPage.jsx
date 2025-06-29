import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User2, BookOpen, Award, MapPin,ExternalLink,TrendingUp,Calendar,FileText } from 'lucide-react';

const ResearcherDetailPage = () => {
    const { authorId } = useParams();
    const navigate = useNavigate();
    
    const [researcher, setResearcher] = useState(null);
    const [researcherPapers, setResearcherPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const [showAllTopics, setShowAllTopics] = useState(false);

    useEffect(() => {
        const fetchResearcherData = async () => {
            if (!authorId) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const researcherResponse = await axios.get(`http://localhost:8000/authors/${authorId}`);
                setResearcher(researcherResponse.data);

                const papersResponse = await axios.get(`http://localhost:8000/authors_papers_annotations/${authorId}`);
                
                const papers = Array.isArray(papersResponse.data[0]?.papers)
                ? papersResponse.data[0].papers.map(paper => ({
                    title: paper.title,
                    corpusid: paper.annotation.corpusid,
                    year: paper.year,
                    citationcount: paper.citationcount,
                    venue: paper.venue,
                    abstract: paper.abstract
                    }))
                : [];
                
                setResearcherPapers(papers);
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

    // Co-authors are available directly from the researcher object
    const coAuthors = researcher.coauthors || [];

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
                                    {researcher.affiliation && (
                                        <div className="flex items-center gap-1">
                                        <MapPin size={16} />
                                        <span>{researcher.affiliation}</span>
                                        </div>
                                    )}
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
                                <User2 size={18} />
                                Co-Authors
                        </button>
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FileText className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Total Publications</h3>
                                        <p className="text-3xl font-bold text-blue-600">{researcher.papercount || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <Award className="text-green-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">H-Index</h3>
                                        <p className="text-3xl font-bold text-green-600">{researcher.hindex || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="text-purple-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Total Citations</h3>
                                        <p className="text-3xl font-bold text-purple-600">
                                            {researcher.citationcount || 'N/A'}                                       
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="text-orange-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Years Active</h3>
                                        <p className="text-3xl font-bold text-orange-600">
                                        {researcherPapers.length > 0 
                                            ? `${Math.min(...researcherPapers.map(p => p.year || 2024))} - ${Math.max(...researcherPapers.map(p => p.year || 2024))}`
                                            : 'N/A'
                                        }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                        <User2 className="text-yellow-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Co-Authors</h3>
                                        <p className="text-3xl font-bold text-yellow-600">{researcher.unique_coauthors_count || coAuthors.length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <BookOpen className="text-indigo-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Specific Topics</h3>
                                        <p className="text-3xl font-bold text-indigo-600">
                                            {specificTopics.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Publications</h3>
                                <div className="space-y-4">
                                    {researcherPapers.slice(0, 5).map((paper, index) => (
                                        <div key={index} className="border-l-4 border-blue-200 pl-4">
                                            <h4 
                                                className="font-medium text-gray-800 hover:text-blue-600 cursor-pointer transition-colors line-clamp-2"
                                                onClick={() => handlePaperClick(paper)}
                                            >
                                                {paper.title}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {paper.year && `${paper.year} • `}
                                                {paper.citationcount !== undefined && `${paper.citationcount} citations`}
                                            </p>
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

                            {coAuthors.length > 0 && (
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Co-Authors</h3>
                                    <div className="space-y-3">
                                        {coAuthors.slice(0, 8).map((coAuthor, index) => (
                                            <div 
                                                key={index} 
                                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                                                onClick={() => handleCoAuthorClick(coAuthor)}
                                            >
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User2 size={14} className="text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 truncate">{coAuthor.name}</p>
                                                </div>
                                                <ExternalLink size={14} className="text-gray-400" />
                                            </div>
                                        ))}
                                        {coAuthors.length > 8 && (
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

                            {specificTopics.length > 0 && (
                                <div className="bg-white rounded-lg shadow-md p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Research Topics</h3>
                                    <div className="space-y-4">
                                        {(showAllTopics ? specificTopics : specificTopics.slice(0, 4)).map((topic, index) => (
                                            <div key={index} className="border-l-4 border-indigo-200 pl-4">
                                                <h4 className="font-medium text-gray-800">{topic}</h4>
                                            </div>
                                        ))}

                                        {specificTopics.length > 4 && (
                                            <button
                                                onClick={() => setShowAllTopics(!showAllTopics)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
                                            >
                                                {showAllTopics ? 'Show less' : `Show ${specificTopics.length - 4} more topics`} 
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
                            <p className="text-gray-600 mt-1">{researcher.papercount} total publications</p>
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
                            <p className="text-gray-600 mt-1">{coAuthors.length} frequent collaborators</p>
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
                                    <User2 size={48} className="text-gray-400 mx-auto mb-4" />
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