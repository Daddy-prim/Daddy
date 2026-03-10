import React from 'react';

export const Logo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#009688"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M140 100C117.909 100 100 117.909 100 140V372C100 394.091 117.909 412 140 412H180C195.18 412 209.21 403.362 216.056 389.778L332.178 159.142V372C332.178 394.091 350.087 412 372.178 412H390C412.091 412 430 394.091 430 372V140C430 117.909 412.091 100 390 100H350C334.82 100 320.79 108.638 313.944 122.222L197.822 352.858V140C197.822 117.909 179.913 100 157.822 100H140Z" fill="#1A1B2F"/>
  </svg>
);