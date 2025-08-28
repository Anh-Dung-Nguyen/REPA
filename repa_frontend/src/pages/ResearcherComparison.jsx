import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User2, Award, Quote, FileText, Users, Calendar, TrendingUp, BookType, ExternalLink, TrendingUpDown, ArrowUpNarrowWide } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import OntologyTopic from "../components/OntologyTopic";

const ResearcherComparison = () => {
    const { authorId1, authorId2 } = useParams();
    const navigate = useNavigate();
    
    const [researchers, setResearchers] = useState([null, null]);
    const [researchersPapers, setResearchersPapers] = useState([[], []]);
    const [hindexPerTopic, setHindexPerTopic] = useState([[], []]);
    const [impactPerTopic, setImpactPerTopic] = useState([{}, {}]);
    const [impactGroupTopic, setImpactGroupTopic] = useState([0, 0]);
    const [allTopics, setAllTopics] = useState([[], []]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch SJR Quartile for a paper
    async function fetchSjrQuartile(title) {
        if (!title) return "No Data";
        try {
            const res = await axios.get(
                `http://localhost:8000/journal_data/sjr?title=${encodeURIComponent(title)}`
            );
            if (Array.isArray(res.data) && res.data.length > 0) {
                return res.data[0].SJR_Best_Quartile || "No Data";
            }
            return "No Data";
        } catch (err) {
            return "No Data";
        }
    }

    // Fetch data for a single researcher
    const fetchResearcherData = async (authorId, index) => {
        try {
            // Get researcher basic info
            const researcherResponse = await axios.get(`http://localhost:8000/authors/${authorId}`);
            const researcher = researcherResponse.data;

            // Get papers
            const papersResponse = await axios.get(`http://localhost:8000/authors_papers_annotations/author/${authorId}`);
            let papers = Array.isArray(papersResponse.data?.papers)
                ? papersResponse.data.papers.map(paper => ({
                    title: paper.title,
                    corpusid: paper.annotation.corpusid,
                    year: paper.year,
                    citationcount: paper.citationcount,
                    venue: paper.venue,
                    abstract: paper.abstract,
                    numberOfCoAuthors: paper.numberOfCoAuthors,
                    specificTopics: paper.specificTopics || [],
                    coAuthors: paper.authors || []
                }))
                : [];

            // Fetch additional paper data
            papers = await Promise.all(papers.map(async (paper) => {
                try {
                    const posRes = await axios.get(`http://localhost:8000/papers_with_annotations/authors_positions/${paper.corpusid}`);
                    const found = posRes.data.authors.find(a => a.authorId === authorId);
                    const sjrQuartile = await fetchSjrQuartile(paper.title);
                    return {
                        ...paper,
                        authorPosition: found ? found.position : null,
                        sjrQuartile: sjrQuartile || "No Data"
                    };
                } catch (e) {
                    return {
                        ...paper,
                        authorPosition: null,
                        sjrQuartile: "No Data"
                    };
                }
            }));

            // Get h-index per topic
            const hindexPerTopicResponse = await axios.get(`http://localhost:8000/authors/hindex_per_topic/${authorId}`);
            const hindexData = hindexPerTopicResponse.data?.hindexPerTopic || [];

            // Get impact group topic
            const impactGroupTopicResponse = await axios.get(`http://localhost:8000/impact/impact_group_topic/${authorId}`);
            const impactGroup = impactGroupTopicResponse.data?.impact_factor || 0;

            // Get all topics for ontology
            const authorTopicsResponse = await axios.get(`http://localhost:8000/author_topics/${authorId}`);
            const topics = authorTopicsResponse.data?.[0]?.topics || [];

            // Get impact factors for specific topics
            const impactResults = {};
            if (researcher.specific_topic) {
                const topics = researcher.specific_topic.split(',').map(t => t.trim()).filter(Boolean);
                await Promise.all(
                    topics.map(async (topic) => {
                        try {
                            const encodedTopic = encodeURIComponent(topic.toLowerCase());
                            const res = await axios.get(`http://localhost:8000/impact/impact_one_topic/${encodedTopic}`);
                            if (res.data?.impact_factor !== undefined) {
                                impactResults[topic.toLowerCase()] = res.data.impact_factor;
                            }
                        } catch (e) {
                            console.warn(`Impact factor fetch failed for topic: ${topic}`);
                        }
                    })
                );
            }

            return {
                researcher,
                papers,
                hindexData,
                impactResults,
                impactGroup,
                topics
            };
        } catch (error) {
            console.error(`Error fetching data for researcher ${authorId}:`, error);
            throw error;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!authorId1 || !authorId2) return;

            setLoading(true);
            setError(null);

            try {
                const [data1, data2] = await Promise.all([
                    fetchResearcherData(authorId1, 0),
                    fetchResearcherData(authorId2, 1)
                ]);

                setResearchers([data1.researcher, data2.researcher]);
                setResearchersPapers([data1.papers, data2.papers]);
                setHindexPerTopic([data1.hindexData, data2.hindexData]);
                setImpactPerTopic([data1.impactResults, data2.impactResults]);
                setImpactGroupTopic([data1.impactGroup, data2.impactGroup]);
                setAllTopics([data1.topics, data2.topics]);

            } catch (error) {
                console.error("Error fetching comparison data:", error);
                setError("Failed to load researcher comparison data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [authorId1, authorId2]);

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

    const handleResearcherClick = (authorId) => {
        navigate(`/researchers/${authorId}`);
    };

    // Generate citation evolution data
    const getCitationEvolution = (papers) => {
        const papersByYear = {};
        papers.forEach((paper) => {
            if (paper.year) {
                if (!papersByYear[paper.year]) {
                    papersByYear[paper.year] = { year: paper.year, citations: 0 };
                }
                papersByYear[paper.year].citations += paper.citationcount || 0;
            }
        });
        return Object.values(papersByYear).sort((a, b) => a.year - b.year);
    };

    // Generate topic evolution data
    const getTopicEvolution = (papers) => {
        const papersByYear = {};
        papers.forEach((paper) => {
            if (paper.year) {
                if (!papersByYear[paper.year]) {
                    papersByYear[paper.year] = { year: paper.year, topics: new Set() };
                }
                (paper.specificTopics || []).forEach(topic => {
                    papersByYear[paper.year].topics.add(topic.trim());
                });
            }
        });
        return Object.values(papersByYear)
            .sort((a, b) => a.year - b.year)
            .map(item => ({
                year: item.year,
                topicCount: item.topics.size,
            }));
    };

    // Generate combined topic evolution data
    const getCombinedTopicEvolutionData = () => {
        if (!researchers[0] || !researchers[1]) return [];
        
        const data1 = getTopicEvolution(researchersPapers[0]);
        const data2 = getTopicEvolution(researchersPapers[1]);
        
        const allYears = [...new Set([
            ...data1.map(d => d.year),
            ...data2.map(d => d.year)
        ])].sort();
        
        return allYears.map(year => {
            const researcher1Data = data1.find(d => d.year === year) || { topicCount: 0 };
            const researcher2Data = data2.find(d => d.year === year) || { topicCount: 0 };
            
            return {
                year,
                [`${researchers[0].name}`]: researcher1Data.topicCount,
                [`${researchers[1].name}`]: researcher2Data.topicCount
            };
        });
    };

    // Generate combined chart data for comparison
    const getCombinedEvolutionData = () => {
        if (!researchers[0] || !researchers[1]) return [];
        
        const data1 = getCitationEvolution(researchersPapers[0]);
        const data2 = getCitationEvolution(researchersPapers[1]);
        
        const allYears = [...new Set([
            ...data1.map(d => d.year),
            ...data2.map(d => d.year)
        ])].sort();
        
        return allYears.map(year => {
            const researcher1Data = data1.find(d => d.year === year) || { citations: 0 };
            const researcher2Data = data2.find(d => d.year === year) || { citations: 0 };
            
            return {
                year,
                [`${researchers[0].name}`]: researcher1Data.citations,
                [`${researchers[1].name}`]: researcher2Data.citations
            };
        });
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

    if (error || !researchers[0] || !researchers[1]) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Comparison Not Available</h2>
                        <p className="text-gray-600 mb-6">{error || "Unable to load researcher data for comparison."}</p>
                        <button
                            onClick={() => navigate('/researchers')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Back to Researchers
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const [researcher1, researcher2] = researchers;
    const [papers1, papers2] = researchersPapers;
    const combinedEvolutionData = getCombinedEvolutionData();
    const combinedTopicEvolutionData = getCombinedTopicEvolutionData();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/researchers')}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mb-4"
                    >
                        <ArrowLeft size={20} />
                        Back to Researchers
                    </button>
                
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Researcher Comparison</h1>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Researcher 1 Card */}
                            <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                                        <User2 size={32} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-blue-800 cursor-pointer hover:text-blue-600"
                                            onClick={() => handleResearcherClick(researcher1.authorid)}>
                                            {researcher1.name}
                                        </h2>
                                        <p className="text-blue-600">ID: {researcher1.authorid}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Researcher 2 Card */}
                            <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                                        <User2 size={32} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-green-800 cursor-pointer hover:text-green-600"
                                            onClick={() => handleResearcherClick(researcher2.authorid)}>
                                            {researcher2.name}
                                        </h2>
                                        <p className="text-green-600">ID: {researcher2.authorid}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Comparison */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-6">Key Metrics Comparison</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Papers Count */}
                        <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Papers Published</h4>
                            <div className="space-y-2">
                                <div className="bg-blue-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-blue-600">{researcher1.papercount || 0}</div>
                                </div>
                                <div className="bg-green-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-green-600">{researcher2.papercount || 0}</div>
                                </div>
                            </div>
                        </div>

                        {/* H-Index */}
                        <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">H-Index</h4>
                            <div className="space-y-2">
                                <div className="bg-blue-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-blue-600">{researcher1.hindex || 'N/A'}</div>
                                </div>
                                <div className="bg-green-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-green-600">{researcher2.hindex || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Citations */}
                        <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Total Citations</h4>
                            <div className="space-y-2">
                                <div className="bg-blue-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-blue-600">{researcher1.citationcount || 0}</div>
                                </div>
                                <div className="bg-green-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-green-600">{researcher2.citationcount || 0}</div>
                                </div>
                            </div>
                        </div>

                        {/* Collaborators */}
                        <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Collaborators</h4>
                            <div className="space-y-2">
                                <div className="bg-blue-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {researcher1.unique_coauthors_count || (researcher1.coauthors?.length || 0)}
                                    </div>
                                </div>
                                <div className="bg-green-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-green-600">
                                        {researcher2.unique_coauthors_count || (researcher2.coauthors?.length || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Impact Factor */}
                        <div className="text-center">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Research Impact</h4>
                            <div className="space-y-2">
                                <div className="bg-blue-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-blue-600">{impactGroupTopic[0].toFixed(2)}</div>
                                </div>
                                <div className="bg-green-100 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-green-600">{impactGroupTopic[1].toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Evolution Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="text-blue-600" size={20} />
                            Topic Evolution Comparison
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={combinedTopicEvolutionData}>
                                <XAxis dataKey="year" stroke="#4B5563" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Line 
                                    type="monotone" 
                                    dataKey={researcher1.name} 
                                    stroke="#3B82F6" 
                                    strokeWidth={2} 
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey={researcher2.name} 
                                    stroke="#10B981" 
                                    strokeWidth={2} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Quote className="text-green-600" size={20} />
                            Author Citations Evolution Comparison
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={combinedEvolutionData}>
                                <XAxis dataKey="year" stroke="#4B5563" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Line 
                                    type="monotone" 
                                    dataKey={researcher1.name} 
                                    stroke="#3B82F6" 
                                    strokeWidth={2} 
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey={researcher2.name} 
                                    stroke="#10B981" 
                                    strokeWidth={2} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ontology Topics Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">{researcher1.name} - Research Topics Ontology</h3>
                        <OntologyTopic topics={allTopics[0]} />
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-green-800 mb-4">{researcher2.name} - Research Topics Ontology</h3>
                        <OntologyTopic topics={allTopics[1]} />
                    </div>
                </div>

                {/* Recent Publications Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">
                            {researcher1.name} - Recent Publications ({papers1.length})
                        </h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {papers1.slice(0, 5).map((paper, index) => (
                                <div
                                    key={index}
                                    className="border-l-4 border-blue-200 pl-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors"
                                    onClick={() => handlePaperClick(paper)}
                                >
                                    <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">{paper.title}</h4>
                                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                        {paper.year && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {paper.year}
                                            </span>
                                        )}
                                        {paper.citationcount !== undefined && (
                                            <span className="flex items-center gap-1">
                                                <Quote size={12} />
                                                {paper.citationcount} citations
                                            </span>
                                        )}
                                        {paper.sjrQuartile && paper.sjrQuartile !== "No Data" && (
                                            <span className="flex items-center gap-1">
                                                <ArrowUpNarrowWide size={12} />
                                                SJR: {paper.sjrQuartile}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {papers1.length > 5 && (
                                <p className="text-sm text-gray-500 text-center">
                                    ...and {papers1.length - 5} more publications
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-green-800 mb-4">
                            {researcher2.name} - Recent Publications ({papers2.length})
                        </h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {papers2.slice(0, 5).map((paper, index) => (
                                <div
                                    key={index}
                                    className="border-l-4 border-green-200 pl-4 py-3 hover:bg-green-50 cursor-pointer transition-colors"
                                    onClick={() => handlePaperClick(paper)}
                                >
                                    <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">{paper.title}</h4>
                                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                        {paper.year && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {paper.year}
                                            </span>
                                        )}
                                        {paper.citationcount !== undefined && (
                                            <span className="flex items-center gap-1">
                                                <Quote size={12} />
                                                {paper.citationcount} citations
                                            </span>
                                        )}
                                        {paper.sjrQuartile && paper.sjrQuartile !== "No Data" && (
                                            <span className="flex items-center gap-1">
                                                <ArrowUpNarrowWide size={12} />
                                                SJR: {paper.sjrQuartile}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {papers2.length > 5 && (
                                <p className="text-sm text-gray-500 text-center">
                                    ...and {papers2.length - 5} more publications
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResearcherComparison;