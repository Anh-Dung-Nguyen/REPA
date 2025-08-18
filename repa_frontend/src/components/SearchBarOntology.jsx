import React from "react";
import { Search } from 'lucide-react';

const SearchBarOntology = ({ searchTerm, setSearchTerm, onSearch }) => (
    <div className="flex-1 relative min-w-[150px] max-w-xs"> 
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
      <input 
        type="text"
        placeholder="Search by name..."
        className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"                    
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && onSearch(searchTerm)} 
      />
    </div>
);

export default SearchBarOntology;
