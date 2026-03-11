import React from 'react';

export const Logo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M190 140 L 380 260 L 120 380 L 200 270 Z" 
      fill="#B8D935" 
      stroke="#B8D935" 
      strokeWidth="40" 
      strokeLinejoin="round" 
      strokeLinecap="round" 
    />
  </svg>
);