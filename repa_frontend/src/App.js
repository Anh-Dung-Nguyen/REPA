import React, {useState, useEffect} from 'react';
import axios from 'axios';
import './index.css';
import Header from './components/Header';
import SearchBar from './components/SearchBar';

function App() {
  return (
    <div>
      <Header />
      <SearchBar />
    </div>
  );
}
export default App;