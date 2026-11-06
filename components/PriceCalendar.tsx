
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, RefreshIcon } from './icons/Icons';
import { getLunarDate } from '../utils/lunarCalc';

interface PriceCalendarProps {
    departureId: string;
    arrivalId: string;
    onClose: () => void;
    onSelectDate: (date: string) => void;
    minDate?: string;
    selectedDate?: string;
}

const PriceCalendar: React.FC<PriceCalendarProps> = ({ departureId, arrivalId, onClose, onSelectDate, minDate, selectedDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date(selectedDate || minDate || new Date()));

    const { month, year, days, startingDay } = useMemo(() => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startingDay = new Date(year, month, 1).getDay();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        return { month, year, days, startingDay };
    }, [currentDate]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minSelectableDate = minDate ? new Date(minDate) : today;
    minSelectableDate.setHours(0,0,0,0);
    
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
    if(selectedDateObj) selectedDateObj.setHours(0,0,0,0);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[150] p-4" onClick={onClose}>
            <div className="bg-[var(--card-bg-color)] rounded-xl shadow-2xl w-full max-w-lg transform transition-all border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Chọn ngày bay</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1">
                            {departureId} <span className="text-gray-300">→</span> {arrivalId}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-4">
                    {/* Month Navigator */}
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                            <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">&lt;</span>
                        </button>
                        <div className="text-center">
                            <span className="font-bold text-xl block text-gray-800 dark:text-white">Tháng {month + 1}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Năm {year}</span>
                        </div>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                            <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">&gt;</span>
                        </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, i) => (
                            <div key={day} className={i === 0 || i === 6 ? 'text-red-500' : ''}>{day}</div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                        {days.map(day => {
                            const date = new Date(year, month, day);
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isPast = date < minSelectableDate;
                            const isSelected = selectedDateObj && date.getTime() === selectedDateObj.getTime();
                            
                            // Lunar Calculation
                            const lunar = getLunarDate(date);
                            const isLunarFirst = lunar.day === 1;
                            const isLunar15 = lunar.day === 15;
                            const lunarText = isLunarFirst ? `${lunar.day}/${lunar.month}` : `${lunar.day}`;
                            
                            // Styles
                            // Removed justify-between, added justify-center items-center for cleaner look without price
                            let btnClass = "relative h-12 sm:h-14 rounded-lg border flex flex-col justify-center items-center p-1 transition-all ";
                            let solarTextClass = "text-sm sm:text-base font-bold ";
                            let lunarTextClass = "text-[10px] absolute bottom-1 right-1 ";

                            if (isPast) {
                                btnClass += "bg-gray-50 dark:bg-gray-800/50 border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed";
                                lunarTextClass += "text-gray-300 dark:text-gray-700";
                            } else if (isSelected) {
                                btnClass += "bg-red-600 border-red-600 text-white shadow-md transform scale-105 z-10";
                                lunarTextClass += "text-red-200";
                            } else {
                                btnClass += "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-500 hover:shadow-sm";
                                solarTextClass += "text-gray-800 dark:text-white";
                                lunarTextClass += isLunarFirst || isLunar15 ? "text-red-500 font-bold" : "text-gray-400";
                            }

                            // Highlight Weekend
                            const dayOfWeek = date.getDay();
                            if (!isPast && !isSelected && (dayOfWeek === 0 || dayOfWeek === 6)) {
                                solarTextClass = "text-red-600 dark:text-red-400 font-bold text-sm sm:text-base";
                            }

                            return (
                                <button
                                    key={day}
                                    disabled={isPast}
                                    onClick={() => onSelectDate(dateStr)}
                                    className={btnClass}
                                >
                                    <span className={lunarTextClass}>{lunarText}</span>
                                    <span className={solarTextClass}>{day}</span>
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-dashed border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Ngày đã qua</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600"></span> Đang chọn</div>
                        <div className="flex items-center gap-1"><span className="text-[10px] text-red-500 font-bold">1/15</span> Lịch âm</div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PriceCalendar;
    