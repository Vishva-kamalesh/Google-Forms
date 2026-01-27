import React from 'react';

function LoadingSpinner({ size = 'md' }) {
  const sizeClasses = {
    small: 'h-5 w-5',
    md: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-2 border-primary-500 border-t-transparent ${
          sizeClasses[size] || sizeClasses.md
        }`}
      />
    </div>
  );
}

export default LoadingSpinner;
