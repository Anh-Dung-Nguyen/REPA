import React from "react";

const Header = () => (
    <header className = "bg-blue-600 text-white p-4 shadow-md rounded-b-lg">
        <div className = "container mx-auto flex justify-between items-center">
            <h1 className = "text-2xl font-bold">REPA Dashboard</h1>
            <p>Research Performance Analyzer - Computer Science Researchers</p>
        </div>
    </header>
);

export default Header;