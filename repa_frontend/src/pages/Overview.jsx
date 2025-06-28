import React, {useState, useEffect} from 'react';
import axios from 'axios';
import MetricCard from '../components/MetricCard';
import TopResearchFieldsChart from '../components/TopResearchFieldChart';
import HIndexRankingTable from '../components/HIndexRankingTable';
import PaperRankingTable from '../components/PaperRankingTable';
import { Users, BookOpen, BookIcon, Paperclip } from 'lucide-react';

function Overview() {
    const [researcherStats, setResearcherStats] = useState({
        totalResearchers: 0,
        totalPapers: 0,
        totalAnnotatedPapers: 0,
        totalSpecificTopics: 0,
    });
    useEffect(() => {
        const fetchStats = async() => {
            try {
                const researcher = await axios.get('http://localhost:8000/authors/count');
                const paper = await axios.get('http://localhost:8000/papers/count');
                const annotated_paper = await axios.get('http://localhost:8000/annotated_papers/count');
                const specific_topic = await axios.get('http://localhost:8000/specific_topics/count');
                setResearcherStats({
                    totalResearchers: researcher.data.totalAuthors,
                    totalPapers: paper.data.totalPapers,
                    totalAnnotatedPapers: annotated_paper.data.totalAnnotatedPapers,
                    totalSpecificTopics: specific_topic.data.specific_topics,
                });
            } catch (error) {
                console.error("Error fetching stats: ", error);
            }
        };

        fetchStats();
    }, []);

    const [topFieldsData, setTopFieldsData] = useState([]);
    useEffect(() => {
        const fetchTopFields = async () => {
            try {
                const res = await axios.get('http://localhost:8000/specific_topics/topic_author_counts');

                const sortedTop50 = res.data.topics
                .map(item => ({
                    name: item.topic,          
                    researchers: item.count 
                }))
                .sort((a, b) => b.researchers - a.researchers)
                .slice(0, 10);

            setTopFieldsData(sortedTop50);

            } catch (error) {
                console.error("Error fetching top research fields:", error);
            }
        };

        fetchTopFields();
    }, []);

    const [hindexAuthor, setHindexAuthor] = useState([]);
    useEffect(() => {
        const fetchHindex = async() => {
            try {
                const hindex = await axios.get('http://localhost:8000/authors/hindex');
                setHindexAuthor(hindex.data.results || []);
            } catch (error) {
                console.error("Error fetching h-index: ", error);
            }
        };

        fetchHindex();
    }, []);

    const [citationPaper, setCitationPaper] = useState([]);
    useEffect(() => {
        const fetchCitation = async() => {
            try {
                const citation = await axios.get('http://localhost:8000/papers_with_annotations/citation_count');
                setCitationPaper(citation.data.results || []);
            } catch (error) {
                console.error("Error fetching citation: ", error);
            }
        };

        fetchCitation();
    }, []);
    
    return (
        <>
            <div className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'>
                <MetricCard title = "Total Researchers" value = {researcherStats.totalResearchers} icon = {Users} color = "#3B82F6" />
                <MetricCard title = "Total Papers" value = {researcherStats.totalPapers} icon = {BookOpen} color = "#10B981" />
                <MetricCard title = "Total Annotated Papers" value = {researcherStats.totalAnnotatedPapers} icon = {BookIcon} color = "#8B5CF6" />
                <MetricCard title = "Total Specific Topics" value = {researcherStats.totalSpecificTopics} icon = {Paperclip} color = "#ffA500" />
            </div>

            {(topFieldsData.length > 0 || hindexAuthor.length > 0 || citationPaper.length > 0) && (
                <div className = "flex flex-col lg:flex-row gap-6 mb-6">
                    {topFieldsData.length > 0 && (
                        <div className = "w-full lg:w-1/2">
                            <div className = "bg-white shadow-md rounded-lg p-4 h-full">
                                <TopResearchFieldsChart fieldsData = {topFieldsData} height = {550} />
                            </div>
                        </div>
                    )}
                    <div className = "w-full lg:w-1/2 flex flex-col gap-6">
                        {hindexAuthor.length > 0 && (
                            <div className = "h-[300px] overflow-y-auto bg-white shadow-md rounded-lg p-4">
                                <HIndexRankingTable data = {hindexAuthor} />
                            </div>
                        )}
                        {citationPaper.length > 0 && (
                            <div className = "h-[300px] overflow-y-auto bg-white shadow-md rounded-lg p-4">
                                <PaperRankingTable data = {citationPaper} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default Overview;