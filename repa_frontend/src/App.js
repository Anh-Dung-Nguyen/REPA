import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookIcon, BookOpen, LayoutDashboard, User2 } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import About from './pages/About';
import NotFound from './pages/NotFound';
import Overview from './pages/Overview';
import Researchers from './pages/Researchers';
import ResearchSpecificFields from './pages/ResearchSpecificFields';
import SpecificFieldDetailPage from './pages/SpecificFieldDetailPage';
import ResearcherDetailPage from './pages/ResearcherDetailPage';
import ResearchAllFields from './pages/ResearchAllFields';

function App() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className = 'flex flex-col min-h-screen'>
      <Header />
      
      <div className = "container mx-auto px-4 pt-6">
        <div className = "bg-white rounded-lg shadow-md mb-6">
          <div className = 'flex border-b border-gray-200'>
            <Link
              to = "/overview"
              className = {`flex items-center gap-2 px-4 py-2 rounded mx-auto ${
                currentPath === '/overview' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50': 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard size = {18} />
              <strong>Overview</strong>
            </Link>

            <Link
              to = "/researchers"
              className = {`flex items-center gap-2 px-4 py-2 rounded mx-auto ${
                currentPath === '/researchers' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50': 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User2 size = {18} />
              <strong>Researchers</strong>
            </Link>

            <Link
              to = "/research-fields"
              className = {`flex items-center gap-2 px-4 py-2 rounded mx-auto ${
                currentPath === '/research-fields' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50': 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BookIcon size = {18} />
              <strong>Research Fields</strong>
            </Link>

            <Link
              to = "/research-specific-fields"
              className = {`flex items-center gap-2 px-4 py-2 rounded mx-auto ${
                currentPath === '/research-specific-fields' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50': 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BookOpen size = {18} />
              <strong>Research Specific Fields</strong>
            </Link>
            
            <Link
              to = "/about"
              className = {`flex items-center gap-2 px-4 py-2 rounded mx-auto ${
                currentPath === '/about'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <strong>About</strong>
            </Link>

          </div>
        </div>
      </div>

      <main className = 'container mx-auto px-4 py-6 flex-1'>
        <Routes>
          <Route path = "/" element = {<Overview />} /> 
          <Route path = "/overview" element = {<Overview />} />
          <Route path = "/researchers" element = {<Researchers />} />
          <Route path = "/research-specific-fields" element = {<ResearchSpecificFields />} />
          <Route path = "/research-fields" element = {<ResearchAllFields />} />
          <Route path = "/about" element = {<About />} />
          <Route path = "/researchers/:authorId" element = {<ResearcherDetailPage />} />
          <Route path = "*" element = {<NotFound />} /> 
          <Route path = "/research-specific-fields/:topicName" element = {<SpecificFieldDetailPage/>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}