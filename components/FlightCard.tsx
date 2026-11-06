
import React, { useState, useEffect } from 'react';
import { type FlightOption, type FlightDetail, type Passengers, type AdminFeeConfig } from '../types';
import { ClockIcon, PlaneIcon, BriefcaseIcon, TicketIcon, ChevronDownIcon, CheckIcon, SimpleUtensilsIcon, WifiIcon, PlugIcon, SeatIcon, LeafIcon, CloseIcon, CreditCardIcon, ChartBarIcon, SparklesIcon, CloudSunIcon, ScaleIcon, ShareIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';
import { splitRoundTrip } from '../services/flightService';
import * as adminService from '../services/adminService';
import { analyzeFlightPrice } from '../services/geminiService';

interface FlightCardProps {
  flightOption: FlightOption;
  isBest: boolean;
  passengers: Passengers;
  onSelect: (flight: FlightOption) => void;
  isSelected: boolean;
  priceDisplayMode: 'base' | 'total';
  feeConfig: AdminFeeConfig | null; 
  onPreview3D?: (flight: FlightOption) => void; 
  onViewWindow?: (destinationCode: string) => void; 
  onToggleCompare?: (flight: FlightOption) => void;
  isComparing?: boolean;
}

// ... existing helpers ...
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatUSD = (vndAmount: number) => {
    const rate = 25400; 
    const usd = vndAmount / rate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);
};

const formatDuration = (minutes: number) => {
  if (minutes < 0) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

// FORCE TIMEZONE: Asia/Ho_Chi_Minh
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
  });
};

// FORCE TIMEZONE: Asia/Ho_Chi_Minh
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh'
    });
}

const getAirportName = (id: string): string => {
  const airport = AIRPORTS.find(a => a.id === id);
  if (!airport) return id;
  const match = airport.name.match(/(.*?)\s*\(/);
  return match ? match[1] : airport.name;
};

// ... existing getAmenityIcon, getBookingClassCode ...
const getAmenityIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('wifi') || lower.includes('stream') || lower.includes('media')) return <WifiIcon className="w-4 h-4" />;
    if (lower.includes('power') || lower.includes('usb') || lower.includes('outlet')) return <PlugIcon className="w-4 h-4" />;
    if (lower.includes('legroom') || lower.includes('seat') || lower.includes('pitch')) return <SeatIcon className="w-4 h-4" />;
    if (lower.includes('emission') || lower.includes('carbon')) return <LeafIcon className="w-4 h-4" />;
    if (lower.includes('meal') || lower.includes('food')) return <SimpleUtensilsIcon className="w-4 h-4" />;
    return <CheckIcon className="w-4 h-4" />;
};

const getBookingClassCode = (className: string, airline: string) => {
    const lower = className.toLowerCase();
    if (lower.includes('thương gia') || lower.includes('business')) return 'J';
    if (lower.includes('skyboss')) return 'C';
    if (lower.includes('linh hoạt') || lower.includes('flex')) return 'Y';
    if (lower.includes('tiêu chuẩn') || lower.includes('standard')) return 'M';
    if (lower.includes('tiết kiệm') || lower.includes('saver') || lower.includes('eco')) return 'K';
    return 'R';
};

// ... FlightSegmentDetail component (unchanged) ...
const FlightSegmentDetail: React.FC<{ flight: FlightDetail, isFirst: boolean, isLast: boolean }> = ({ flight, isFirst, isLast }) => {
    const flightClass = flight.travel_class || flight.class;
    const bookingCode = getBookingClassCode(flightClass, flight.airline);
    
    return (
    <div className="relative pl-8 pb-6 last:pb-0">
        <div className="absolute left-2 top-2 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${isFirst || isLast ? 'border-blue-600 bg-white' : 'border-gray-400 bg-gray-200'} z-10`}></div>

        <div className="flex flex-col sm:flex-row gap-4 items-start bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex-shrink-0 min-w-[80px]">
                <div className="font-bold text-xl text-gray-800 dark:text-white">{formatTime(flight.departure_airport.time)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(flight.departure_airport.time)}</div>
                <div className="text-lg font-bold text-blue-600 mt-1">{flight.departure_airport.id}</div>
            </div>
            
            <div className="flex-grow border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <img src={flight.airline_logo} alt={flight.airline} className="h-5 w-5 object-contain"/>
                    <span className="font-bold text-sm">{flight.airline}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">{flight.flight_number}</span>
                    <span className="whitespace-nowrap text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200 font-semibold">{flightClass} ({bookingCode})</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="font-medium text-gray-500">Thời gian bay:</span> {formatDuration(flight.duration)}</div>
                    <div><span className="font-medium text-gray-500">Máy bay:</span> {flight.airplane}</div>
                </div>
                
                {(flight.legroom || (flight.extensions && flight.extensions.length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
                        <div className="flex flex-wrap gap-3">
                            {flight.legroom && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                    <SeatIcon className="w-4 h-4 text-gray-500" />
                                    <span>Ghế: {flight.legroom}</span>
                                </div>
                            )}
                            {flight.extensions && flight.extensions.map((ext, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-500">{getAmenityIcon(ext)}</span>
                                    <span>{ext}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 min-w-[80px] text-right">
                <div className="font-bold text-xl text-gray-800 dark:text-white">{formatTime(flight.arrival_airport.time)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(flight.arrival_airport.time)}</div>
                <div className="text-lg font-bold text-blue-600 mt-1">{flight.arrival_airport.id}</div>
            </div>
        </div>
    </div>
    );
};

const FlightCard: React.FC<FlightCardProps> = ({ flightOption, isBest, passengers, onSelect, isSelected, priceDisplayMode, feeConfig, onPreview3D, onViewWindow, onToggleCompare, isComparing }) => {
  // ... state ...
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'fare' | 'price'>('details');
  const [prediction, setPrediction] = useState<{recommendation: 'buy'|'wait', reason: string} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // ... derived data ...
  const isMultiCity = flightOption.type === 'multi_city';
  const isRoundTrip = flightOption.type.toLowerCase().includes('round');
  
  // Logic for One Way / Round Trip
  const { outbound: outboundLegs, inbound: inboundLegs } = isRoundTrip 
        ? splitRoundTrip(flightOption.flights) 
        : { outbound: flightOption.flights, inbound: [] };
        
  const mainLegs = isMultiCity ? flightOption.flights : outboundLegs;
  
  const firstFlight = mainLegs[0];
  const lastFlight = mainLegs[mainLegs.length - 1];
  const departureTime = firstFlight.departure_airport.time;
  const arrivalTime = lastFlight.arrival_airport.time;
  
  let totalDuration = 0;
  if (mainLegs.length === 1) {
      totalDuration = mainLegs[0].duration;
  } else {
      const start = new Date(mainLegs[0].departure_airport.time).getTime();
      const end = new Date(mainLegs[mainLegs.length - 1].arrival_airport.time).getTime();
      totalDuration = (end - start) / (1000 * 60);
  }

  const stops = mainLegs.length - 1;
  const stopLabel = stops === 0 ? 'Bay thẳng' : `${stops} điểm dừng`;
  
  const getBaggageLabel = (checkedBag: string) => {
      const lower = checkedBag.toLowerCase();
      if (lower.includes('không') || lower.includes('trả phí') || lower.includes('no baggage')) return '0kg';
      if (lower.includes('có') && !/\d/.test(lower)) return '0kg';
      if (!/\d/.test(lower) && lower.length < 20) return '0kg';
      const match = lower.match(/(\d+)\s*kg/);
      if (match) return `1x${match[1]}kg`;
      return checkedBag.length > 15 ? '0kg' : checkedBag;
  };
  
  const baggageText = getBaggageLabel(flightOption.baggage.checked);
  const hasMeal = !firstFlight.airline.toLowerCase().includes('vietjet') && !firstFlight.airline.toLowerCase().includes('vietravel'); 
  const travelClass = firstFlight.travel_class || firstFlight.class;
  const bookingCode = getBookingClassCode(travelClass, firstFlight.airline);
  
  // Pricing
  const pricing = adminService.calculateAdditivePrice(
      flightOption.price_net,
      feeConfig,
      firstFlight.airline,
      firstFlight.departure_airport.id,
      lastFlight.arrival_airport.id,
      passengers,
      isRoundTrip
  );
  const displayPrice = priceDisplayMode === 'total' ? pricing.finalTotal : pricing.airlineNet;
  const paidPax = passengers.adults + passengers.children || 1;
  const unitNet = Math.round(pricing.airlineNet / paidPax);
  const unitFees = Math.round((pricing.serviceFee + pricing.tax) / paidPax);
  const unitTotal = unitNet + unitFees;

  // --- UPDATED AI ANALYSIS ---
  const analyzePrice = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setAnalyzing(true);
      
      try {
          const json = await analyzeFlightPrice({
              airline: firstFlight.airline,
              origin: firstFlight.departure_airport.id,
              destination: lastFlight.arrival_airport.id,
              departureDate: formatDate(departureTime),
              price: formatCurrency(displayPrice),
          });
          if (json && json.recommendation) setPrediction(json);
      } catch (e: any) {
          console.error("AI Analyze Error:", e);
      } finally {
          setAnalyzing(false);
      }
  };

  const handleShare = (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = `🔥 Vé HOT: ${firstFlight.airline} bay ${firstFlight.departure_airport.id} -> ${lastFlight.arrival_airport.id} lúc ${formatTime(departureTime)} ngày ${formatDate(departureTime)}. Giá chỉ ${formatCurrency(displayPrice)}. Chốt đơn tại Vemaybaynhauyen.com nhé!`;
      navigator.clipboard.writeText(text);
      alert('Đã copy nội dung chia sẻ!');
  };

  return (
    <div className={`bg-white dark:bg-[#1f2937] rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border ${isSelected ? 'border-red-600 ring-2 ring-red-100 dark:ring-red-900/50' : 'border-gray-200 dark:border-gray-700'} mb-4 relative`}>
      <div className="p-4 flex flex-col lg:flex-row gap-4 lg:items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Left: Airline */}
        <div className="flex lg:flex-col items-center lg:items-start gap-3 lg:w-1/5 min-w-[160px]">
            <div className="flex items-center gap-3">
                <img src={firstFlight.airline_logo} alt={firstFlight.airline} className="h-8 w-8 object-contain" />
                <span className="font-bold text-gray-900 dark:text-white text-sm lg:text-base">{firstFlight.airline}</span>
            </div>
            
            <div className="hidden lg:flex items-center gap-1 mt-1 rounded-full px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden max-w-full">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    <BriefcaseIcon className="w-3 h-3 flex-shrink-0" />
                    <span>{baggageText}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 border-l border-gray-300 pl-2 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                    <span className="truncate max-w-[80px]">{travelClass} ({bookingCode})</span>
                </div>
            </div>
        </div>

        {/* Center: Route Info (Handles Multi-city correctly now) */}
        <div className="flex-1 px-2 lg:px-8">
            {isMultiCity ? (
                <div className="flex flex-col gap-2 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                    {flightOption.flights.map((leg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 w-8">{leg.departure_airport.id}</span>
                                <PlaneIcon className="w-3 h-3 text-gray-400 transform rotate-90" />
                                <span className="font-bold text-orange-600 w-8">{leg.arrival_airport.id}</span>
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                                {formatDate(leg.departure_airport.time)} <span className="font-bold text-gray-800 dark:text-white">{formatTime(leg.departure_airport.time)}</span>
                            </div>
                        </div>
                    ))}
                    <div className="text-xs text-gray-400 mt-1 italic">Tổng {flightOption.flights.length} chặng bay</div>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-2">
                    <div className="text-left">
                        <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{formatTime(departureTime)}</div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{firstFlight.departure_airport.id}</div>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{formatDuration(totalDuration)}</span>
                        <div className="relative w-full h-px bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <div className="absolute left-0 w-1.5 h-1.5 rounded-full border border-gray-400 bg-white dark:bg-gray-800"></div>
                            {stops > 0 && (
                                <div className="bg-white dark:bg-gray-800 px-1 z-10">
                                    <span className="text-[10px] border border-gray-300 rounded px-1 text-gray-500">
                                        {mainLegs[0].arrival_airport.id}
                                    </span>
                                </div>
                            )}
                            <div className="absolute right-0 w-1.5 h-1.5 rounded-full border border-gray-400 bg-blue-500"></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stopLabel}</span>
                    </div>

                    <div className="text-right">
                        <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{formatTime(arrivalTime)}</div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{lastFlight.arrival_airport.id}</div>
                    </div>
                </div>
            )}
        </div>

        {/* Right: Price & Main Action */}
        <div className="flex flex-row lg:flex-col justify-between items-center lg:items-end lg:w-1/4 gap-2 border-t lg:border-t-0 lg:border-l border-dashed border-gray-200 dark:border-gray-700 pt-3 lg:pt-0 lg:pl-4">
            
            <div className="lg:hidden flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-1">
                 <BriefcaseIcon className="w-3 h-3" /> {baggageText}
            </div>

            <div className="text-right">
                {flightOption.seats_left !== undefined && (
                     <div className={`text-xs font-semibold mb-0.5 ${flightOption.seats_left <= 9 ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                        {flightOption.seats_left <= 9 ? `Chỉ còn ${flightOption.seats_left} ghế` : `Còn ${flightOption.seats_left} ghế`}
                     </div>
                )}

                {isBest && <div className="text-xs text-gray-400 line-through decoration-red-500">{formatCurrency(displayPrice * 1.1)}</div>}
                <div className="text-xl font-bold text-[#FF5E1F]">{formatCurrency(displayPrice)}</div>
                <div className="text-xs text-blue-600 font-semibold mb-1">≈ {formatUSD(displayPrice)}</div>
                <div className="text-xs text-gray-500">/khách</div>
            </div>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onSelect(flightOption); }}
                className={`px-4 py-2 rounded-md font-bold text-sm transition-all w-auto lg:w-full flex items-center justify-center gap-2 ${isSelected ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-[#0083C2] hover:bg-[#0072a9] text-white shadow-md'}`}
            >
                {isSelected ? <><CloseIcon className="w-4 h-4"/> Bỏ chọn</> : 'Chọn'}
            </button>
        </div>
      </div>

      {/* NEW: Utility Bar / Experience Strip */}
      <div className="px-4 pb-4 flex flex-wrap gap-2 sm:gap-4 justify-center sm:justify-start items-center mx-4 mb-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
            {/* AI Analyzer */}
            {!prediction && !analyzing ? (
                <button 
                    onClick={analyzePrice} 
                    className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-full transition-all hover:shadow-sm"
                    title="Dùng AI phân tích giá vé"
                >
                    <ChartBarIcon className="w-3.5 h-3.5" /> 
                    <span>AI Phân tích</span>
                </button>
            ) : analyzing ? (
                <span className="text-[10px] text-purple-500 animate-pulse font-semibold px-2">Đang phân tích...</span>
            ) : (
                <div className={`text-[10px] px-2 py-1 rounded border font-bold flex items-center gap-1 ${prediction?.recommendation === 'buy' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                    {prediction?.recommendation === 'buy' ? 'NÊN MUA NGAY' : 'CÓ THỂ CHỜ'}
                    <span className="font-normal opacity-80 hidden md:inline">- {prediction?.reason}</span>
                </div>
            )}

            {/* Compare Button */}
            {onToggleCompare && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleCompare(flightOption); }}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:shadow-sm border ${isComparing ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
                    title="Thêm vào danh sách so sánh"
                >
                    <ScaleIcon className="w-3.5 h-3.5" /> 
                    <span>{isComparing ? 'Đã chọn' : 'So sánh'}</span>
                </button>
            )}

            {/* Share Button */}
            <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-full transition-all hover:shadow-sm"
                title="Sao chép nội dung vé để chia sẻ"
            >
                <ShareIcon className="w-3.5 h-3.5" /> 
                <span>Chia sẻ</span>
            </button>

            {/* 3D Ticket */}
            {onPreview3D && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onPreview3D(flightOption); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition-all hover:shadow-sm"
                    title="Xem vé 3D Hologram"
                >
                    <SparklesIcon className="w-3.5 h-3.5" /> 
                    <span>Soi Vé 3D</span>
                </button>
            )}

            {/* Virtual Window */}
            {onViewWindow && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onViewWindow(lastFlight.arrival_airport.id); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-full transition-all hover:shadow-sm"
                    title="Ngắm cảnh qua cửa sổ máy bay"
                >
                    <CloudSunIcon className="w-3.5 h-3.5" /> 
                    <span>Ngắm Cảnh</span>
                </button>
            )}
      </div>

      {/* Footer / Details Drawer (Active Tabs) */}
      <div className={`bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                <button onClick={() => setActiveTab('details')} className={`mr-6 pb-2 text-sm font-semibold whitespace-nowrap ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Chi tiết chuyến bay</button>
                <button onClick={() => setActiveTab('fare')} className={`mr-6 pb-2 text-sm font-semibold whitespace-nowrap ${activeTab === 'fare' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Điều kiện vé</button>
                <button onClick={() => setActiveTab('price')} className={`pb-2 text-sm font-semibold whitespace-nowrap ${activeTab === 'price' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Chi tiết giá vé</button>
            </div>

            {/* ... Content based on activeTab (Same as before) ... */}
            {activeTab === 'details' && (
                <div className="space-y-8">
                    <div>
                        <div className="flex items-center flex-wrap gap-3 mb-4">
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded border border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800">
                                {isMultiCity ? 'NHIỀU CHẶNG' : 'CHIỀU ĐI'}
                            </span>
                            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800 dark:text-white">
                                <span>{getAirportName(firstFlight.departure_airport.id)}</span>
                                <div className="flex items-center text-gray-300 dark:text-gray-600 px-1">
                                    <div className="h-0.5 w-6 bg-current rounded-l-full"></div>
                                    <PlaneIcon className="w-4 h-4 mx-0.5 text-blue-500 transform rotate-90" />
                                    <div className="h-0.5 w-6 bg-current rounded-r-full"></div>
                                </div>
                                <span>{getAirportName(lastFlight.arrival_airport.id)}</span>
                            </div>
                        </div>
                        <div className="pl-2 border-l-2 border-dotted border-gray-300 ml-1.5 space-y-6">
                            {mainLegs.map((leg, idx) => (
                                <FlightSegmentDetail key={idx} flight={leg} isFirst={idx === 0} isLast={idx === mainLegs.length - 1} />
                            ))}
                        </div>
                    </div>
                    {isRoundTrip && inboundLegs.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div className="flex items-center flex-wrap gap-3 mb-4">
                                <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-0.5 rounded border border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-800">CHIỀU VỀ</span>
                                <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800 dark:text-white">
                                    <span>{getAirportName(inboundLegs[0].departure_airport.id)}</span>
                                    <div className="flex items-center text-gray-300 dark:text-gray-600 px-1">
                                        <div className="h-0.5 w-6 bg-current rounded-l-full"></div>
                                        <PlaneIcon className="w-4 h-4 mx-0.5 text-orange-500 transform -rotate-90" />
                                        <div className="h-0.5 w-6 bg-current rounded-r-full"></div>
                                    </div>
                                    <span>{getAirportName(inboundLegs[inboundLegs.length-1].arrival_airport.id)}</span>
                                </div>
                            </div>
                            <div className="pl-2 border-l-2 border-dotted border-gray-300 ml-1.5 space-y-6">
                                {inboundLegs.map((leg, idx) => (
                                    <FlightSegmentDetail key={idx} flight={leg} isFirst={idx === 0} isLast={idx === inboundLegs.length - 1} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'fare' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm p-2">
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><BriefcaseIcon className="w-4 h-4 text-blue-500"/> Hành lý</h4>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between border-b border-gray-100 dark:border-gray-600 pb-2 mb-2">
                                <span className="text-gray-600 dark:text-gray-300">Hành lý xách tay</span>
                                <span className="font-bold text-green-600">{flightOption.baggage.carry_on}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-300">Hành lý ký gửi</span>
                                <span className="font-bold text-green-600">{baggageText}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><TicketIcon className="w-4 h-4 text-blue-500"/> Điều kiện vé</h4>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                            <li className="flex items-start gap-2"><CheckIcon className="w-4 h-4 text-green-500 mt-0.5"/> <span>Hạng vé: {travelClass} ({bookingCode})</span></li>
                            <li className="flex items-start gap-2"><CheckIcon className="w-4 h-4 text-green-500 mt-0.5"/> <span>Suất ăn: {hasMeal ? 'Có phục vụ' : 'Thu phí trên chuyến bay'}</span></li>
                            <li className="flex items-start gap-2"><CheckIcon className="w-4 h-4 text-green-500 mt-0.5"/> <span>Hoàn/Hủy: Theo quy định hãng</span></li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'price' && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4 border-b pb-2">
                        <CreditCardIcon className="w-5 h-5 text-blue-500"/> Chi tiết giá vé
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-4 py-2">Hành khách</th>
                                    <th className="px-4 py-2 text-center">SL</th>
                                    <th className="px-4 py-2 text-right">Giá vé</th>
                                    <th className="px-4 py-2 text-right">Thuế & Phí</th>
                                    <th className="px-4 py-2 text-right">Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Người lớn</td>
                                    <td className="px-4 py-3 text-center">{passengers.adults}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(unitNet)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(unitFees)}</td>
                                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(unitTotal * passengers.adults)}</td>
                                </tr>
                                {passengers.children > 0 && (
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Trẻ em</td>
                                        <td className="px-4 py-3 text-center">{passengers.children}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(unitNet)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(unitFees)}</td>
                                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(unitTotal * passengers.children)}</td>
                                    </tr>
                                )}
                                <tr className="bg-gray-5 dark:bg-gray-900/50">
                                    <td colSpan={4} className="px-4 py-3 font-bold text-gray-800 dark:text-white text-right uppercase">Tổng chi phí (VND):</td>
                                    <td className="px-4 py-3 text-right text-red-600 text-xl font-bold">{formatCurrency(pricing.finalTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic text-right">
                        * Giá đã bao gồm thuế VAT, phí sân bay và phí dịch vụ đại lý.
                    </div>
                </div>
            )}

          </div>
          <div className="text-center pb-2">
              <button onClick={() => setIsExpanded(false)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center w-full py-1">
                  Thu gọn <ChevronDownIcon className="w-3 h-3 ml-1 transform rotate-180" />
              </button>
          </div>
      </div>
      
      {!isExpanded && (
          <div className="text-center border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => setIsExpanded(true)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold py-1 w-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors rounded-b-lg">
                  Xem chi tiết & điều kiện vé <ChevronDownIcon className="w-3 h-3 ml-1" />
              </button>
          </div>
      )}
    </div>
  );
};

export default FlightCard;
