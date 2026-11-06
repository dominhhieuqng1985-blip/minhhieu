import React from 'react';

export const VietjetLogo = () => (
    <div className="flex items-center space-x-2">
        <svg width="32" height="32" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="#DA251D"/>
            <path d="M25 50 L75 25 L75 75 Z" fill="white"/>
        </svg>
        <span className="text-white text-2xl font-bold tracking-tight">Vietjet Air</span>
    </div>
);

export const PlaneIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

export const SwapIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
);
