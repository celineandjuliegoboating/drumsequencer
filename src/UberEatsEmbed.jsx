import React from 'react';

const UberEatsEmbed = () => {
  return (
    <div className="w-80 h-full bg-gray-200 border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white p-2">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src="https://www.ubereats.com"
          frameBorder="0"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default UberEatsEmbed;