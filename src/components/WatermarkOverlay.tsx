import React from 'react';
import { WatermarkSettings } from '../types/adConfig';

interface WatermarkOverlayProps {
  settings: WatermarkSettings;
  className?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ settings, className = '' }) => {
  if (!settings.enabled || !settings.logoUrl) return null;

  const positionClasses = {
    'top-right': 'top-3 right-3 sm:top-4 sm:right-4',
    'top-left': 'top-3 left-3 sm:top-4 sm:left-4',
    'bottom-right': 'bottom-10 right-3 sm:bottom-12 sm:right-4',
    'bottom-left': 'bottom-10 left-3 sm:bottom-12 sm:left-4',
  }[settings.position];

  const sizeClasses = {
    sm: 'w-8 h-8 sm:w-10 sm:h-10',
    md: 'w-10 h-10 sm:w-14 sm:h-14',
    lg: 'w-14 h-14 sm:w-20 sm:h-20',
  }[settings.size];

  return (
    <div
      className={`absolute z-20 pointer-events-auto transition-opacity duration-300 select-none ${positionClasses} ${className}`}
      style={{ opacity: settings.opacity }}
    >
      <a
        href={settings.targetUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        title="Minh Hiếu TuBe"
        className="block group"
      >
        <img
          src={settings.logoUrl}
          alt="Watermark Logo"
          referrerPolicy="no-referrer"
          className={`${sizeClasses} object-contain rounded-full shadow-lg border border-white/20 filter drop-shadow group-hover:scale-105 group-hover:opacity-100 transition-all`}
        />
      </a>
    </div>
  );
};
