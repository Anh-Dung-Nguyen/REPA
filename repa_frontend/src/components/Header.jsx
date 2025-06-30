import React from "react";
import { Link } from "react-router-dom";

const Header = () => (
    <header className="bg-blue-600 text-white p-4 shadow-md rounded-b-lg">
        <div className="container mx-auto flex justify-between items-center">
            <Link to="/overview" className="text-2xl font-bold">
                REPA Dashboard
            </Link>
            <p>Research Performance Analyzer - Computer Science Researchers</p>
        </div>
    </header>
);

export default Header;
