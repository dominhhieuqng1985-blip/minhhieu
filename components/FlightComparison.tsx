
import React, { useState } from 'react';
import { FlightOption } from '../types';
import { CloseIcon, PlaneIcon, ScaleIcon, TrashIcon, CheckCircleIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';

interface ComparisonProps {
    selectedFlights: FlightOption[];
    onRemove: (flight: FlightOption) => void;
    onClear: () => void;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});

export const ComparisonDock: React.FC<ComparisonProps & { onOpenCompare: () => void }> = ({ selectedFlights, onRemove, onClear, onOpenCompare }) => {
    if (selectedFlights.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex justify-center animate-slide-up pointer-events-none">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-2xl border border-gray-200 dark:border-gray-700 rounded-2xl p-2 flex items-center gap-4 max-w-4xl pointer-events-auto">
                <div className="flex items-center gap-2 px-3 border-r border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">Đấu trường ({selectedFlights.length}/3)</span>
                    <button onClick={onClear} className="text-gray-400 hover:text-red-500 transition"><TrashIcon className="w-4 h-4" /></button>
                </div>
                
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {selectedFlights.map((flight, idx) => (
                        <div key={idx} className="relative group min-w-[60px] h-14 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-1">
                            <button onClick={() => onRemove(flight)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><CloseIcon className="w-3 h-3" /></button>
                            <img src={flight.flights[0].airline_logo} alt="" className="h-6 object-contain mb-1" />
                            <span className="text-[10px] font-bold">{formatTime(flight.flights[0].departure_airport.time)}</span>
                        </div>
                    ))}
                    {selectedFlights.length < 3 && (
                        <div className="w-14 h-14 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-1">
                            + Thêm
                        </div>
                    )}
                </div>

                <button 
                    onClick={onOpenCompare}
                    disabled={selectedFlights.length < 2}
                    className="ml-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                    <ScaleIcon className="w-5 h-5" />
                    <span>SO KÈO</span>
                </button>
            </div>
        </div>
    );
};

export const ComparisonModal: React.FC<ComparisonProps & { onClose: () => void, feeConfig: any }> = ({ selectedFlights, onClose, feeConfig }) => {
    // Helper to calculate totals
    const getData = (flight: FlightOption) => {
        // Assume basic fee for quick comparison if config is complex, or use raw net price logic
        // For simplicity in visualization, use raw price_net * ~1.2 tax
        const price = flight.price_net; 
        const duration = flight.flights.reduce((acc, f) => acc + f.duration, 0);
        const depTime = new Date(flight.flights[0].departure_airport.time).getTime();
        const airline = flight.flights[0].airline;
        const plane = flight.flights[0].airplane || "Airbus A321";
        return { price, duration, depTime, airline, plane, flight };
    };

    const flightsData = selectedFlights.map(getData);
    
    // Find winners
    const bestPrice = Math.min(...flightsData.map(d => d.price));
    const bestDuration = Math.min(...flightsData.map(d => d.duration));
    const earliest = Math.min(...flightsData.map(d => d.depTime));

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ScaleIcon className="w-6 h-6 text-red-600" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-wider">Đấu Trường Vé</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"><CloseIcon className="w-6 h-6" /></button>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-grow p-6">
                    <div className="grid grid-cols-[120px_repeat(auto-fit,minmax(200px,1fr))] gap-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Header Row */}
                        <div className="contents">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 font-bold text-gray-500 border-b border-r dark:border-gray-700">Tiêu chí</div>
                            {flightsData.map((d, i) => (
                                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center font-bold relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm shadow-md font-mono">{i+1}</div>
                                    <img src={d.flight.flights[0].airline_logo} alt="" className="h-10 mx-auto mt-2 object-contain" />
                                    <div className="text-sm mt-1 text-gray-600 dark:text-gray-300">{d.airline}</div>
                                </div>
                            ))}
                        </div>

                        {/* Price Row */}
                        <div className="contents">
                            <div className="p-4 bg-white dark:bg-gray-900 font-bold text-gray-500 border-b border-r dark:border-gray-700 flex items-center">Giá vé</div>
                            {flightsData.map((d, i) => (
                                <div key={i} className={`p-4 border-b border-gray-200 dark:border-gray-700 text-center ${d.price === bestPrice ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                    <div className={`text-xl font-bold ${d.price === bestPrice ? 'text-green-600' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {formatCurrency(d.price)}
                                    </div>
                                    {d.price === bestPrice && <div className="text-[10px] uppercase font-bold text-green-600 mt-1 flex items-center justify-center gap-1"><CheckCircleIcon className="w-3 h-3"/> Rẻ nhất</div>}
                                </div>
                            ))}
                        </div>

                        {/* Time Row */}
                        <div className="contents">
                            <div className="p-4 bg-white dark:bg-gray-900 font-bold text-gray-500 border-b border-r dark:border-gray-700 flex items-center">Giờ bay</div>
                            {flightsData.map((d, i) => (
                                <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700 text-center">
                                    <div className="text-lg font-bold text-blue-600">{formatTime(d.flight.flights[0].departure_airport.time)}</div>
                                    <div className="text-xs text-gray-400">đến {formatTime(d.flight.flights[d.flight.flights.length-1].arrival_airport.time)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Duration Row */}
                        <div className="contents">
                            <div className="p-4 bg-white dark:bg-gray-900 font-bold text-gray-500 border-b border-r dark:border-gray-700 flex items-center">Tổng thời gian</div>
                            {flightsData.map((d, i) => (
                                <div key={i} className={`p-4 border-b border-gray-200 dark:border-gray-700 text-center ${d.duration === bestDuration ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <div className="font-semibold">{formatDuration(d.duration)}</div>
                                    {d.duration === bestDuration && <div className="text-[10px] uppercase font-bold text-blue-600 mt-1">Nhanh nhất</div>}
                                </div>
                            ))}
                        </div>

                        {/* Plane Row */}
                        <div className="contents">
                            <div className="p-4 bg-white dark:bg-gray-900 font-bold text-gray-500 border-r dark:border-gray-700 flex items-center">Máy bay</div>
                            {flightsData.map((d, i) => (
                                <div key={i} className="p-4 border-gray-200 dark:border-gray-700 text-center text-sm">
                                    {d.plane}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 text-center text-xs text-gray-500">
                    * Giá hiển thị là giá vé cơ bản (chưa bao gồm thuế phí đầy đủ nếu chưa chọn).
                </div>
            </div>
        </div>
    );
};
