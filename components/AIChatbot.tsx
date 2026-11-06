
import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, CloseIcon, PlaneIcon, SearchIcon, TicketIcon, FileTextIcon, RefreshIcon } from './icons/Icons';
import { sendChatbotMessage, getChatbotConsultation } from '../services/geminiService';
import { SearchParams } from '../types';

interface AIChatbotProps {
    onTriggerSearch?: (params: Omit<SearchParams, 'passengers' | 'type'>) => void;
}

// Internal state to track what information has been gathered
interface CollectedFlightInfo {
    origin?: string;
    destination?: string;
    date?: string;
    isComplete: boolean;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    isAction?: boolean;
    options?: { 
        origin: string;
        destination: string;
        date: string;
    };
}

const AIRLINE_POLICIES = `
Dữ liệu tham khảo (Giả lập để tư vấn):
- Vietnam Airlines (VN): Full dịch vụ, có ăn nhẹ, hành lý 23kg. Giá thường từ 1.2tr - 2.5tr.
- Vietjet Air (VJ): Giá rẻ, chưa gồm hành lý ký gửi. Giá thường từ 600k - 1.5tr.
- Bamboo Airways (QH): Dịch vụ tốt, đúng giờ. Giá trung bình 900k - 1.8tr.
- Vietravel Airlines (VU): Hãng du lịch, giá cạnh tranh.
`;

const AIChatbot: React.FC<AIChatbotProps> = ({ onTriggerSearch }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: 'Xin chào! Tôi là trợ lý Nhã Uyên Air.\n\nTôi có thể giúp giải đáp thắc mắc về hành lý, thủ tục hoặc giúp bạn tìm vé máy bay.\n\nBạn cần hỗ trợ gì không?' }
    ]);
    
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Flow State: 
    // false = Normal Chat (FAQ)
    // true = Slot Filling Mode (Searching for flight)
    const [flowActive, setFlowActive] = useState(false);
    
    const [collectedInfo, setCollectedInfo] = useState<CollectedFlightInfo>({ isComplete: false });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (manualInput?: string) => {
        const textToSend = manualInput || input;
        if (!textToSend.trim()) return;

        setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
        setInput('');
        setIsTyping(true);

        try {
             const result = await sendChatbotMessage(textToSend, flowActive, collectedInfo);

             // Handle Reset
             if (result.reset_flow) {
                 setFlowActive(false);
                 setCollectedInfo({ isComplete: false });
                 setMessages(prev => [...prev, { role: 'model', text: result.reply || "Đã hủy tìm kiếm. Tôi có thể giúp gì khác không?" }]);
                 setIsTyping(false);
                 return;
             }

             // Handle Flow Activation
             let nextFlowActive = flowActive;
             if (result.activate_flow) {
                 nextFlowActive = true;
                 setFlowActive(true);
             }

             // Update Collected Info (Merge new extracted data with existing)
             const newOrigin = result.extracted?.origin || collectedInfo.origin;
             const newDest = result.extracted?.destination || collectedInfo.destination;
             const newDate = result.extracted?.date || collectedInfo.date;
             
             const isNowComplete = !!(newOrigin && newDest && newDate);

             setCollectedInfo({
                 origin: newOrigin,
                 destination: newDest,
                 date: newDate,
                 isComplete: isNowComplete
             });

             // If Complete -> Show Options
             if (isNowComplete && nextFlowActive) {
                 const confirmText = `Tuyệt vời! Đã đủ thông tin:\n✈️ **${newOrigin}** đi **${newDest}**\n📅 Ngày: **${newDate}**\n\nBạn muốn làm gì tiếp theo?`;
                 
                 setMessages(prev => [...prev, { 
                     role: 'model', 
                     text: confirmText,
                     options: { 
                         origin: newOrigin,
                         destination: newDest,
                         date: newDate
                     }
                 }]);
                 // We keep flow active so user can click buttons, 
                 // but typically we might reset after action. 
                 // For now, let's keep it until they click action.
             } else {
                 // Normal reply (Question or Answer)
                 setMessages(prev => [...prev, { role: 'model', text: result.reply }]);
             }

        } catch (error: any) {
            console.error("Chatbot Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Xin lỗi, tôi chưa hiểu ý bạn. Vui lòng thử lại." }]);
        } finally {
            setIsTyping(false);
        }
    };

    // --- Action Handlers ---

    const handleWebSearch = (origin: string, dest: string, date: string) => {
        if (onTriggerSearch) {
             setMessages(prev => [...prev, { role: 'model', text: "Đang mở form tìm kiếm cho bạn...", isAction: true }]);
             setTimeout(() => {
                 onTriggerSearch({
                     departure_id: origin,
                     arrival_id: dest,
                     outbound_date: date,
                 });
                 setIsOpen(false);
                 // Reset flow after successful handoff
                 setFlowActive(false);
                 setCollectedInfo({ isComplete: false });
                 setMessages([{ role: 'model', text: 'Xin chào! Bạn cần tìm chuyến bay mới nào?' }]);
             }, 1000);
        }
    };

    const handleConsultation = async (origin: string, dest: string, date: string) => {
        setIsTyping(true);
        // User clicked "View in Chat"
        try {
            const text = await getChatbotConsultation(origin, dest, date);
            setMessages(prev => [...prev, { role: 'model', text: text }]);
            
            // End flow after consultation
            setFlowActive(false);
            setCollectedInfo({ isComplete: false });

        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Lỗi kết nối khi lấy dữ liệu giá vé." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleReset = () => {
        setFlowActive(false);
        setCollectedInfo({ isComplete: false });
        setMessages(prev => [...prev, { role: 'model', text: "Đã hủy tìm kiếm. Bạn cần hỗ trợ gì khác?" }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[500px] animate-slide-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#0056b3] to-[#004494] p-4 flex justify-between items-center text-white shadow-md">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <SparklesIcon className="w-5 h-5 text-yellow-300" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Trợ lý Nhã Uyên AI</h3>
                                <span className="text-[10px] text-blue-200 flex items-center gap-1 opacity-90">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Sẵn sàng hỗ trợ
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {flowActive && (
                                <button onClick={handleReset} className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded" title="Reset tìm kiếm">
                                    <RefreshIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                                }`}>
                                    {/* Render text with markdown table support */}
                                    <div className="prose dark:prose-invert prose-sm max-w-none">
                                        {msg.text.split('\n').map((line, i) => {
                                            if (line.trim().startsWith('|')) {
                                                const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
                                                if (cells[0].includes('---')) return null; 
                                                return (
                                                    <div key={i} className="grid grid-cols-3 gap-2 border-b border-gray-200 dark:border-gray-700 py-1 last:border-0">
                                                        {cells.map((cell, cIdx) => (
                                                            <span key={cIdx} className={`${cIdx === 0 ? 'font-bold' : 'text-center'} ${cell.includes('đ') ? 'text-red-600 font-bold' : ''}`}>
                                                                {cell.replace(/\*\*/g, '')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return <div key={i} className="min-h-[1.2em]">{line}</div>;
                                        })}
                                    </div>
                                    
                                    {msg.isAction && (
                                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                            <SearchIcon className="w-3 h-3 animate-spin" />
                                            Đang chuyển hướng...
                                        </div>
                                    )}
                                </div>

                                {/* Render Options Buttons if available */}
                                {msg.options && (
                                    <div className="flex flex-col gap-2 mt-2 ml-2 animate-fade-in w-[85%]">
                                        <button 
                                            onClick={() => handleConsultation(msg.options!.origin, msg.options!.destination, msg.options!.date)}
                                            className="bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 dark:hover:bg-gray-600 transition flex items-center justify-between shadow-sm group"
                                        >
                                            <span className="flex items-center gap-2"><FileTextIcon className="w-4 h-4" /> Xem kết quả qua chatbox</span>
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </button>
                                        <button 
                                            onClick={() => handleWebSearch(msg.options!.origin, msg.options!.destination, msg.options!.date)}
                                            className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-red-700 hover:to-red-600 transition flex items-center justify-between shadow-md group"
                                        >
                                            <span className="flex items-center gap-2"><SearchIcon className="w-4 h-4" /> Xác nhận kết quả qua form tìm vé</span>
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                             <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700 flex gap-1 shadow-sm">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={flowActive ? "Nhập câu trả lời..." : "Hỏi về vé máy bay, thủ tục..."}
                                className="flex-grow p-2.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pl-4 transition-all"
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isTyping}
                                className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md flex items-center justify-center aspect-square"
                            >
                                <PlaneIcon className="w-5 h-5 transform rotate-90" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} transition-all duration-300 bg-[#DA251D] hover:bg-[#b01e17] text-white p-4 rounded-full shadow-xl flex items-center justify-center group relative z-[9999] hover:-translate-y-1`}
            >
                {/* Notification Dot */}
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-[#DA251D] animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-[#DA251D]"></span>
                
                <SparklesIcon className="w-7 h-7" />
                
                {/* Tooltip */}
                <span className="absolute right-full mr-4 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                    Trợ lý ảo AI
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </span>
            </button>
        </div>
    );
};

export default AIChatbot;
