import React from 'react';

const BackgroundParticles: React.FC = () => {
  return (
    <div className="background-particles">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="bg-particle" />
      ))}
    </div>
  );
};

export default BackgroundParticles;
