
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SearchParams, MonthDayFlightData, AdminFeeConfig } from '../types';
import { fetchDayFlightData, checkCacheForDate } from '../services/flightService';
import { calculateAdditivePrice } from '../services/adminService';
import { getLunarDate } from '../utils/lunarCalc';
import { ChevronLeftIcon, ChevronRightIcon, PlaneIcon, CalendarIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';

interface MonthFlightMatrixProps {
    searchParams: SearchParams;
    onSelectDate: (date: string) => void;
    feeConfig?: AdminFeeConfig | null; // Pass fee config to calculate total price
}

// Helper to get ONLY city name for the specific UI design (e.g. "Hồ Chí Minh")
const getCityNameOnly = (code: string) => {
    const airport = AIRPORTS.find(a => a.id === code);
    if (!airport) return code;
    let name = airport.name.replace(/\(.*\)/, '').trim();
    name = name.replace(/^TP\.\s*/, ''); 
    return name;
};

// Standard helper for header display
const getCityName = (code: string) => {
    const airport = AIRPORTS.find(a => a.id === code);
    if (!airport) return code;
    const match = airport.name.match(/(.*?)\s*\(/);
    return match ? match[1].trim() : airport.name;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
};

// A status tracker for each day to handle loading states individually
type DayStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

const MonthFlightMatrix: React.FC<MonthFlightMatrixProps> = ({ searchParams, onSelectDate, feeConfig }) => {
    // Initialize based on search params
    const initialDate = new Date(searchParams.outbound_date);
    const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    const [monthData, setMonthData] = useState<Record<string, MonthDayFlightData>>({});
    const [statuses, setStatuses] = useState<Record<string, DayStatus>>({});
    const abortControllerRef = useRef<AbortController | null>(null);

    const { month, year, daysInMonth, startDayOffset } = useMemo(() => {
        const m = viewDate.getMonth();
        const y = viewDate.getFullYear();
        const dim = new Date(y, m + 1, 0).getDate();
        // JS getDay(): 0=Sun, 1=Mon. We want Mon=0, Sun=6 for array indexing
        let startDay = new Date(y, m, 1).getDay(); 
        startDay = startDay === 0 ? 6 : startDay - 1; 

        return { month: m, year: y, daysInMonth: dim, startDayOffset: startDay };
    }, [viewDate]);

    // INCREMENTAL FETCHING LOGIC
    // This effect runs when the month changes. It queues up fetching for all days in the month.
    useEffect(() => {
        // Cancel previous batch if any to prevent race conditions
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const dep = searchParams.departure_id;
        const arr = searchParams.arrival_id;
        
        // 1. Identify days to fetch
        const daysToProcess: string[] = [];
        const newStatuses: Record<string, DayStatus> = {};
        const today = new Date();
        today.setHours(0,0,0,0);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(dateStr);
            
            // If past date, ignore
            if (dateObj < today) {
                newStatuses[dateStr] = 'empty';
                continue;
            }

            // Check cache first
            const cached = checkCacheForDate(dep, arr, dateStr);
            if (cached) {
                setMonthData(prev => ({ ...prev, [dateStr]: cached }));
                newStatuses[dateStr] = 'success';
            } else {
                daysToProcess.push(dateStr);
                newStatuses[dateStr] = 'loading'; // Mark as loading initially
            }
        }
        
        // Reset statuses for this month
        setStatuses(newStatuses);

        // 2. Process Fetch Queue (Concurrent batching for performance)
        const processQueue = async () => {
            const BATCH_SIZE = 5; // Fetch 5 days in parallel to not overload browser/server
            
            for (let i = 0; i < daysToProcess.length; i += BATCH_SIZE) {
                if (controller.signal.aborted) return;
                
                const batch = daysToProcess.slice(i, i + BATCH_SIZE);
                
                await Promise.all(batch.map(async (dateStr) => {
                    if (controller.signal.aborted) return;
                    
                    try {
                        const data = await fetchDayFlightData(dep, arr, dateStr);
                        if (data) {
                            setMonthData(prev => ({ ...prev, [dateStr]: data }));
                            setStatuses(prev => ({ ...prev, [dateStr]: 'success' }));
                        } else {
                             setStatuses(prev => ({ ...prev, [dateStr]: 'empty' }));
                        }
                    } catch (e) {
                         setStatuses(prev => ({ ...prev, [dateStr]: 'error' }));
                    }
                }));
                
                // Small delay to yield to main thread if needed
                await new Promise(r => setTimeout(r, 50));
            }
        };

        if (daysToProcess.length > 0) {
            processQueue();
        }

        return () => controller.abort();

    }, [month, year, searchParams.departure_id, searchParams.arrival_id]);

    const handlePrevMonth = () => {
        setMonthData({});
        setStatuses({});
        setViewDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setMonthData({});
        setStatuses({});
        setViewDate(new Date(year, month + 1, 1));
    };

    // Calculate Price including Fees (Admin Configuration)
    const getFinalPrice = (netPrice: number, airline: string) => {
        if (!feeConfig) return netPrice;
        // Calculate for 1 adult to show unit price
        const unitPriceInfo = calculateAdditivePrice(
            netPrice, 
            feeConfig, 
            airline, 
            searchParams.departure_id, 
            searchParams.arrival_id, 
            { adults: 1, children: 0, infants: 0 }, 
            false
        );
        
        return unitPriceInfo.finalTotal;
    };

    // Find min price in the currently loaded data for highlighting "Best Price"
    const minPrice = useMemo(() => {
        const loadedPrices = Object.values(monthData).map((d: any) => {
             return getFinalPrice(d.lowestPrice, d.options[0]?.airline || 'VN');
        });
        return loadedPrices.length > 0 ? Math.min(...loadedPrices) : 0;
    }, [monthData, feeConfig]);

    const renderCalendarCells = () => {
        const cells = [];
        const totalSlots = Math.ceil((daysInMonth + startDayOffset) / 7) * 7;
        const depCity = getCityNameOnly(searchParams.departure_id);
        const arrCity = getCityNameOnly(searchParams.arrival_id);

        for (let i = 0; i < totalSlots; i++) {
            const dayNumber = i - startDayOffset + 1;
            
            if (dayNumber <= 0 || dayNumber > daysInMonth) {
                cells.push(
                    <div key={`empty-${i}`} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 min-h-[100px]"></div>
                );
            } else {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                const dateObj = new Date(year, month, dayNumber);
                const status = statuses[dateStr] || 'idle';
                
                const dayData = monthData[dateStr];
                
                // Calculate Final Display Price (Including Taxes/Fees)
                let finalPrice = 0;
                if (dayData) {
                    finalPrice = getFinalPrice(dayData.lowestPrice, dayData.options[0]?.airline || 'VN');
                }

                const isCheapest = finalPrice === minPrice && finalPrice > 0;
                const isPast = dateObj < new Date(new Date().setHours(0,0,0,0));
                
                // Lunar Date Calculation
                const lunar = getLunarDate(dateObj);
                const lunarText = lunar.day === 1 ? `${lunar.day}/${lunar.month}` : lunar.day;

                cells.push(
                    <div 
                        key={dateStr}
                        onClick={() => !isPast && status === 'success' && onSelectDate(dateStr)}
                        className={`
                            relative border border-gray-200 dark:border-gray-700 min-h-[100px] p-2 flex flex-col justify-between transition-all duration-200 group
                            ${isPast ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-gray-800 cursor-pointer hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:border-blue-400 hover:z-20'}
                            ${isCheapest && !isPast ? 'bg-[#fff9e6] border-yellow-200' : ''}
                        `}
                    >
                        {/* Date Number Header */}
                        <div className="flex justify-between items-start">
                            <span className={`font-bold text-lg ${isPast ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{dayNumber}</span>
                            <span className={`text-xs ${lunar.day === 1 || lunar.day === 15 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{lunarText}</span>
                        </div>
                        
                        {/* Main Content: Loading / Price / Error */}
                        <div className="mt-1 text-center flex flex-col items-center justify-center flex-grow">
                            {status === 'loading' ? (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] text-gray-400">Đang tải...</span>
                                </div>
                            ) : isPast ? (
                                <span className="text-xs text-gray-400">-</span>
                            ) : status === 'empty' ? (
                                <span className="text-[10px] text-gray-400">Hết vé</span>
                            ) : status === 'error' ? (
                                <span className="text-[10px] text-red-400">Lỗi</span>
                            ) : dayData ? (
                                <>
                                    {dayData.bestAirlineLogo && (
                                        <img 
                                            src={dayData.bestAirlineLogo} 
                                            alt="Airline" 
                                            className="h-5 object-contain mb-1" 
                                        />
                                    )}
                                    <div className={`font-bold text-sm ${isCheapest ? 'text-[#ff5e1f]' : 'text-gray-800 dark:text-white'}`}>
                                        {formatCurrency(finalPrice)}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* HOVER TOOLTIP (Detailed List - Custom UI) */}
                        {!isPast && status === 'success' && dayData && dayData.options && dayData.options.length > 0 && (
                             <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-[400px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-0 animate-fade-in overflow-hidden">
                                {/* Triangle arrow pointing up */}
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white dark:border-b-gray-900"></div>
                                
                                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                        Giá đã bao gồm thuế & phí
                                    </div>
                                    {dayData.options.map((opt, idx) => {
                                        const optFinalPrice = getFinalPrice(opt.price, opt.airline);
                                        return (
                                        <div key={idx} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            {/* 1. Airline Logo & Name */}
                                            <div className="w-[100px] flex-shrink-0 flex flex-col items-center justify-center gap-1">
                                                <img src={opt.logo} className="w-10 h-10 object-contain" alt={opt.airline} />
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">{opt.airline}</span>
                                            </div>
                                            
                                            {/* 2. Route Details */}
                                            <div className="flex-grow grid grid-cols-3 items-center gap-2 text-center">
                                                {/* Departure */}
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">{depCity}</span>
                                                    <span className="text-lg font-bold text-[#ff5e1f] leading-none">{opt.departTime}</span>
                                                </div>

                                                {/* Flight Path & Price */}
                                                <div className="flex flex-col items-center justify-center px-1">
                                                    <div className="text-sm font-bold text-[#0083C2] dark:text-blue-400 whitespace-nowrap">
                                                        {formatCurrency(optFinalPrice)}
                                                    </div>
                                                    <div className="w-full flex items-center gap-1 opacity-50">
                                                        <div className="h-[1px] bg-gray-400 w-full"></div>
                                                        <PlaneIcon className="w-3 h-3 text-gray-500 transform rotate-90" />
                                                    </div>
                                                </div>

                                                {/* Arrival */}
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">{arrCity}</span>
                                                    <span className="text-lg font-bold text-[#ff5e1f] leading-none">{opt.arriveTime}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                    <div className="p-2 text-center bg-gray-50 dark:bg-gray-800/50">
                                        <span className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-semibold">
                                            Xem tất cả chuyến bay ngày {dayNumber}/{month + 1}
                                        </span>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                );
            }
        }
        return cells;
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-visible mt-6 animate-fade-in relative z-10">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0083C2] to-[#005a8d] p-4 text-white flex flex-col md:flex-row justify-between items-center gap-4 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                        <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-wide">Vé rẻ trong tháng</h2>
                        <div className="text-sm text-blue-100 flex items-center gap-2">
                            <span>{getCityName(searchParams.departure_id)} ({searchParams.departure_id})</span>
                            <span className="text-xs">➜</span>
                            <span>{getCityName(searchParams.arrival_id)} ({searchParams.arrival_id})</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white/10 p-1.5 rounded-lg">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white/20 rounded-md transition">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <div className="text-center min-w-[120px]">
                        <span className="block text-lg font-bold">Tháng {month + 1}, {year}</span>
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white/20 rounded-md transition">
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-[#f5f5f5] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center py-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                <div>CN</div>
                <div>Thứ 2</div>
                <div>Thứ 3</div>
                <div>Thứ 4</div>
                <div>Thứ 5</div>
                <div>Thứ 6</div>
                <div>Thứ 7</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {renderCalendarCells()}
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-4 justify-center md:justify-end border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                 <div className="flex items-center gap-2">
                     <span className="w-3 h-3 bg-[#fff9e6] border border-yellow-200 block"></span> Giá tốt nhất
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="w-3 h-3 bg-white border border-gray-200 block"></span> Giá thường
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="text-red-500 font-bold">1/1</span> Ngày Âm lịch
                 </div>
                 <div>
                     * Giá vé trên đã bao gồm thuế phí và lệ phí sân bay. Di chuột vào ô để xem chi tiết.
                 </div>
            </div>
        </div>
    );
};

export default MonthFlightMatrix;
