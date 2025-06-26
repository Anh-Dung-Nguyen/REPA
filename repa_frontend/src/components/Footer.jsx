import React, { Component } from 'react';

class Footer extends Component {
  render() {
    return (
      <footer className="bg-gray-800 text-white p-4 text-center mt-8 rounded-t-lg">
        <div className="container mx-auto">
          <p>&copy; {new Date().getFullYear()} OpenCEMS. All rights reserved.</p>
        </div>
      </footer>
    );
  }
}

export default Footer; 
