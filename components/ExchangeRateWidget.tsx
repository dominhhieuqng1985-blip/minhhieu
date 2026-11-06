
import React, { useState, useEffect } from 'react';
import { ExchangeRate } from '../types';
import { getRealExchangeRates } from '../services/walletService';
import { SparklesIcon, ChartBarIcon, InfoIcon, RefreshIcon } from './icons/Icons';

const ExchangeRateWidget: React.FC = () => {
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [error, setError] = useState(false);

    // Helper to format date strictly as dd/MM/yyyy
    const formatDateStrict = (dateInput: string | Date) => {
        try {
            const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (e) {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            return `${day}/${month}/${year}`;
        }
    };

    const fetchRates = async () => {
        // Keep loading state mostly for initial load to avoid flicker
        if (rates.length === 0) setLoading(true);
        setError(false);
        try {
            const data = await getRealExchangeRates();
            if (data.length > 0) {
                setRates(data);
                // Use the datetime from API if available, otherwise now
                const apiDate = data[0].updated_at || new Date();
                setLastUpdate(formatDateStrict(apiDate));
            } else {
                setError(true);
            }
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
        const interval = setInterval(fetchRates, 300000); // 5 minutes
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-blue-800 text-white rounded-xl shadow-lg p-4 border border-blue-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                    Bảng Tỷ Giá
                </h3>
                <button onClick={fetchRates} className={`p-1 hover:bg-white/10 rounded-full transition ${loading ? 'animate-spin' : ''}`}>
                    <RefreshIcon className="w-4 h-4 text-blue-200" />
                </button>
            </div>

            {loading && rates.length === 0 ? (
                <div className="space-y-2 animate-pulse">
                    {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-white/10 rounded"></div>)}
                </div>
            ) : error && rates.length === 0 ? (
                <div className="text-center py-4 text-xs text-blue-200 bg-white/5 rounded border border-white/10">
                    <InfoIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p>Không thể tải dữ liệu tỷ giá.</p>
                    <button onClick={fetchRates} className="mt-2 text-yellow-400 hover:underline">Thử lại</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {rates.map((item) => (
                        <div key={item.currency} className="flex justify-between items-center bg-white/10 p-2 rounded hover:bg-white/20 transition">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold text-xs">
                                    {item.currency}
                                </div>
                                <span className="font-mono text-sm">1 {item.currency} = </span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-yellow-300">
                                    {new Intl.NumberFormat('vi-VN').format(item.rate)} đ
                                </div>
                                <div className={`text-[10px] flex items-center justify-end gap-1 ${item.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.change_percent >= 0 ? '▲' : '▼'} {Math.abs(item.change_percent)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-4 pt-2 border-t border-white/10 flex flex-col items-center gap-1">
                <div className="text-[10px] text-blue-300 flex items-center gap-1">
                    <ChartBarIcon className="w-3 h-3" /> Nguồn: Vietcombank
                </div>
                {lastUpdate && (
                    <div className="text-[10px] text-blue-400 opacity-80 font-mono">
                        Cập nhật: {lastUpdate}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExchangeRateWidget;
