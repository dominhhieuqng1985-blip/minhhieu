
import React from 'react';
import { AncillaryOption } from '../types';
import { BriefcaseIcon } from './icons/Icons';

interface AncillaryServicesProps {
    title: string;
    options: AncillaryOption[];
    selectedOptionId?: string;
    onSelect: (option: AncillaryOption | null) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const AncillaryServices: React.FC<AncillaryServicesProps> = ({ title, options, selectedOptionId, onSelect }) => {
    if (options.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <h3 className="text-xl font-bold border-b border-[var(--border-color)] pb-3 mb-4 flex items-center gap-3"><BriefcaseIcon className="w-6 h-6 text-blue-600"/>{title}</h3>
            <div className="space-y-3">
                {/* No extra baggage option */}
                <div
                    onClick={() => onSelect(null)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-300 flex items-center ${
                        !selectedOptionId ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-200' : 'border-gray-200 dark:border-gray-600 hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    <input
                        type="radio"
                        name={title}
                        checked={!selectedOptionId}
                        readOnly
                        className="h-5 w-5 text-red-600 border-gray-300 focus:ring-red-500"
                    />
                    <div className="ml-4 flex-grow">
                        <span className="font-semibold">Không mua thêm</span>
                    </div>
                </div>

                {/* Other options */}
                {options.map(option => {
                    const isSelected = selectedOptionId === option.id;
                    return (
                        <div
                            key={option.id}
                            onClick={() => onSelect(option)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all duration-300 flex items-center ${
                                isSelected ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-200' : 'border-gray-200 dark:border-gray-600 hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <input
                                type="radio"
                                name={title}
                                checked={isSelected}
                                readOnly
                                className="h-5 w-5 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <div className="ml-4 flex-grow flex justify-between items-center">
                                <div>
                                    <span className="font-semibold">{option.name}</span>
                                    {option.description && <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>}
                                </div>
                                <span className="font-bold text-red-600">{formatCurrency(option.price)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AncillaryServices;
