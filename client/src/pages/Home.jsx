import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          Build real-time, collaborative forms in minutes.
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Google Forms–like experience with live collaboration, instant analytics,
          and beautiful UX. Perfect for surveys, feedback, and registrations.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="btn-primary w-full sm:w-auto">
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="btn-secondary w-full sm:w-auto flex items-center justify-center"
          >
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
