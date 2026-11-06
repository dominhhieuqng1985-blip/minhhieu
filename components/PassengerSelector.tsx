
import React, { useState, useRef, useEffect } from 'react';
import { type Passengers } from '../types';
import { UserIcon, ChildIcon, InfantIcon, MinusIcon, PlusIcon, CheckIcon } from './icons/Icons';

interface PassengerSelectorProps {
  value: Passengers;
  onChange: (newValue: Passengers) => void;
}

const Counter: React.FC<{
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
    min?: number;
    max?: number;
}> = ({ value, onIncrement, onDecrement, min = 0, max = 9 }) => {
    return (
        <div className="flex items-center space-x-3">
            <button
                type="button"
                onClick={onDecrement}
                disabled={value <= min}
                className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <MinusIcon className="w-4 h-4 pointer-events-none" />
            </button>
            <span className="text-lg font-semibold w-6 text-center">{value}</span>
            <button
                type="button"
                onClick={onIncrement}
                disabled={value >= max}
                className="w-8 h-8 flex items-center justify-center border border-green-500 bg-green-50 dark:bg-green-900/50 rounded-full text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <PlusIcon className="w-4 h-4 pointer-events-none" />
            </button>
        </div>
    );
};

const PassengerSelector: React.FC<PassengerSelectorProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const totalPassengers = value.adults + value.children + value.infants;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);
    
    const handleCountChange = (type: keyof Passengers, delta: number) => {
        const newValue = { ...value };
        newValue[type] += delta;

        // Basic validation
        if (newValue.adults < 1) newValue.adults = 1;
        if (newValue.children < 0) newValue.children = 0;
        if (newValue.infants < 0) newValue.infants = 0;
        
        // Infants cannot be more than adults
        if (newValue.infants > newValue.adults) {
            newValue.infants = newValue.adults;
        }

        // Max 9 passengers total (excluding infants for some airlines, but we simplify here)
        const currentTotal = newValue.adults + newValue.children;
        if (currentTotal > 9) return; // Prevent change if total exceeds 9

        onChange(newValue);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 bg-transparent focus:outline-none font-semibold text-center"
            >
                {totalPassengers}
            </button>
            {isOpen && (
                <div className="absolute z-30 top-full mt-2 w-80 right-0 bg-[var(--card-bg-color)] border border-[var(--border-color)] rounded-lg shadow-lg p-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center">
                                <UserIcon className="w-6 h-6 mr-3 text-gray-500" />
                                <div>
                                    <p className="font-semibold">Người lớn</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">12 tuổi trở lên</p>
                                </div>
                            </div>
                            <Counter 
                                value={value.adults}
                                onIncrement={() => handleCountChange('adults', 1)}
                                onDecrement={() => handleCountChange('adults', -1)}
                                min={1}
                                max={9 - value.children}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <ChildIcon className="w-6 h-6 mr-3 text-gray-500" />
                                <div>
                                    <p className="font-semibold">Trẻ em</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Từ 2 đến dưới 12 tuổi</p>
                                </div>
                            </div>
                            <Counter 
                                value={value.children}
                                onIncrement={() => handleCountChange('children', 1)}
                                onDecrement={() => handleCountChange('children', -1)}
                                max={9 - value.adults}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <InfantIcon className="w-6 h-6 mr-3 text-gray-500" />
                                <div>
                                    <p className="font-semibold">Em bé</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Nhỏ hơn 2 tuổi</p>
                                </div>
                            </div>
                            <Counter 
                                value={value.infants}
                                onIncrement={() => handleCountChange('infants', 1)}
                                onDecrement={() => handleCountChange('infants', -1)}
                                max={value.adults}
                            />
                        </div>
                    </div>
                    <div className="border-t border-[var(--border-color)] mt-4 pt-3 text-right">
                         <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="bg-orange-500 text-white font-bold py-2 px-6 rounded-md hover:bg-orange-600 transition-colors"
                        >
                           <CheckIcon className="inline w-4 h-4 mr-1 pointer-events-none" /> CHỌN
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassengerSelector;