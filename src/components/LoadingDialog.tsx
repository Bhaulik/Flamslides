import React from 'react';

const LoadingDialog: React.FC = () => {
  return (
    <div className="loading-dialog-overlay">
      <div className="loading-dialog">
        <div className="flame-background">
          <div className="particles">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="particle" />
            ))}
          </div>
          <div className="loading-content">
            <h2>Generating Your Slideshow</h2>
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
            </div>
            <p>Please wait while we create your presentation...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingDialog;
