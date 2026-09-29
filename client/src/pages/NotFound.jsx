import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Home } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <div className="w-20 h-20 rounded-full bg-brand-900/30 text-brand-400 flex items-center justify-center mb-4 shadow-sm">
        <Utensils className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-[#f5ede6]">404 — Page Not Found</h1>
      <p className="text-sm text-[#a89f91] mt-2 max-w-md">
        Oops! The page you are looking for does not exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="mt-6 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors shadow-md min-h-touch inline-flex items-center space-x-2"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </button>
    </div>
  );
};

export default NotFound;
