import React from "react";
import {Search} from 'lucide-react';

const SearchBar = ({searchTerm, setSearchTerm, onSearch}) => (
    <div className = "bg-white rounded-lg shadow-md p-6 mb-6">
        <div className = "flex gap-4">
            <div className = "flex-1 relative">
                <Search className = "absolute left-3 top-3 h-5 w-5 text-gray-400"/>
                <input 
                    type = "text"
                    placeholder = "Search researchers by name ..."
                    className = "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"                    value = {searchTerm}
                    onChange = {(e) => setSearchTerm(e.target.value)}
                    onKeyPress = {(e) => e.key === "Enter" && onSearch()}
                />
                
            </div>
            <button 
                onClick = {onSearch} 
                className = "bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Search className = "h-4 w-4" />
                    Search
            </button>
        </div>
    </div>
);

export default SearchBar;