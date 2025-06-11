import React, {useState, useEffect} from 'react';
import './index.css';
import axios from 'axios';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import MetricCard from './components/MetricCard';
import FieldCard from './components/FieldCard';
import ResearcherCard from './components/ResearcherCard';
import ResearcherDetail from './components/ResearcherDetail';
import { Users, BookOpen, BookIcon, LayoutDashboard, User2, Paperclip } from 'lucide-react';

function App() {
  const [selectedResearcher, setSelectedResearcher] = useState(null);
  const [selectedResearchTitle, setSelectedResearchTitle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [researcherStats, setResearcherStats] = useState({
    totalResearchers: 0,
    totalPapers: 0,
    totalAnnotatedPapers: 0,
    totalSpecificTopics: 0,
  });
  const [searchResults, setSearchResults] = useState([]);
  const [currentTab, setCurrentTab] = useState("Overview");

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

  const handleViewDetails = async (researcher) => {
    setSelectedResearcher(researcher);

    try {
      const res = await axios.get(`http://localhost:8000/authors_papers_annotations/${researcher.authorid}`);
      
      console.log("API Response:", res.data);

      const papers = Array.isArray(res.data[0]?.papers)
        ? res.data[0].papers.map(paper => ({title: paper.title, corpusid: paper.annotation.corpusid}))
        : [];

      console.log("Extracted paper titles:", papers);

      setSelectedResearchTitle(papers);    
    } catch (error) {
      console.error("Error fetching titles", error);
      setSelectedResearchTitle([]);
    }
  };

  const handleCloseDetails = () => {
    setSelectedResearcher(null);
  }

  const handleCompare = (researcher) => {
    console.log("Compare researcher: ", researcher.name);
  };

  const handleTitle = async (paper) => {
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

  return (
    <div>
      <Header />
      {/* Tab Selector */}
      <div className="container mx-auto px-4 pt-6">
        <div className = "bg-white rounded-lg shadow-md mb-6">
          <div className = 'flex border-b border-gray-200'>
            <button
              onClick={() => setCurrentTab('Overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded mx-auto ${currentTab === 'Overview' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50': 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <LayoutDashboard size = {18} />
              <strong>Overview</strong>
            </button>
            <button
              onClick={() => setCurrentTab('Researchers')}
              className={`flex items-center gap-2 px-4 py-2 rounded mx-auto ${currentTab === 'Researchers' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50': 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <User2 size = {18}/>
              <strong>Researchers</strong>
            </button>
            <button
              onClick={() => setCurrentTab('Research Fields')}
              className={`flex items-center gap-2 px-4 py-2 rounded mx-auto ${currentTab === 'Research Fields' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50': 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <BookOpen size = {18}/>
              <strong>Research Fields</strong>
            </button>
          </div>
        </div>
      </div>
      <main className = 'container mx-auto px-4 py-6'>
        {currentTab === "Overview" && (
          <div className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'>
            <MetricCard 
              title = "Total Researchers" 
              value = {researcherStats.totalResearchers}
              icon = {Users}
              color = "#3B82F6"/>
            <MetricCard 
              title = "Total Papers" 
              value = {researcherStats.totalPapers}
              icon = {BookOpen}
              color = "#10B981"/>
            <MetricCard 
              title = "Total Annotated Papers" 
              value = {researcherStats.totalAnnotatedPapers}
              icon = {BookIcon}
              color = "#8B5CF6"/>
            <MetricCard 
              title = "Total Specific Topics" 
              value = {researcherStats.totalSpecificTopics}
              icon = {Paperclip}
              color = "#ffA500"/>
          </div>
        )}
            
        {currentTab === "Researchers" && (
          <>
            <SearchBar
              searchTerm = {searchTerm}
              setSearchTerm = {setSearchTerm}
              onSearch = {handleSearch}
            />

            {loading && (
              <div className = 'flex justify-center mt-6'>
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {searchResults.map((author) => (
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

        {currentTab === "Research Fields" && (
          <div className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'>
            <FieldCard />
          </div>
        )}
      </main>

      {selectedResearcher && Array.isArray(selectedResearchTitle) && (
        <ResearcherDetail
          researcher={selectedResearcher}
          researcherTitle={selectedResearchTitle}
          onClose={handleCloseDetails}
          handleTitle={handleTitle}
        />
      )}
    </div>      
  );
}

export default App;