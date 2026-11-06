
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { type Airport } from '../types';
import { AIRPORTS, REGIONAL_AIRPORTS } from '../constants';
import { LocationMarkerIcon, CloseIcon, SearchIcon } from './icons/Icons';

interface AirportModalProps {
    onClose: () => void;
    onSelect: (airport: Airport) => void;
    title: string;
}

const AirportModal: React.FC<AirportModalProps> = ({ onClose, onSelect, title }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('Việt Nam');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const displayedAirports = useMemo(() => {
        if (searchTerm) {
            return AIRPORTS.filter(airport =>
                airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                airport.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return REGIONAL_AIRPORTS[activeTab as keyof typeof REGIONAL_AIRPORTS] || [];
    }, [searchTerm, activeTab]);

    const handleSelectAirport = (airport: Airport) => {
        onSelect(airport);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
                ref={modalRef}
                className="bg-[var(--card-bg-color)] rounded-lg shadow-xl w-full max-w-3xl transform transition-all"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
                    <div className="flex items-center">
                        <LocationMarkerIcon className="w-6 h-6 text-orange-500" />
                        <h2 className="text-xl font-bold ml-2">{title}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Search and Tabs */}
                <div className="p-4 space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Nhập thành phố / mã sân bay"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <LocationMarkerIcon className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                    
                    {!searchTerm && (
                        <div className="flex flex-wrap items-center border-b border-[var(--border-color)]">
                            {Object.keys(REGIONAL_AIRPORTS).map(region => (
                                <button
                                    key={region}
                                    onClick={() => setActiveTab(region)}
                                    className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 ${activeTab === region ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'}`}
                                >
                                    {region}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Airport List */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {displayedAirports.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            {displayedAirports.map(airport => {
                                 const nameParts = airport.name.match(/(.*?)\s*\(([^)]+)\)/);
                                 const cityName = nameParts ? nameParts[1].trim() : airport.name;

                                return (
                                <div
                                    key={airport.id}
                                    onClick={() => handleSelectAirport(airport)}
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    <span>{cityName}</span>
                                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{airport.id}</span>
                                </div>
                            )})}
                        </div>
                    ) : (
                         <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>Không tìm thấy sân bay phù hợp.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


interface AirportSelectorProps {
  id: string;
  selectedAirportId: string;
  onSelectAirport: (id: string) => void;
  placeholder?: string;
  className?: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const AirportSelector: React.FC<AirportSelectorProps> = ({ id, selectedAirportId, onSelectAirport, placeholder, className, isOpen, onOpen, onClose }) => {
  const selectedAirport = AIRPORTS.find(a => a.id === selectedAirportId);

  const handleSelect = (airport: Airport) => {
    onSelectAirport(airport.id);
  };
  
  const getDisplayName = () => {
    if (!selectedAirport) return placeholder || '';
    const nameParts = selectedAirport.name.match(/(.*?)\s*\(([^)]+)\)/);
    let cityName = nameParts ? nameParts[1].trim() : selectedAirport.name;
    
    // Logic rút gọn tên:
    // 1. Nếu có dấu phẩy (VD: Long Thành, Đồng Nai), lấy phần đầu
    if (cityName.includes(',')) {
        cityName = cityName.split(',')[0].trim();
    }
    // 2. Bỏ chữ TP. nếu có
    cityName = cityName.replace(/^TP\.\s*/, '');
    
    return `${cityName} (${selectedAirport.id})`;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={onOpen}
        className="w-full p-2 bg-transparent focus:outline-none text-left truncate"
      >
        {getDisplayName()}
      </button>

      {isOpen && createPortal(
        <AirportModal 
            onClose={onClose} 
            onSelect={handleSelect}
            title={placeholder || 'Chọn sân bay'}
        />,
        document.body
      )}
    </div>
  );
};

export default AirportSelector;
