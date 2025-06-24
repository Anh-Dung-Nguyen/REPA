import React, { Component } from 'react';

class Footer extends Component {
  render() {
    return (
      <footer className = "footer bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 shadow-lg">
        <div className = "footer-content container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} OpenCEMS. All rights reserved.</p>
          <nav>
            <a href="/about">About</a> | <a href="/contact">Contact</a> | <a href="/privacy">Privacy</a>
          </nav>
        </div>
      </footer>
    );
  }
}

export default Footer;
