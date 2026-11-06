
import React, { useState, useMemo, useEffect } from 'react';
import { type Passengers, type FlightOption, type SearchParams, DestinationInfo, AdminFeeConfig, PriceInsights } from '../types';
import FlightCard from './FlightCard';
import { PlaneTakeoffIcon, PlaneLandIcon, SwapArrowsIcon, CloudSunIcon, SparklesIcon, CheckCircleIcon, ArrowLeftIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';
import DestinationAssistant from './DestinationAssistant';
import PriceInsightsWidget from './PriceInsightsWidget';
import HolographicTicket from './HolographicTicket';
import VirtualWindow from './VirtualWindow'; 
import { ComparisonDock, ComparisonModal } from './FlightComparison'; // NEW
import * as adminService from '../services/adminService';
import { PROXY_URL, FLIGHT_API_URL } from '../services/apiConfig';
import { getDestinationInfo } from '../services/geminiService';

interface FlightListProps {
    flights: {
        best_flights: FlightOption[];
        other_flights: FlightOption[];
    };
    passengers: Passengers;
    onSelectFlight: (flight: FlightOption) => void;
    selectedFlight: FlightOption | null;
    priceDisplayMode: 'base' | 'total';
    feeConfig: AdminFeeConfig | null;
    onPreview3D: (flight: FlightOption) => void;
    onViewWindow: (code: string) => void;
    // New Compare Props
    comparisonList: FlightOption[];
    onToggleCompare: (flight: FlightOption) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatTimeShort = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// Robust comparison helper to avoid "undefined === undefined" bug
const areFlightsEqual = (f1: FlightOption | null, f2: FlightOption) => {
    if (!f1) return false;
    // If tokens exist and match
    if (f1.booking_token && f2.booking_token) {
        return f1.booking_token === f2.booking_token;
    }
    // Fallback: Compare content (Flight Number + Time + Airline)
    if (f1.flights.length > 0 && f2.flights.length > 0) {
        const l1 = f1.flights[0];
        const l2 = f2.flights[0];
        return l1.flight_number === l2.flight_number && 
               l1.departure_airport.time === l2.departure_airport.time &&
               l1.airline === l2.airline;
    }
    return false;
};

const FlightList: React.FC<FlightListProps> = ({ flights, passengers, onSelectFlight, selectedFlight, priceDisplayMode, feeConfig, onPreview3D, onViewWindow, comparisonList, onToggleCompare }) => {
    const { best_flights, other_flights } = flights;

    if (best_flights.length === 0 && other_flights.length === 0) {
        return (
            <div className="text-center p-8 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg mt-4">
                <h3 className="text-xl font-semibold">Không tìm thấy chuyến bay</h3>
                <p>Không có chuyến bay nào khớp với bộ lọc của bạn cho chặng này. Hãy thử bỏ chọn một vài bộ lọc.</p>
            </div>
        );
    }
    
    // Check if a flight is in compare list
    const isComparing = (flight: FlightOption) => comparisonList.some(c => areFlightsEqual(c, flight));

    return (
        <div className="mt-2 pb-24">
            {best_flights.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                        Đề xuất tốt nhất
                    </div>
                    <div className="space-y-3">
                        {best_flights.map((flight, index) => (
                            <FlightCard 
                                key={`best-${index}`} 
                                flightOption={flight} 
                                isBest={true} 
                                passengers={passengers} 
                                onSelect={onSelectFlight} 
                                isSelected={areFlightsEqual(selectedFlight, flight)}
                                priceDisplayMode={priceDisplayMode}
                                feeConfig={feeConfig}
                                onPreview3D={onPreview3D}
                                onViewWindow={onViewWindow}
                                onToggleCompare={onToggleCompare}
                                isComparing={isComparing(flight)}
                            />
                        ))}
                    </div>
                </div>
            )}
            {other_flights.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        Các lựa chọn khác
                    </div>
                    <div className="space-y-3">
                        {other_flights.map((flight, index) => (
                             <FlightCard 
                                key={`other-${index}`} 
                                flightOption={flight} 
                                isBest={false} 
                                passengers={passengers} 
                                onSelect={onSelectFlight} 
                                isSelected={areFlightsEqual(selectedFlight, flight)}
                                priceDisplayMode={priceDisplayMode}
                                feeConfig={feeConfig}
                                onPreview3D={onPreview3D}
                                onViewWindow={onViewWindow}
                                onToggleCompare={onToggleCompare}
                                isComparing={isComparing(flight)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ... DestinationInsight ...
const DestinationInsight: React.FC<{ destinationCode: string }> = ({ destinationCode }) => {
    const [info, setInfo] = useState<DestinationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [cityName, setCityName] = useState('');

    useEffect(() => {
        const fetchInsight = async () => {
            setLoading(true);
            setInfo(null);
            
            const airport = AIRPORTS.find(a => a.id === destinationCode);
            // Fallback to code if name not found, remove parens from name
            const destName = airport ? airport.name.replace(/\s*\(.*\)/, '').trim() : destinationCode;
            setCityName(destName);
            
            try {
                const data = await getDestinationInfo(destName);
                if (data && data.summary) {
                    setInfo(data);
                } else {
                    setInfo(null);
                }
            } catch (e: any) {
                console.warn("AI Insight fetch error:", e.message);
                setInfo(null);
            } finally {
                setLoading(false);
            }
        };
        if (destinationCode) fetchInsight();
    }, [destinationCode]);

    if (!loading && !info) return null; 

    return (
        <div className="mb-6">
            <DestinationAssistant info={info} cityName={cityName} loading={loading} />
        </div>
    );
};


interface FlightResultsProps {
  outboundFlights: { best_flights: FlightOption[]; other_flights: FlightOption[], price_insights?: PriceInsights };
  inboundFlights: { best_flights: FlightOption[]; other_flights: FlightOption[], price_insights?: PriceInsights };
  isLoading: boolean;
  error: string | null;
  passengers: Passengers;
  onSelectFlight: (flight: FlightOption) => void;
  hasActiveFilters: boolean;
  searchParams: SearchParams | null;
  priceDisplayMode: 'base' | 'total';
  feeConfig: AdminFeeConfig | null;
  sortOption?: string;
  onSortChange?: (option: string) => void;
}

// ... rest of the file (LoadingSkeleton, QuickSortTabs, CheapFlightRoutes, FlightResults component) ...
// (Keeping existing code but ensuring the exports are correct)

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-[var(--card-bg-color)] p-4 rounded-lg shadow-sm animate-pulse border border-[var(--border-color)] h-32 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="w-1/3 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="w-1/6 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
        <div className="flex justify-between items-center mt-4">
             <div className="w-1/2 h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

const QuickSortTabs: React.FC<{ activeSort: string, onSortChange: (val: string) => void }> = ({ activeSort, onSortChange }) => {
    const options = [
        { id: 'price', label: 'Giá rẻ nhất' },
        { id: 'earliest', label: 'Cất cánh sớm nhất' },
        { id: 'airline', label: 'Hãng hàng không' }
    ];

    return (
        <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onSortChange(opt.id)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeSort === opt.id ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export const CheapFlightRoutes: React.FC<{ onSearch: (params: SearchParams) => void }> = ({ onSearch }) => {
    const routes = [
        { from: 'SGN', to: 'HAN', price: 990000, label: 'TP.HCM - Hà Nội' },
        { from: 'HAN', to: 'DAD', price: 590000, label: 'Hà Nội - Đà Nẵng' },
        { from: 'SGN', to: 'PQC', price: 790000, label: 'TP.HCM - Phú Quốc' },
        { from: 'HAN', to: 'CXR', price: 1090000, label: 'Hà Nội - Nha Trang' },
        { from: 'DAD', to: 'HAN', price: 650000, label: 'Đà Nẵng - Hà Nội' },
        { from: 'HPH', to: 'SGN', price: 1190000, label: 'Hải Phòng - TP.HCM' },
        { from: 'SGN', to: 'DLI', price: 490000, label: 'TP.HCM - Đà Lạt' },
        { from: 'HAN', to: 'VCA', price: 1290000, label: 'Hà Nội - Cần Thơ' },
    ];

    const handleSelect = (from: string, to: string) => {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const dateStr = nextWeek.toISOString().split('T')[0];

        const params: SearchParams = {
            departure_id: from,
            arrival_id: to,
            outbound_date: dateStr,
            type: 'one_way',
            passengers: { adults: 1, children: 0, infants: 0 }
        };
        onSearch(params);
    };

    return (
        <div className="mt-12">
             <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-600 pl-3 flex items-center gap-2">
                Các chặng bay giá rẻ phổ biến
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {routes.map((route, idx) => (
                    <button 
                        key={idx}
                        onClick={() => handleSelect(route.from, route.to)}
                        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-red-400 dark:hover:border-red-500 transition text-left group flex flex-col h-full justify-between"
                    >
                        <div>
                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-red-600 mb-1">{route.label}</div>
                            <div className="text-xs text-gray-500 mb-2">{route.from} ➝ {route.to}</div>
                        </div>
                        <div className="text-lg font-bold text-red-600">Từ {formatCurrency(route.price)}</div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const FlightResults: React.FC<FlightResultsProps> = (props) => {
    const { 
        outboundFlights, inboundFlights, isLoading, error, passengers, onSelectFlight, hasActiveFilters, searchParams, priceDisplayMode, feeConfig,
        sortOption, onSortChange
    } = props;
    
    const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound');
    const [selectedOutbound, setSelectedOutbound] = useState<FlightOption | null>(null);
    const [selectedInbound, setSelectedInbound] = useState<FlightOption | null>(null);
    
    const [previewFlight, setPreviewFlight] = useState<FlightOption | null>(null);
    const [previewWindowCode, setPreviewWindowCode] = useState<string | null>(null);
    
    // NEW: Comparison State
    const [comparisonList, setComparisonList] = useState<FlightOption[]>([]);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    
    const isRoundTrip = searchParams?.type === 'round_trip';

    const handleSelectOutbound = (flight: FlightOption) => {
        if (areFlightsEqual(selectedOutbound, flight)) {
            setSelectedOutbound(null);
        } else {
            setSelectedOutbound(flight);
            if (isRoundTrip) {
                setActiveTab('inbound');
            }
        }
    };

    const handleSelectInbound = (flight: FlightOption) => {
        if (areFlightsEqual(selectedInbound, flight)) {
            setSelectedInbound(null);
        } else {
            setSelectedInbound(flight);
        }
    };

    const handleToggleCompare = (flight: FlightOption) => {
        setComparisonList(prev => {
            const exists = prev.find(f => areFlightsEqual(f, flight));
            if (exists) {
                return prev.filter(f => !areFlightsEqual(f, flight));
            } else {
                if (prev.length >= 3) {
                    alert("Bạn chỉ có thể so sánh tối đa 3 chuyến bay cùng lúc.");
                    return prev;
                }
                return [...prev, flight];
            }
        });
    };

    const handleConfirmSelection = () => {
        if (!selectedOutbound) return;
        
        if (isRoundTrip && !selectedInbound) {
            alert("Vui lòng chọn chuyến bay chiều về.");
            setActiveTab('inbound');
            return;
        }

        if (isRoundTrip && selectedInbound) {
            const combinedFlight: FlightOption = {
                flights: [...selectedOutbound.flights, ...selectedInbound.flights],
                price_net: selectedOutbound.price_net + selectedInbound.price_net,
                currency: selectedOutbound.currency,
                type: 'Round trip', 
                baggage: { 
                    carry_on: selectedOutbound.baggage.carry_on,
                    checked: selectedOutbound.baggage.checked,
                },
                booking_token: `${selectedOutbound.booking_token || 'out'}_${selectedInbound.booking_token || 'in'}`
            };
            onSelectFlight(combinedFlight);
        } else {
            onSelectFlight(selectedOutbound);
        }
    };

    let totalPrice = 0;

    if (selectedOutbound) {
        const outPrice = adminService.calculateAdditivePrice(
            selectedOutbound.price_net,
            feeConfig,
            selectedOutbound.flights[0].airline,
            selectedOutbound.flights[0].departure_airport.id,
            selectedOutbound.flights[selectedOutbound.flights.length - 1].arrival_airport.id,
            passengers
        );
        totalPrice += outPrice.finalTotal;
    }

    if (selectedInbound) {
        const inPrice = adminService.calculateAdditivePrice(
            selectedInbound.price_net,
            feeConfig,
            selectedInbound.flights[0].airline,
            selectedInbound.flights[0].departure_airport.id,
            selectedInbound.flights[0].departure_airport.id,
            passengers
        );
        totalPrice += inPrice.finalTotal;
    }

    const hasSelection = selectedOutbound; 

    return (
        <div className="w-full relative">
            {previewFlight && (
                <HolographicTicket flight={previewFlight} onClose={() => setPreviewFlight(null)} />
            )}
            
            {previewWindowCode && (
                <VirtualWindow destinationCode={previewWindowCode} onClose={() => setPreviewWindowCode(null)} />
            )}
            
            {/* COMPARISON TOOLS */}
            <ComparisonDock 
                selectedFlights={comparisonList} 
                onRemove={(f) => setComparisonList(prev => prev.filter(item => !areFlightsEqual(item, f)))}
                onClear={() => setComparisonList([])}
                onOpenCompare={() => setShowComparisonModal(true)}
            />
            
            {showComparisonModal && (
                <ComparisonModal 
                    selectedFlights={comparisonList} 
                    onRemove={(f) => setComparisonList(prev => prev.filter(item => !areFlightsEqual(item, f)))}
                    onClear={() => setComparisonList([])}
                    onClose={() => setShowComparisonModal(false)}
                    feeConfig={feeConfig}
                />
            )}

            {searchParams?.arrival_id && !isLoading && !error && (
                <DestinationInsight destinationCode={searchParams.arrival_id} />
            )}

            {error && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <span className="font-bold">Lỗi:</span> {error}
                </div>
            )}

            {onSortChange && sortOption && !isLoading && !error && (
                <QuickSortTabs activeSort={sortOption} onSortChange={onSortChange} />
            )}

            {isRoundTrip && !error && (
                <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700 bg-[var(--card-bg-color)] rounded-t-lg shadow-sm">
                    <button 
                        onClick={() => setActiveTab('outbound')}
                        className={`flex-1 py-4 text-center font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'outbound' ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <PlaneTakeoffIcon className="w-5 h-5" /> 
                        <div className="flex flex-col items-start">
                            <span>Chuyến đi</span>
                            <span className="text-[10px] font-normal">{searchParams?.departure_id} → {searchParams?.arrival_id}</span>
                        </div>
                        {selectedOutbound && <CheckCircleIcon className="w-5 h-5 text-green-500 ml-2" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('inbound')}
                        className={`flex-1 py-4 text-center font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === 'inbound' ? 'border-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <PlaneLandIcon className="w-5 h-5" />
                        <div className="flex flex-col items-start">
                            <span>Chuyến về</span>
                            <span className="text-[10px] font-normal">{searchParams?.arrival_id} → {searchParams?.departure_id}</span>
                        </div>
                        {selectedInbound && <CheckCircleIcon className="w-5 h-5 text-green-500 ml-2" />}
                    </button>
                </div>
            )}

            {isLoading ? (
                <LoadingSkeleton />
            ) : (
                <>
                    <div className={isRoundTrip && activeTab !== 'outbound' ? 'hidden' : 'block'}>
                        {outboundFlights.price_insights && <PriceInsightsWidget insights={outboundFlights.price_insights} />}
                        <FlightList 
                            flights={outboundFlights} 
                            passengers={passengers} 
                            onSelectFlight={handleSelectOutbound} 
                            selectedFlight={selectedOutbound}
                            priceDisplayMode={priceDisplayMode}
                            feeConfig={feeConfig}
                            onPreview3D={setPreviewFlight}
                            onViewWindow={setPreviewWindowCode}
                            comparisonList={comparisonList}
                            onToggleCompare={handleToggleCompare}
                        />
                    </div>
                    {isRoundTrip && (
                        <div className={activeTab !== 'inbound' ? 'hidden' : 'block'}>
                            {inboundFlights.price_insights && <PriceInsightsWidget insights={inboundFlights.price_insights} />}
                            <FlightList 
                                flights={inboundFlights} 
                                passengers={passengers} 
                                onSelectFlight={handleSelectInbound} 
                                selectedFlight={selectedInbound}
                                priceDisplayMode={priceDisplayMode}
                                feeConfig={feeConfig}
                                onPreview3D={setPreviewFlight}
                                onViewWindow={setPreviewWindowCode}
                                comparisonList={comparisonList}
                                onToggleCompare={handleToggleCompare}
                            />
                        </div>
                    )}
                </>
            )}

            {hasSelection && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t-2 border-red-600 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-[100] animate-slide-up">
                    <div className="container mx-auto max-w-7xl px-4 py-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            
                            <div className="flex-1 w-full flex items-center justify-start gap-4 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                                {selectedOutbound && (
                                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 min-w-[200px]">
                                        <div className="bg-blue-100 p-2 rounded-full"><PlaneTakeoffIcon className="w-4 h-4 text-blue-600"/></div>
                                        <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Chuyến đi</div>
                                            <div className="text-sm font-bold text-gray-800 dark:text-white leading-none mt-1">
                                                {formatTimeShort(selectedOutbound.flights[0].departure_airport.time)}
                                                <span className="text-gray-400 mx-1">•</span> 
                                                {selectedOutbound.flights[0].airline}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isRoundTrip && (
                                    selectedInbound ? (
                                    <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/30 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-800 min-w-[200px]">
                                        <div className="bg-orange-100 p-2 rounded-full"><PlaneLandIcon className="w-4 h-4 text-orange-600"/></div>
                                        <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Chuyến về</div>
                                            <div className="text-sm font-bold text-gray-800 dark:text-white leading-none mt-1">
                                                {formatTimeShort(selectedInbound.flights[0].departure_airport.time)}
                                                <span className="text-gray-400 mx-1">•</span> 
                                                {selectedInbound.flights[0].airline}
                                            </div>
                                        </div>
                                    </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 opacity-70 min-w-[200px]">
                                            <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full"><PlaneLandIcon className="w-4 h-4 text-gray-500"/></div>
                                            <div className="text-sm text-gray-500 italic">Vui lòng chọn chuyến về...</div>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto border-t sm:border-t-0 border-gray-100 dark:border-gray-800 pt-3 sm:pt-0 justify-between sm:justify-end">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Tổng cộng (Đã gồm thuế phí)</div>
                                    <div className="text-2xl font-bold text-red-600 leading-none">{formatCurrency(totalPrice)}</div>
                                </div>
                                <button 
                                    onClick={handleConfirmSelection}
                                    className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform active:scale-95 flex items-center gap-2"
                                >
                                    <span>Tiếp tục</span>
                                    <ArrowLeftIcon className="w-5 h-5 transform rotate-180" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlightResults;
