import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-[#0e0d0c] border-t border-[#2a2724] mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[#787065]">
          &copy; {new Date().getFullYear()} Savora Inc. All rights reserved.
        </p>
        <div className="flex items-center space-x-6 text-xs text-[#787065]">
          <Link to="/privacy" className="hover:text-[#f5ede6] transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-[#f5ede6] transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
