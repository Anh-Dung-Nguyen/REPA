import React, {useState, useEffect} from 'react';
import './index.css';
import axios from 'axios';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import MetricCard from './components/MetricCard';
import ResearcherCard from './components/ResearcherCard';
import { Users, BookOpen, BookIcon, LayoutDashboard, User2 } from 'lucide-react';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [researcherStats, setResearcherStats] = useState({
    totalResearchers: 0,
    totalPapers: 0,
    totalAnnotatedPapers: 0,
  });
  const [searchResults, setSearchResults] = useState([]);
  const [currentTab, setCurrentTab] = useState("Overview");

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
        return;
    }
    try {
      const response = await axios.get(`http://localhost:8000/authors/search`, {
        params: { name: searchTerm }
      });
      console.log("Search results: ", response.data.authors);
      setSearchResults(response.data.authors || []);
    } catch (error) {
      console.error("Error searching authors:", error);
    }
  };

  const handleViewDetails = (researcher) => {
    console.log("Researcher: ", researcher);
  };

  const handleCompare = (researcher) => {
    console.log("Compare researcher: ", researcher.name);
  };

  useEffect(() => {
    const fetchStats = async() => {
      try {
        const researcher = await axios.get('http://localhost:8000/authors/count');
        const paper = await axios.get('http://localhost:8000/papers/count');
        const annotated_paper = await axios.get('http://localhost:8000/annotated_papers/count');
        setResearcherStats({
          totalResearchers: researcher.data.totalAuthors,
          totalPapers: paper.data.totalPapers,
          totalAnnotatedPapers: annotated_paper.data.totalAnnotatedPapers,
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
          </div>
        )}
            
        {currentTab === "Researchers" && (
          <>
            <SearchBar
              searchTerm = {searchTerm}
              setSearchTerm = {setSearchTerm}
              onSearch = {handleSearch}
            />

            {searchResults.length > 0 && (
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
      </main>
    </div>      
  );
}

export default App;