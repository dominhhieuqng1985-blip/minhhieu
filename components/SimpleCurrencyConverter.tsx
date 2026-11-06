
import React, { useState, useEffect } from 'react';
import { getRealExchangeRates } from '../services/walletService';
import { ExchangeRate } from '../types';
import { SwapArrowsIcon } from './icons/Icons';

const SimpleCurrencyConverter: React.FC = () => {
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    
    // Tách biệt giá trị nhập (text) và giá trị tính toán (number) để xử lý số thập phân tốt hơn
    const [inputValue, setInputValue] = useState<string>('1'); 
    const [amount, setAmount] = useState<number>(1);
    
    const [currency, setCurrency] = useState('USD');
    const [converted, setConverted] = useState<number>(0);
    const [isInverse, setIsInverse] = useState(false); // false: Ngoại tệ -> VND, true: VND -> Ngoại tệ

    useEffect(() => {
        const fetch = async () => {
            const data = await getRealExchangeRates();
            setRates(data);
        };
        fetch();
    }, []);

    // Tính toán kết quả mỗi khi amount hoặc tỷ giá thay đổi
    useEffect(() => {
        const rateObj = rates.find(r => r.currency === currency);
        const rate = rateObj ? rateObj.rate : (currency === 'USD' ? 25400 : 0);

        if (rate === 0) {
            setConverted(0);
            return;
        }

        if (isInverse) {
            // VND -> Ngoại tệ
            setConverted(amount / rate);
        } else {
            // Ngoại tệ -> VND
            setConverted(amount * rate);
        }
    }, [amount, currency, rates, isInverse]);

    const handleSwap = () => {
        // Lấy giá trị kết quả hiện tại để đưa lên làm giá trị nhập liệu mới
        const valueToSwap = converted;
        
        const newIsInverse = !isInverse;
        setIsInverse(newIsInverse);
        
        if (valueToSwap === 0) {
            setAmount(0);
            setInputValue('0');
            return;
        }

        if (newIsInverse) {
            // Chuyển sang chế độ nhập VND
            // Giá trị nhập mới sẽ là số VND (lấy từ kết quả vừa tính xong)
            // Làm tròn số VND (thường không dùng xu lẻ quá nhỏ)
            const roundedVND = Math.round(valueToSwap);
            setAmount(roundedVND);
            setInputValue(new Intl.NumberFormat('vi-VN').format(roundedVND));
        } else {
            // Chuyển sang chế độ nhập Ngoại tệ
            // Giá trị nhập mới sẽ là số Ngoại tệ
            // Giữ lại 2 số thập phân để chính xác (ví dụ 1.5 USD)
            const roundedForeign = Math.round(valueToSwap * 100) / 100;
            setAmount(roundedForeign);
            setInputValue(roundedForeign.toString());
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;

        if (isInverse) {
            // --- Chế độ nhập VND ---
            // Chỉ cho phép nhập số, tự động thêm dấu chấm phân cách
            const digits = val.replace(/\D/g, '');
            
            // Cập nhật giá trị hiển thị (có dấu chấm)
            if (digits === '') {
                setInputValue('');
                setAmount(0);
            } else {
                const num = parseFloat(digits);
                setInputValue(new Intl.NumberFormat('vi-VN').format(num));
                setAmount(num);
            }
        } else {
            // --- Chế độ nhập Ngoại tệ ---
            // Cho phép nhập dấu chấm thập phân (ví dụ: 0.1, 10.5)
            // Regex: Chỉ cho phép số và tối đa 1 dấu chấm
            if (/^\d*\.?\d*$/.test(val)) {
                setInputValue(val);
                setAmount(parseFloat(val) || 0);
            }
        }
    };

    return (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="bg-green-600 w-1.5 h-6 rounded-full block"></span>
                Công cụ tính tỷ giá nhanh
            </h2>
            
            <div className="flex flex-col md:flex-row items-center gap-4 relative">
                {/* INPUT SECTION */}
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                        {isInverse ? 'Số tiền (VNĐ)' : 'Số tiền ngoại tệ'}
                    </label>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white dark:bg-gray-700 h-12">
                        <input 
                            type="text" // Luôn dùng text để kiểm soát định dạng tốt nhất
                            inputMode="decimal" // Hiện bàn phím số có dấu chấm trên điện thoại
                            value={inputValue}
                            onChange={handleAmountChange}
                            className="flex-1 p-3 bg-transparent font-bold text-lg outline-none text-gray-800 dark:text-white min-w-0"
                            placeholder="0"
                        />
                        {/* Selector */}
                        {!isInverse ? (
                            <select 
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="bg-gray-100 dark:bg-gray-600 font-bold p-3 border-l border-gray-300 dark:border-gray-500 outline-none text-gray-700 dark:text-gray-200 cursor-pointer h-full"
                            >
                                {rates.length > 0 ? rates.map(r => (
                                    <option key={r.currency} value={r.currency}>{r.currency}</option>
                                )) : <option value="USD">USD</option>}
                            </select>
                        ) : (
                            <div className="bg-gray-100 dark:bg-gray-600 font-bold px-4 border-l border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 flex items-center justify-center h-full">
                                VND
                            </div>
                        )}
                    </div>
                </div>
                
                {/* SWAP BUTTON */}
                <button 
                    onClick={handleSwap}
                    className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm transition-transform hover:rotate-180 active:scale-95 z-10"
                    title="Đảo chiều quy đổi"
                >
                    <SwapArrowsIcon className="w-6 h-6" />
                </button>

                {/* OUTPUT SECTION */}
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                        {isInverse ? `Quy đổi sang (${currency})` : 'Thành tiền (VNĐ)'}
                    </label>
                    <div className="flex items-center h-12 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <div className="flex-1 text-right truncate">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {isInverse 
                                    ? new Intl.NumberFormat('en-US', { 
                                        style: 'currency', 
                                        currency: currency,
                                        minimumFractionDigits: (Math.round(converted * 100) / 100) % 1 === 0 ? 0 : 2,
                                        maximumFractionDigits: 2
                                      }).format(converted)
                                    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(converted)
                                }
                            </span>
                        </div>
                        {isInverse && (
                             <div className="ml-3 pl-3 border-l border-blue-200 dark:border-blue-800">
                                <select 
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="bg-transparent font-bold text-blue-800 dark:text-blue-300 outline-none cursor-pointer text-sm"
                                >
                                    {rates.length > 0 ? rates.map(r => (
                                        <option key={r.currency} value={r.currency}>{r.currency}</option>
                                    )) : <option value="USD">USD</option>}
                                </select>
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex justify-between items-center mt-3">
                <div className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {isInverse ? `Đang đổi: VND ➝ ${currency}` : `Đang đổi: ${currency} ➝ VND`}
                </div>
                <p className="text-xs text-gray-400 italic">* Tỷ giá tham khảo Vietcombank.</p>
            </div>
        </div>
    );
};

export default SimpleCurrencyConverter;
