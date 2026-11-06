
import React from 'react';
import { PriceInsights } from '../types';
import { InfoIcon, CheckCircleIcon } from './icons/Icons';

interface PriceInsightsWidgetProps {
    insights: PriceInsights;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const PriceInsightsWidget: React.FC<PriceInsightsWidgetProps> = ({ insights }) => {
    const { lowest_price, price_level, typical_price_range } = insights;
    
    // Normalize range for the bar display
    const lowEnd = typical_price_range[0] * 0.8;
    const highEnd = typical_price_range[1] * 1.2;
    const totalRange = highEnd - lowEnd;
    
    const getPercent = (val: number) => {
        const pct = ((val - lowEnd) / totalRange) * 100;
        return Math.max(0, Math.min(100, pct));
    };

    const currentPos = getPercent(lowest_price);
    const typicalStart = getPercent(typical_price_range[0]);
    const typicalEnd = getPercent(typical_price_range[1]);
    const typicalWidth = typicalEnd - typicalStart;

    let levelText = '';
    let levelColor = '';
    let levelIcon = null;

    switch (price_level) {
        case 'low':
            levelText = 'Giá hiện tại đang thấp';
            levelColor = 'text-green-600';
            levelIcon = <CheckCircleIcon className="w-5 h-5 text-green-600" />;
            break;
        case 'typical':
            levelText = 'Giá ở mức trung bình';
            levelColor = 'text-yellow-600';
            levelIcon = <InfoIcon className="w-5 h-5 text-yellow-600" />;
            break;
        case 'high':
            levelText = 'Giá đang cao hơn bình thường';
            levelColor = 'text-red-600';
            levelIcon = <InfoIcon className="w-5 h-5 text-red-600" />;
            break;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {levelIcon} {levelText}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Giá thấp nhất hiện tại là <b>{formatCurrency(lowest_price)}</b>.
                    </p>
                </div>
            </div>

            {/* Price Bar Visualization */}
            <div className="relative h-8 w-full mt-6 mb-2">
                {/* Background Track */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    {/* Low Section */}
                    <div style={{ width: `${typicalStart}%` }} className="h-full bg-green-200 dark:bg-green-900/50"></div>
                    {/* Typical Section */}
                    <div style={{ width: `${typicalWidth}%` }} className="h-full bg-yellow-200 dark:bg-yellow-900/50"></div>
                    {/* High Section */}
                    <div className="flex-grow h-full bg-red-200 dark:bg-red-900/50"></div>
                </div>

                {/* Markers */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 border-2 border-white dark:border-gray-800 rounded-full shadow-lg z-10 transition-all duration-500"
                    style={{ left: `calc(${currentPos}% - 8px)` }}
                >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                        Bạn ở đây
                    </div>
                </div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                <div className="text-center w-1/3">
                    <span className="block mb-1 text-green-600">Thấp</span>
                    {formatCurrency(lowEnd)}
                </div>
                <div className="text-center w-1/3">
                    <span className="block mb-1 text-yellow-600">Trung bình</span>
                    {formatCurrency(typical_price_range[0])} - {formatCurrency(typical_price_range[1])}
                </div>
                <div className="text-center w-1/3">
                    <span className="block mb-1 text-red-600">Cao</span>
                    {formatCurrency(highEnd)}
                </div>
            </div>
        </div>
    );
};

export default PriceInsightsWidget;
