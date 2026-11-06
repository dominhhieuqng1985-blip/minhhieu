
import React, { useState } from 'react';
import { type AISuggestion, type SearchParams } from '../types';
import { REGIONAL_AIRPORTS } from '../constants';
import { SparklesIcon, LocationMarkerIcon, SearchIcon, CheckIcon } from './icons/Icons';
import { getTravelSuggestions } from '../services/geminiService';

interface AIPlannerProps {
    onSuggestedSearch: (params: Omit<SearchParams, 'passengers' | 'type'>) => void;
}

const SuggestionSkeleton: React.FC = () => (
    <div className="bg-white/50 dark:bg-gray-800/50 border border-[var(--border-color)] rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
        <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-4 ml-auto"></div>
    </div>
);

const AIPlanner: React.FC<AIPlannerProps> = ({ onSuggestedSearch }) => {
    const [departureId, setDepartureId] = useState('SGN');
    const [promptText, setPromptText] = useState('');
    const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetSuggestions = async () => {
        if (!promptText.trim()) {
            setError('Vui lòng nhập mô tả cho chuyến đi bạn muốn.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuggestions([]);

        try {
            const data = await getTravelSuggestions(departureId, promptText);
            setSuggestions(data);
        } catch (err: any) {
            console.error('AI suggestion failed:', err);
            let msg = err.message || "Lỗi không xác định.";
            if (msg.includes("400") || msg.includes("key")) msg = "Lỗi kết nối AI.";
            else if (msg.includes("429")) msg = "Hệ thống AI đang quá tải. Vui lòng thử lại sau.";
            else if (msg.includes("fetch")) msg = "Lỗi kết nối mạng.";
            
            setError(`AI không phản hồi được: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion: AISuggestion) => {
        onSuggestedSearch({
            departure_id: departureId,
            arrival_id: suggestion.airportCode,
            outbound_date: suggestion.suggestedOutboundDate,
            return_date: suggestion.suggestedReturnDate || undefined
        });
    };

    return (
        <div className="mt-12 p-6 bg-gradient-to-br from-blue-50 to-red-50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg shadow-inner border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-600" />
                <h2 className="text-2xl font-bold">Trợ lý du lịch AI</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Chưa biết đi đâu? Hãy để AI gợi ý cho bạn những hành trình tuyệt vời!</p>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium mb-1">Điểm khởi hành</label>
                        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-[var(--card-bg-color)] h-11">
                            <div className="p-2 border-r border-[var(--border-color)]"><LocationMarkerIcon className="text-gray-500"/></div>
                            <select
                                value={departureId}
                                onChange={e => setDepartureId(e.target.value)}
                                className="w-full h-full p-2 bg-transparent focus:outline-none"
                            >
                                {REGIONAL_AIRPORTS['Việt Nam'].map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="ai-prompt" className="block text-sm font-medium mb-1">
                            Mô tả chuyến đi mong muốn của bạn
                        </label>
                        <input
                            type="text"
                            id="ai-prompt"
                            value={promptText}
                            onChange={e => setPromptText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleGetSuggestions()}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 h-11 bg-transparent"
                            placeholder="VD: đi biển 4 ngày, nơi mát mẻ, du lịch gia đình..."
                        />
                    </div>
                </div>

                <button
                    onClick={handleGetSuggestions}
                    disabled={isLoading}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-wait shadow-md"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang tìm ý tưởng...</span>
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5" />
                            <span>Gợi ý cho tôi</span>
                        </>
                    )}
                </button>
            </div>

            {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-200">{error}</p>}

            <div className="mt-6 space-y-4">
                {isLoading && (
                    <div className="grid md:grid-cols-3 gap-4">
                        <SuggestionSkeleton /><SuggestionSkeleton /><SuggestionSkeleton />
                    </div>
                )}

                {suggestions.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestions.map((s, i) => (
                            <div key={i} className="bg-white/80 dark:bg-gray-800/80 border border-[var(--border-color)] rounded-lg p-4 flex flex-col justify-between shadow hover:shadow-lg transition-shadow">
                                <div>
                                    <h4 className="font-bold text-lg text-blue-800 dark:text-blue-400">{s.destinationName}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{s.description}</p>
                                    <div className="mt-3">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Hoạt động gợi ý:</p>
                                        <ul className="text-sm space-y-1">
                                            {s.activities.map((act, j) => (
                                                <li key={j} className="flex items-start">
                                                    <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                    <span>{act}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSuggestionClick(s)}
                                    className="w-full mt-4 flex items-center justify-center gap-2 bg-orange-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 transition-colors text-sm"
                                >
                                    <SearchIcon className="w-4 h-4" />
                                    Tìm vé đến {s.airportCode}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIPlanner;
