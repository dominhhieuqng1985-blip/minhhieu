
import React, { useState, useMemo, useEffect } from 'react';
import { type FlightOption, type Passengers, type PassengerDetails, type ContactDetails, type BookingData, type FlightDetailsResult, type BookingOption, type AdminFeeConfig, User, SelectedAncillaries, AncillaryOption, FeeConfig, SearchParams, DestinationInfo } from '../types';
import { ArrowLeftIcon, ClockIcon, BriefcaseIcon, UserIcon, InfoIcon, CheckCircleIcon, TicketIcon, PhoneIcon, EnvelopeIcon, IdentificationIcon, CakeIcon, DownloadIcon, MailIcon, CloseIcon, PencilIcon, SearchIcon, CreditCardIcon, MapPinIcon, CheckIcon, CalendarIcon, PlaneIcon, SparklesIcon, UserGroupIcon, ChildIcon, InfantIcon, RefreshIcon, CloudSunIcon } from './icons/Icons';
import PhoneInput from './PhoneInput';
import ETicket from './ETicket';
import * as adminService from '../services/adminService';
import * as walletService from '../services/walletService';
import { getBaggageOptionsForAirline } from '../data/ancillaryData';
import CompactSearchForm from './CompactSearchForm';
import DestinationAssistant from './DestinationAssistant';
import { AIRPORTS, REGIONAL_AIRPORTS } from '../constants';
import { sendTelegramNotification } from '../services/telegramService';
import { getDestinationInfo, generateItinerary as fetchItinerary } from '../services/geminiService';
import { splitRoundTrip } from '../services/flightService';

interface CheckoutPageProps {
    flight: FlightOption;
    passengers: Passengers;
    onBack: () => void;
    onConfirmBooking: (bookingData: any) => void;
    isLoading: boolean;
    isDetailsLoading: boolean;
    bookingDetails: FlightDetailsResult | null;
    selectedOutboundOption: BookingOption | null;
    onSelectOutboundOption: (option: BookingOption) => void;
    selectedInboundOption: BookingOption | null;
    onSelectInboundOption: (option: BookingOption) => void;
    isBookingConfirmed: boolean;
    onNewSearch: () => void;
    onSearch: (params: SearchParams) => void;
    bookingData: BookingData | null;
    apiError: string | null;
    currentUser: User | null;
}

const USD_VND_RATE = 25400;

const formatCurrency = (amount: number, currency: 'VND' | 'USD' = 'VND') => {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString('vi-VN', options);
}

const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const removeDiacritics = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const capitalizeName = (name: string) => {
    if (!name) return '';
    return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const normalizePhone = (phone: string) => {
    if (!phone) return '+84';
    const cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('+')) return cleanPhone;
    if (cleanPhone.startsWith('0')) return '+84' + cleanPhone.substring(1);
    return '+84' + cleanPhone;
};

// NEW: Header Weather Widget for Fare Selection
const HeaderWeatherWidget: React.FC<{ destinationCode: string }> = ({ destinationCode }) => {
    const [weather, setWeather] = useState<string>('Đang cập nhật thời tiết...');
    const airport = AIRPORTS.find(a => a.id === destinationCode);
    const city = airport ? airport.name.replace(/\(.*\)/, '').trim() : destinationCode;

    useEffect(() => {
        const loadWeather = () => {
            try {
                const cacheRaw = sessionStorage.getItem(CHECKOUT_INFO_CACHE_KEY);
                if (cacheRaw) {
                    const cache = JSON.parse(cacheRaw);
                    if (cache[destinationCode] && cache[destinationCode].weatherForecast) {
                        setWeather(cache[destinationCode].weatherForecast);
                        return true;
                    }
                }
            } catch (e) {}
            return false;
        };

        if (!loadWeather()) {
            const interval = setInterval(() => {
                if (loadWeather()) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [destinationCode]);

    return (
        <div className="flex items-center gap-3 animate-fade-in">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full text-yellow-600 dark:text-yellow-400 shadow-sm border border-yellow-200 dark:border-yellow-700">
                <CloudSunIcon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-sm sm:text-base leading-tight">
                    Sắp đến {city}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] sm:max-w-xs truncate font-medium">
                    {weather}
                </p>
            </div>
        </div>
    );
};

const CHECKOUT_INFO_CACHE_KEY = 'checkoutDestInfoCache';

const CheckoutDestinationInfo: React.FC<{ destinationCode: string }> = ({ destinationCode }) => {
    const [info, setInfo] = useState<DestinationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [cityName, setCityName] = useState('');

    useEffect(() => {
        const fetchInfo = async () => {
            setLoading(true);
            const airport = AIRPORTS.find(a => a.id === destinationCode);
            const destName = airport ? airport.name.replace(/\s*\(.*\)/, '').trim() : destinationCode;
            setCityName(destName);

            try {
                const cacheRaw = sessionStorage.getItem(CHECKOUT_INFO_CACHE_KEY);
                if (cacheRaw) {
                    const cache = JSON.parse(cacheRaw);
                    if (cache[destinationCode]) {
                        setInfo(cache[destinationCode]);
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {}

            try {
                const data = await getDestinationInfo(destName);
                if (data) {
                    setInfo(data);
                    const currentCache = sessionStorage.getItem(CHECKOUT_INFO_CACHE_KEY) 
                        ? JSON.parse(sessionStorage.getItem(CHECKOUT_INFO_CACHE_KEY)!) 
                        : {};
                    currentCache[destinationCode] = data;
                    sessionStorage.setItem(CHECKOUT_INFO_CACHE_KEY, JSON.stringify(currentCache));
                }
            } catch (e) {
                console.error("AI Info error on checkout:", e);
            } finally {
                setLoading(false);
            }
        };
        if (destinationCode) fetchInfo();
    }, [destinationCode]);

    return (
        <div className="mb-6">
            <DestinationAssistant info={info} cityName={cityName} loading={loading} />
        </div>
    );
};

const ItineraryGenerator: React.FC<{ destination: string }> = ({ destination }) => {
    const [itinerary, setItinerary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const generateItinerary = async () => {
        setLoading(true);
        try {
            const text = await fetchItinerary(destination);
            setItinerary(text || "Không thể tạo lịch trình.");
        } catch (e) {
            console.error(e);
            alert("Lỗi khi tạo lịch trình.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="font-bold text-lg text-indigo-800 dark:text-indigo-300">AI Lên Lịch Trình Du Lịch</h3>
            </div>
            
            {!itinerary ? (
                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Bạn chưa biết đi đâu, ăn gì tại {destination}? Hãy để AI gợi ý lịch trình 3 ngày 2 đêm hoàn hảo cho bạn!</p>
                    <button 
                        onClick={generateItinerary} 
                        disabled={loading}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow transition disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                        {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <SparklesIcon className="w-5 h-5" />}
                        {loading ? "Đang tạo..." : "Tạo lịch trình ngay"}
                    </button>
                </div>
            ) : (
                <div className="mt-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-inner max-h-96 overflow-y-auto prose dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{itinerary}</pre>
                </div>
            )}
        </div>
    );
}

const BookingSteps: React.FC<{ currentStep: 'select' | 'book' | 'complete' }> = ({ currentStep }) => {
    const steps = [
        { id: 'select', label: '1. Chọn chuyến bay', num: 1 },
        { id: 'book', label: '2. Đặt chỗ', num: 2 },
        { id: 'complete', label: '3. Hoàn tất', num: 3 },
    ];

    const stepIds = steps.map(s => s.id);
    const currentIdx = stepIds.indexOf(currentStep);

    return (
        <div className="w-full max-w-7xl mx-auto mb-6">
            <div className="flex h-12 w-full drop-shadow-sm">
                {steps.map((step, index) => {
                    const isActive = index <= currentIdx;
                    let bgClass = 'bg-gray-200';
                    let textClass = 'text-gray-500';
                    let borderClass = 'border-gray-400';
                    let arrowColor = '#e5e7eb';
                    
                    if (isActive) {
                        bgClass = 'bg-[#0f7194]';
                        textClass = 'text-white';
                        borderClass = 'border-white';
                        arrowColor = '#0f7194';
                    }
                    const zIndex = 50 - index; 

                    return (
                        <div 
                            key={step.id} 
                            className={`relative flex-1 flex items-center justify-center ${bgClass} ${textClass} transition-colors duration-300 ${index === 0 ? 'rounded-l-lg' : ''} ${index === steps.length - 1 ? 'rounded-r-lg' : ''}`}
                            style={{ zIndex }} 
                        >
                            <div className={`flex items-center gap-2 sm:gap-3 relative z-10 ${index !== 0 ? 'pl-8 sm:pl-10' : ''} pr-2`}>
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${borderClass}`}>
                                    {step.num}
                                </div>
                                <span className="hidden sm:inline font-bold text-xs sm:text-sm uppercase">
                                    {step.label.split('. ')[1]}
                                </span>
                                 <span className="sm:hidden font-bold text-xs uppercase">
                                    {step.label.split('. ')[1].split(' ')[0]}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <>
                                    <div className="absolute top-0 bottom-0 right-0 z-20" style={{ right: '-24px', width: 0, height: 0, borderTop: '24px solid transparent', borderBottom: '24px solid transparent', borderLeft: '24px solid white' }} />
                                    <div className="absolute top-0 bottom-0 right-0 z-30" style={{ right: '-20px', width: 0, height: 0, borderTop: '24px solid transparent', borderBottom: '24px solid transparent', borderLeft: `20px solid ${arrowColor}` }} />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const FlightSummaryHeader: React.FC<{ flight: FlightOption }> = ({ flight }) => {
    if (!flight || !flight.flights.length) return null;
    const firstLeg = flight.flights[0];
    const lastLeg = flight.flights[flight.flights.length - 1];
    
    const getLocStr = (id: string) => {
         const airport = AIRPORTS.find(a => a.id === id);
         if (!airport) return id;
         
         const nameParts = airport.name.match(/(.*?)\s*\(/);
         const city = nameParts ? nameParts[1].trim() : airport.name;

         // Check if domestic airport using the constants
         const isDomestic = REGIONAL_AIRPORTS['Việt Nam'].some(a => a.id === id);

         if (isDomestic) {
             return `${city}, Việt Nam (${id})`;
         }
         // International airports in constants already contain country usually, or we just display city
         return `${city} (${id})`;
    };

    const departureStr = getLocStr(firstLeg.departure_airport.id);
    const arrivalStr = getLocStr(lastLeg.arrival_airport.id);
    const dateObj = new Date(firstLeg.departure_airport.time);
    const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'long' });
    const datePart = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
    const formattedDateStr = `${dayName}, ${datePart}`;

    return (
        <div className="w-full max-w-7xl mx-auto bg-[#0f7194] text-white p-3 sm:p-4 mb-6 shadow-md flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0">
                <PlaneIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white transform -rotate-45" />
            </div>
            <div className="flex flex-col">
                <div className="text-base sm:text-xl font-bold flex flex-wrap items-center gap-2">
                    <span>{departureStr}</span>
                    <span>➜</span>
                    <span>{arrivalStr}</span>
                </div>
                <div className="text-sm font-medium italic opacity-90">
                    {formattedDateStr}
                </div>
            </div>
        </div>
    );
};

type PassengerAncillaries = {
    outboundBaggage?: AncillaryOption;
    inboundBaggage?: AncillaryOption;
};

const DetailedFlightSummary: React.FC<{ 
    details: FlightDetailsResult, 
    selectedOutboundOption: BookingOption | null, 
    selectedInboundOption: BookingOption | null,
    ancillaries?: SelectedAncillaries | PassengerAncillaries[]
}> = ({ details, selectedOutboundOption, selectedInboundOption, ancillaries }) => {
    
    const getBaggageInfo = (isReturn: boolean) => {
        if (!ancillaries) return null;
        let extraBaggageNames: string[] = [];
        if (Array.isArray(ancillaries)) {
            ancillaries.forEach(p => {
                const bag = isReturn ? p.inboundBaggage : p.outboundBaggage;
                if (bag) extraBaggageNames.push(bag.name);
            });
        } else {
            const bag = isReturn ? ancillaries.inboundBaggage : ancillaries.outboundBaggage;
            if (bag) extraBaggageNames.push(bag.name);
        }
        if (extraBaggageNames.length === 0) return null;
        const counts: Record<string, number> = {};
        extraBaggageNames.forEach(name => counts[name] = (counts[name] || 0) + 1);
        return Object.entries(counts).map(([name, count]) => count > 1 ? `${name} (x${count})` : name).join(', ');
    };

    const renderFareDetails = (option: BookingOption | null, title: string, isReturn: boolean) => {
        if (!option) return null;
        const extraBaggageText = getBaggageInfo(isReturn);
        return (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                    <TicketIcon className="w-5 h-5 text-blue-600"/>
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 text-lg">{title}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Hạng vé:</p>
                        <p className="text-gray-900 dark:text-white font-bold">{option.together.option_title || 'Phổ thông'}</p>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mt-2">Điều kiện vé:</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 pl-1">
                            {option.together.extensions.map((cond, i) => <li key={i}>{cond}</li>)}
                        </ul>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Hành lý & Dịch vụ:</p>
                        <ul className="space-y-1 mt-1">
                             {option.together.baggage_prices.map((item, i) => (
                                <li key={i} className="flex items-start text-gray-700 dark:text-gray-300">
                                    <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500 mt-0.5 flex-shrink-0"/>
                                    <span>{item}</span>
                                </li>
                            ))}
                            {extraBaggageText && (
                                <li className="flex items-start text-blue-700 dark:text-blue-300 font-semibold bg-white dark:bg-gray-700 p-2 rounded border border-blue-100 dark:border-blue-900">
                                    <BriefcaseIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"/>
                                    <span>Mua thêm: {extraBaggageText}</span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-bg-color)] p-6 rounded-xl shadow-md space-y-5 border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-[var(--text-color)] border-b border-[var(--border-color)] pb-3 mb-4 flex items-center gap-2">
                <TicketIcon className="w-6 h-6 text-red-600"/> Chi tiết hành trình
            </h3>
            {details.selected_flights.map((leg, legIndex) => (
                <div key={legIndex}>
                    <h4 className="font-bold text-lg text-red-700 mb-3 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg inline-block">{leg.type}</h4>
                    {leg.flights.map((flight, flightIndex) => (
                        <React.Fragment key={flightIndex}>
                             <div className="mb-2 pb-2 last:border-b-0 last:pb-0 last:mb-0 relative pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{formatDate(flight.departure_airport.time)}</p>
                                 <div className="flex items-start space-x-4">
                                    <img src={flight.airline_logo} alt={flight.airline} className="h-10 w-10 object-contain" />
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-center">
                                            <div className="text-left">
                                                <p className="font-bold text-lg">{new Date(flight.departure_airport.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">{flight.departure_airport.id}</p>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 text-center flex-grow mx-4 relative">
                                                <div className="border-t border-dashed w-full border-[var(--border-color)] absolute top-1/2"></div>
                                                <div className="relative z-10 bg-[var(--card-bg-color)] px-2 inline-flex items-center justify-center"><ClockIcon className="mr-1 w-3 h-3" /><span>{formatDuration(flight.duration)}</span></div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{new Date(flight.arrival_airport.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">{flight.arrival_airport.id}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">{flight.airline} • {flight.flight_number}{flight.airplane ? ` • ${flight.airplane}` : ''}</p>
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    ))}
                    {legIndex === 0 && renderFareDetails(selectedOutboundOption, "Gói vé chuyến đi", false)}
                    {legIndex === 1 && renderFareDetails(selectedInboundOption, "Gói vé chuyến về", true)}
                </div>
            ))}
        </div>
    );
};

const PriceDetails: React.FC<{ 
    priceData: any;
    passengers: Passengers;
    feeConfig: AdminFeeConfig | null;
}> = ({ priceData, passengers, feeConfig }) => {
    return (
        <div className="bg-[var(--card-bg-color)] p-6 rounded-xl shadow-md sticky top-4 border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-[var(--text-color)] border-b border-[var(--border-color)] pb-3 mb-4 flex items-center gap-2">
                <CreditCardIcon className="w-6 h-6 text-red-600"/> Chi tiết giá
            </h3>
            <div className="space-y-3 text-[var(--text-color)]">
                <div className="flex justify-between">
                    <span>Giá vé cơ bản ({passengers.adults + passengers.children}x)</span> 
                    <span className="font-medium">{formatCurrency(priceData.baseTotal)}</span>
                </div>
                {passengers.infants > 0 && <div className="flex justify-between"><span>Vé em bé ({passengers.infants}x)</span> <span>Liên hệ</span></div>}
                 
                 <div className="border-t border-[var(--border-color)] my-2 pt-2 space-y-2">
                    <div className="flex justify-between text-sm font-semibold text-gray-600 dark:text-gray-300">
                        <span>Thuế và Phí</span> 
                        <span>{feeConfig ? formatCurrency(priceData.tax + priceData.serviceFee) : '...'}</span>
                    </div>
                     {priceData.ancillaryCost > 0 && (
                        <div className="flex justify-between text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                            <span>Hành lý mua thêm</span> 
                            <span>{formatCurrency(priceData.ancillaryCost)}</span>
                        </div>
                    )}
                </div>
                <div className="border-t-2 border-dashed border-[var(--border-color)] my-2"></div>
                <div className="flex justify-between font-bold text-xl items-center">
                    <span>Tổng cộng</span> 
                    <span className="text-red-600">{feeConfig ? formatCurrency(priceData.finalTotal) : 'Đang tính...'}</span>
                </div>
                <p className="text-xs text-right text-gray-500 mt-1 italic">Giá đã bao gồm thuế, phí và dịch vụ.</p>
            </div>
        </div>
    );
};

// SelectedFareDisplay
const SelectedFareDisplay: React.FC<{ legTitle: string, selectedOption: BookingOption | null, onChangeClick: () => void }> = ({ legTitle, selectedOption, onChangeClick }) => {
    if (!selectedOption) return <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg animate-pulse h-24"></div>;
    
    const { option_title, price, baggage_prices, airline_logos } = selectedOption.together;
    const baggageInfo = baggage_prices.find(b => b.toLowerCase().includes('xách tay')) || baggage_prices[0] || "Thông tin có trong chi tiết";

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-400 transition-colors group" onClick={onChangeClick}>
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-600 dark:text-gray-400">{legTitle}</h4>
                <button onClick={(e) => { e.stopPropagation(); onChangeClick(); }} className="text-xs bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors shadow-sm">
                    Đổi gói vé
                </button>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {airline_logos[0] && <img src={airline_logos[0]} alt="airline logo" className="h-10 w-10 object-contain flex-shrink-0" />}
                <div className="flex-grow">
                    <p className="font-bold text-lg text-[var(--text-color)] group-hover:text-blue-600 transition-colors">{option_title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{baggageInfo}</p>
                </div>
                <div className="flex-shrink-0 text-left sm:text-right">
                    <p className="font-bold text-xl text-red-600">{formatCurrency(price * USD_VND_RATE)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">/ khách (Giá gốc)</p>
                </div>
            </div>
        </div>
    );
};

// FareSelectionModal
const FareSelectionModal: React.FC<{ isOpen: boolean, onClose: () => void, options: BookingOption[], selectedOption: BookingOption | null, onSelect: (option: BookingOption) => void, title: string }> = ({ isOpen, onClose, options, selectedOption, onSelect, title }) => {
    if (!isOpen) return null;
    const [tempSelected, setTempSelected] = useState<BookingOption | null>(selectedOption);

    const handleConfirm = () => {
        if (tempSelected) onSelect(tempSelected);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-[var(--card-bg-color)] rounded-lg shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {options.map((option, idx) => {
                        const isSelected = tempSelected === option;
                        return (
                            <div 
                                key={idx} 
                                onClick={() => setTempSelected(option)}
                                className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 ${isSelected ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300' : 'border-gray-200 dark:border-gray-600 hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <div className="flex items-start gap-4">
                                    <input type="radio" name="modal-booking-option" checked={isSelected} readOnly className="h-5 w-5 text-red-600 border-gray-300 focus:ring-red-500 flex-shrink-0 mt-1" />
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-lg text-[var(--text-color)]">{option.together.option_title}</h4>
                                                <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                                    {option.together.baggage_prices.map((item, i) => (
                                                        <li key={i} className="flex items-center"><CheckCircleIcon className="w-4 h-4 mr-2 text-gray-500"/> {item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-4">
                                                <p className="font-bold text-lg text-red-600">{formatCurrency(option.together.price * USD_VND_RATE)}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">/ khách</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
                                            <h5 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Điều kiện vé:</h5>
                                            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1 mt-1">
                                                {option.together.extensions.map((ext, i) => <li key={i}>{ext}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-[var(--border-color)] text-right flex-shrink-0">
                    <button onClick={handleConfirm} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors">
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
};

// BookingForm
interface BookingFormProps {
    passengers: Passengers;
    flight: FlightOption;
    onSubmit: (data: any) => void;
    isLoading: boolean;
    apiError: string | null;
    currentUser: User | null;
    ancillaries: any;
    onAncillaryChange: any;
}

const BookingForm: React.FC<BookingFormProps> = ({ passengers, flight, onSubmit, isLoading, apiError, currentUser, ancillaries, onAncillaryChange }) => {
    const isIntl = useMemo(() => {
        const vietnamAirports = new Set(REGIONAL_AIRPORTS['Việt Nam'].map(a => a.id));
        const dep = flight.flights[0].departure_airport.id;
        const arr = flight.flights[flight.flights.length - 1].arrival_airport.id;
        return !vietnamAirports.has(dep) || !vietnamAirports.has(arr);
    }, [flight]);

    // Split outbound and inbound to determine airline for each leg
    const { outbound, inbound } = useMemo(() => {
        if (flight.type.toLowerCase().includes('round')) {
            return splitRoundTrip(flight.flights);
        }
        return { outbound: flight.flights, inbound: [] };
    }, [flight]);

    // Get airline name for each leg to load specific baggage options
    const outboundAirline = outbound[0]?.airline || 'default';
    const inboundAirline = inbound[0]?.airline || 'default';

    const outboundBaggageOptions = useMemo(() => getBaggageOptionsForAirline(outboundAirline, isIntl), [outboundAirline, isIntl]);
    const inboundBaggageOptions = useMemo(() => getBaggageOptionsForAirline(inboundAirline, isIntl), [inboundAirline, isIntl]);

    const initialPassengers: PassengerDetails[] = useMemo(() => {
        const adults = Array(passengers.adults).fill(null).map(() => ({ fullName: '', title: 'Mr' as const, gender: 'Male' as const, dob: '', idNumber: '', type: 'Adult' as const }));
        const children = Array(passengers.children).fill(null).map(() => ({ fullName: '', title: 'Master' as const, gender: 'Male' as const, dob: '', idNumber: '', type: 'Child' as const }));
        const infants = Array(passengers.infants).fill(null).map(() => ({ fullName: '', title: 'Master' as const, gender: 'Male' as const, dob: '', idNumber: '', type: 'Infant' as const }));
        return [...adults, ...children, ...infants];
    }, [passengers]);

    const [passengerData, setPassengerData] = useState<PassengerDetails[]>(initialPassengers);
    const [contactDetails, setContactDetails] = useState<ContactDetails>({ fullName: '', email: '', phone: '+84', gender: 'Mr', address: '' });
    const [copyContactToFirstPassenger, setCopyContactToFirstPassenger] = useState(false);

    useEffect(() => {
        if (currentUser) {
            const gender = currentUser.gender || 'Male';
            const contactGender = (gender === 'Female' || gender === 'Nữ' || gender === 'Mrs' || gender === 'Miss') ? 'Mrs' : 'Mr';
            setContactDetails({
                fullName: capitalizeName(currentUser.name || ''),
                email: currentUser.email || '',
                phone: normalizePhone(currentUser.phone || ''),
                gender: contactGender,
                address: currentUser.address || ''
            });
        }
    }, [currentUser]);

    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }[]>(initialPassengers.map(() => ({})));
    
    const departureDate = useMemo(() => new Date(flight.flights[0].departure_airport.time), [flight]);
    const isRoundTrip = flight.type.toLowerCase().includes('round');

    const validateDob = (dob: string, type: 'Adult' | 'Child' | 'Infant') => {
        if (!dob) return;
        const age = (new Date(departureDate).getTime() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 0) return 'Ngày sinh không hợp lệ.';
        
        switch (type) {
            case 'Adult':
                if (age < 12) return 'Người lớn phải từ 12 tuổi trở lên.';
                break;
            case 'Child':
                if (age < 2 || age >= 12) return 'Trẻ em phải từ 2 đến dưới 12 tuổi.';
                break;
            case 'Infant':
                if (age >= 2) return 'Em bé phải dưới 2 tuổi.';
                break;
        }
    };

    const handlePassengerChange = (index: number, field: keyof PassengerDetails, value: string) => {
        const updatedPassengers = [...passengerData];
        let finalValue = value;
        if (field === 'fullName') {
            finalValue = removeDiacritics(value).toUpperCase();
        }
        if (field === 'gender') {
            const gender = value as 'Male' | 'Female';
            const type = updatedPassengers[index].type;
            let title: any = 'Mr';
            if (type === 'Adult') title = gender === 'Male' ? 'Mr' : 'Mrs';
            else title = gender === 'Male' ? 'Master' : 'Miss';
            updatedPassengers[index].title = title;
        }

        updatedPassengers[index] = { ...updatedPassengers[index], [field]: finalValue };
        setPassengerData(updatedPassengers);

        if (field === 'dob') {
            const error = validateDob(value, updatedPassengers[index].type);
            const newErrors = [...validationErrors];
            newErrors[index] = { ...newErrors[index], dob: error || '' };
            setValidationErrors(newErrors);
        }
    };

    const splitName = (fullName: string) => {
        const parts = fullName.split(' ');
        const surname = parts.length > 0 ? parts[0] : '';
        const givenName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        return { surname, givenName };
    };

    const handleNameChange = (index: number, part: 'surname' | 'givenName', value: string) => {
        const currentFullName = passengerData[index].fullName || '';
        const nameParts = currentFullName.indexOf(' ');
        
        let surname = nameParts === -1 ? currentFullName : currentFullName.substring(0, nameParts);
        let givenName = nameParts === -1 ? '' : currentFullName.substring(nameParts + 1);

        if (nameParts === -1 && currentFullName.length > 0) {
            surname = currentFullName;
            givenName = '';
        }

        const upperValue = removeDiacritics(value).toUpperCase();

        if (part === 'surname') {
            const newFullName = givenName ? `${upperValue} ${givenName}` : upperValue;
            handlePassengerChange(index, 'fullName', newFullName);
        } else {
            const newFullName = surname ? `${surname} ${upperValue}` : upperValue;
            handlePassengerChange(index, 'fullName', newFullName);
        }
    };

    const handleContactChange = (field: keyof ContactDetails, value: string) => {
        let finalValue = value;
        if (field === 'fullName') finalValue = capitalizeName(value);
        
        setContactDetails(prev => {
            const newData = { ...prev, [field]: finalValue };
            
            if (copyContactToFirstPassenger && passengerData.length > 0) {
                const updatedPassengers = [...passengerData];
                if (field === 'fullName') updatedPassengers[0].fullName = removeDiacritics(finalValue).toUpperCase();
                if (field === 'gender') {
                    if (value === 'Mr') { updatedPassengers[0].gender = 'Male'; updatedPassengers[0].title = 'Mr'; }
                    else { updatedPassengers[0].gender = 'Female'; updatedPassengers[0].title = 'Mrs'; }
                }
                setPassengerData(updatedPassengers);
            }
            return newData;
        });
    };

    const handleCopyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setCopyContactToFirstPassenger(checked);
        if (checked && contactDetails.fullName && passengerData.length > 0) {
            const updatedPassengers = [...passengerData];
            updatedPassengers[0].fullName = removeDiacritics(contactDetails.fullName).toUpperCase();
            if (contactDetails.gender === 'Mr') { updatedPassengers[0].title = 'Mr'; updatedPassengers[0].gender = 'Male'; }
            else { updatedPassengers[0].title = 'Mrs'; updatedPassengers[0].gender = 'Female'; }
            setPassengerData(updatedPassengers);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        let isValid = true;
        const newErrors = passengerData.map(() => ({}));

        passengerData.forEach((p, idx) => {
            if (!p.fullName.trim() || p.fullName.trim().indexOf(' ') === -1) {
                if (!p.fullName.trim()) {
                     (newErrors[idx] as any).fullName = "Vui lòng nhập đầy đủ Họ và Tên.";
                     isValid = false;
                }
            }
            
            if (p.dob) {
                const err = validateDob(p.dob, p.type);
                if (err) {
                    (newErrors[idx] as any).dob = err;
                    isValid = false;
                }
            } else if (p.type !== 'Adult') {
                (newErrors[idx] as any).dob = "Ngày sinh là bắt buộc.";
                isValid = false;
            }
        });
        setValidationErrors(newErrors);

        if (!contactDetails.fullName.trim() || !contactDetails.email.trim() || !contactDetails.phone.trim() || contactDetails.phone.length < 11) {
            setError('Vui lòng nhập đầy đủ và chính xác thông tin liên hệ.');
            isValid = false;
        } else if (!/^\S+@\S+\.\S+$/.test(contactDetails.email)) {
             setError('Vui lòng nhập địa chỉ email hợp lệ.');
             isValid = false;
        }

        if (!isValid) {
            if (!error) setError('Vui lòng kiểm tra lại các thông tin có lỗi màu đỏ.');
            return;
        }

        onSubmit({
            passengers: passengerData,
            contact: contactDetails,
            ancillaries: ancillaries
        });
    };

    const getPassengerLabel = (type: string) => {
        return type === 'Adult' ? 'Người lớn' : type === 'Child' ? 'Trẻ em' : 'Em bé';
    };
    
    const getSplitName = (fullName: string) => {
        const parts = fullName.split(' ');
        const surname = parts.length > 0 ? parts[0] : '';
        const givenName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        return { surname, givenName };
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[var(--card-bg-color)] rounded-xl shadow-md border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="flex items-center gap-3 mb-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                        <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        <h3 className="text-lg font-bold text-[var(--text-color)]">Thông tin liên hệ</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-2">
                         <div className="flex gap-3 items-end">
                            <div className="w-24">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase whitespace-nowrap">Danh xưng</label>
                                <select 
                                    value={contactDetails.gender} 
                                    onChange={e => handleContactChange('gender', e.target.value)}
                                    className="w-full h-11 px-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="Mr">Ông</option>
                                    <option value="Mrs">Bà</option>
                                </select>
                            </div>
                            <div className="flex-grow">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase whitespace-nowrap">Họ và tên <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={contactDetails.fullName} 
                                    onChange={e => handleContactChange('fullName', e.target.value)}
                                    required
                                    className="w-full h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="VD: Tran Huy Hoang"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase whitespace-nowrap">Điện thoại <span className="text-red-500">*</span></label>
                            <div className="h-11">
                                <PhoneInput 
                                    value={contactDetails.phone} 
                                    onChange={val => handleContactChange('phone', val)}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1 uppercase whitespace-nowrap">Email <span className="text-red-500">*</span></label>
                             <input 
                                type="email" 
                                value={contactDetails.email} 
                                onChange={e => handleContactChange('email', e.target.value)}
                                required
                                className="w-full h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                             />
                        </div>
                        
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1 uppercase whitespace-nowrap">Địa chỉ</label>
                             <input 
                                type="text" 
                                value={contactDetails.address} 
                                onChange={e => handleContactChange('address', e.target.value)}
                                className="w-full h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                             />
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                            <UserGroupIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            <h3 className="text-lg font-bold text-[var(--text-color)]">Thông tin khách hàng</h3>
                        </div>
                        {passengerData[0].type === 'Adult' && (
                             <label className="flex items-center gap-2 cursor-pointer text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors bg-white dark:bg-gray-700 px-3 py-1.5 rounded-full border border-blue-200 dark:border-gray-600 shadow-sm">
                                <input 
                                    type="checkbox" 
                                    checked={copyContactToFirstPassenger} 
                                    onChange={handleCopyContactChange}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                Sao chép từ người liên hệ
                            </label>
                        )}
                    </div>
                    
                    <div className="hidden md:grid grid-cols-12 gap-4 mb-2 px-5 font-bold text-[11px] text-gray-500 uppercase tracking-wider items-center whitespace-nowrap">
                        <div className="col-span-1">Khách</div>
                        <div className="col-span-2">Giới tính <span className="text-red-500">*</span></div>
                        <div className="col-span-2">Họ (Viết hoa) <span className="text-red-500">*</span></div>
                        <div className="col-span-3">Đệm & tên <span className="text-red-500">*</span></div>
                        <div className="col-span-2">Ngày sinh <span className="text-red-500">*</span></div>
                        <div className="col-span-2">CCCD/Passport</div>
                    </div>

                    <div className="space-y-0">
                        {passengerData.map((passenger, index) => {
                            const { surname, givenName } = getSplitName(passenger.fullName);
                            const dobError = (validationErrors[index] as any)?.dob;
                            
                            return (
                            <div key={index} className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 shadow-sm hover:shadow-md transition-all">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 xl:gap-5 items-start">
                                    <div className="md:col-span-1 flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 h-11">
                                        {passenger.type === 'Adult' ? <UserIcon className="w-5 h-5 text-gray-500"/> : passenger.type === 'Child' ? <ChildIcon className="w-5 h-5 text-gray-500"/> : <InfantIcon className="w-5 h-5 text-gray-500"/>}
                                        <span className="whitespace-nowrap md:hidden">{getPassengerLabel(passenger.type)} {index + 1}</span>
                                        <span className="hidden md:inline whitespace-nowrap">{index + 1}</span>
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="md:hidden text-xs font-bold text-gray-500 mb-1 block">Giới tính</label>
                                        <select 
                                            value={passenger.gender} 
                                            onChange={e => handlePassengerChange(index, 'gender', e.target.value)}
                                            className="w-full h-11 px-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="Male">Nam</option>
                                            <option value="Female">Nữ</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="md:hidden text-xs font-bold text-gray-500 mb-1 block">Họ</label>
                                        <input 
                                            type="text" 
                                            value={surname} 
                                            onChange={e => handleNameChange(index, 'surname', e.target.value)}
                                            className="w-full h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm uppercase placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none font-semibold"
                                            placeholder="HỌ"
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="md:hidden text-xs font-bold text-gray-500 mb-1 block">Đệm & Tên</label>
                                        <input 
                                            type="text" 
                                            value={givenName} 
                                            onChange={e => handleNameChange(index, 'givenName', e.target.value)}
                                            className="w-full h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm uppercase placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none font-semibold"
                                            placeholder="ĐỆM & TÊN"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="md:hidden text-xs font-bold text-gray-500 mb-1 block">Ngày sinh</label>
                                        <div className="relative">
                                            <input 
                                                type="date" 
                                                value={passenger.dob} 
                                                onChange={e => handlePassengerChange(index, 'dob', e.target.value)}
                                                className={`w-full h-11 px-2 border rounded-lg text-sm bg-white dark:bg-gray-700 outline-none focus:ring-1 focus:ring-blue-500 ${dobError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} `}
                                                placeholder="dd-MM-yyyy"
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="md:hidden text-xs font-bold text-gray-500 mb-1 block">CCCD/Passport</label>
                                        <input 
                                            type="text" 
                                            value={passenger.idNumber || ''} 
                                            onChange={e => handlePassengerChange(index, 'idNumber', e.target.value)}
                                            className="w-full h-11 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder="CCCD / Passport / VNeID L2"
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                    {isIntl ? (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 flex items-center gap-3">
                                            <InfoIcon className="w-5 h-5 flex-shrink-0" />
                                            <p className="text-sm font-semibold">Chặng bay quốc tế: Vui lòng mua hành lý ở bước thanh toán sau hoặc liên hệ Booker để được hỗ trợ giá tốt nhất.</p>
                                        </div>
                                    ) : (
                                        <div className={`grid grid-cols-1 ${isRoundTrip ? 'md:grid-cols-2' : ''} gap-6`}>
                                            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                    <div className="flex items-center gap-2 min-w-fit">
                                                        <img src={outbound[0]?.airline_logo} className="h-8 w-8 object-contain bg-white rounded-full p-0.5 shadow-sm" alt={outboundAirline} />
                                                        <div className="flex flex-col leading-tight">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase">{outboundAirline}</span>
                                                            <span className="font-bold text-blue-600 text-xs uppercase flex items-center gap-1">Chiều đi <PlaneIcon className="w-3 h-3 transform rotate-45"/></span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <select
                                                            className="w-full h-10 px-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-gray-200 cursor-pointer"
                                                            onChange={(e) => {
                                                                const selected = outboundBaggageOptions.find(opt => opt.id === e.target.value);
                                                                if (selected) onAncillaryChange(index, 'outbound', selected);
                                                            }}
                                                            value={ancillaries[index]?.outboundBaggage?.id || ""}
                                                        >
                                                            <option value="">Chọn hành lý ký gửi (Mặc định 0kg)</option>
                                                            {outboundBaggageOptions.map(opt => (
                                                                <option key={opt.id} value={opt.id}>{opt.name} - {formatCurrency(opt.price)}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {isRoundTrip && (
                                                <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800 shadow-sm">
                                                     <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                        <div className="flex items-center gap-2 min-w-fit">
                                                            <img src={inbound[0]?.airline_logo} className="h-8 w-8 object-contain bg-white rounded-full p-0.5 shadow-sm" alt={inboundAirline} />
                                                            <div className="flex flex-col leading-tight">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase">{inboundAirline}</span>
                                                                <span className="font-bold text-orange-600 text-xs uppercase flex items-center gap-1">Chiều về <PlaneIcon className="w-3 h-3 transform -rotate-135"/></span>
                                                            </div>
                                                        </div>
                                                        <div className="flex-grow">
                                                            <select
                                                                className="w-full h-10 px-2 border border-orange-200 dark:border-orange-700 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none focus:ring-1 focus:ring-orange-500 text-gray-700 dark:text-gray-200 cursor-pointer"
                                                                onChange={(e) => {
                                                                    const selected = inboundBaggageOptions.find(opt => opt.id === e.target.value);
                                                                    if (selected) onAncillaryChange(index, 'inbound', selected);
                                                                }}
                                                                value={ancillaries[index]?.inboundBaggage?.id || ""}
                                                            >
                                                                <option value="">Chọn hành lý ký gửi (Mặc định 0kg)</option>
                                                                {inboundBaggageOptions.map(opt => (
                                                                    <option key={opt.id} value={opt.id}>{opt.name} - {formatCurrency(opt.price)}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            </div>
            
            <div className="mt-6 space-y-2 text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800">
                <p className="flex items-center gap-2 font-bold text-red-600 mb-2"><InfoIcon className="w-5 h-5" />Quy định vé và giấy tờ (Cập nhật T12/2025)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ul className="list-none space-y-1">
                        <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> <span>Người lớn: 12+ tuổi. Dùng CCCD/Passport/VNeID L2.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> <span>Trẻ em: 2 - dưới 12 tuổi. Cần Giấy khai sinh bản gốc/Trích lục.</span></li>
                        <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> <span>Em bé: Dưới 2 tuổi. Ngồi chung ghế với người lớn.</span></li>
                    </ul>
                    <ul className="list-none space-y-1">
                        <li className="flex items-start gap-2"><span className="text-red-500 font-bold">!</span> <span>Họ tên trên vé phải trùng khớp 100% với giấy tờ.</span></li>
                        <li className="flex items-start gap-2"><span className="text-red-500 font-bold">!</span> <span>Phụ nữ mang thai trên 32 tuần cần giấy xác nhận sức khỏe.</span></li>
                        <li className="flex items-start gap-2"><span className="text-red-500 font-bold">!</span> <span>Có mặt tại sân bay trước giờ bay ít nhất 90 phút.</span></li>
                    </ul>
                </div>
            </div>

            <div className="bg-[var(--card-bg-color)] p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-800">
                {apiError && <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-4 border border-red-200 dark:border-red-800 animate-pulse"><InfoIcon className="w-6 h-6 flex-shrink-0" /><p className="text-sm font-semibold">{apiError}</p></div>}
                {error && <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg mb-4 border border-red-200 dark:border-red-800"><InfoIcon className="w-6 h-6 flex-shrink-0" /><p className="text-sm font-semibold">{error}</p></div>}
                
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:bg-gray-400 disabled:cursor-wait flex items-center justify-center shadow-xl hover:shadow-2xl hover:-translate-y-1 text-lg group"
                >
                    {isLoading ? (
                        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                        <>
                            <span>Hoàn tất đặt vé</span>
                            <ArrowLeftIcon className="w-5 h-5 ml-2 transform rotate-180 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

// BookingReviewModal
interface BookingReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (useWallet?: boolean) => void;
    data: any;
    priceData: any;
    flightDetails: FlightDetailsResult;
    isLoading: boolean;
    currentUser: User | null;
}

const BookingReviewModal: React.FC<BookingReviewModalProps> = ({ isOpen, onClose, onConfirm, data, priceData, flightDetails, isLoading, currentUser }) => {
    const isAgent = currentUser && (currentUser.role_level === 'f1' || currentUser.role_level === 'f2' || currentUser.role_level === 'admin');
    const balance = currentUser && currentUser.balance ? Number(currentUser.balance) : 0;
    const total = priceData.finalTotal;
    
    const commissionRate = walletService.calculateCommission(currentUser?.role_level, 0, (currentUser as any)?.commission_rate);
    const numPax = data.passengers.length;
    const estimatedCommission = commissionRate * numPax;
    
    const canPayWithWallet = isAgent && balance >= total;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <CheckCircleIcon className="text-green-500 w-6 h-6" /> Xác nhận hành trình
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 bg-gray-200 dark:bg-gray-700 rounded-full transition">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    <div className="space-y-4">
                        {flightDetails.selected_flights.map((leg, idx) => {
                            const first = leg.flights[0];
                            const last = leg.flights[leg.flights.length - 1];
                            const isOutbound = idx === 0;
                            const bgClass = isOutbound ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
                            const textClass = isOutbound ? "text-blue-800 dark:text-blue-300" : "text-orange-800 dark:text-orange-300";
                            const label = isOutbound ? "Chuyến đi" : "Chuyến về";

                            return (
                                <div key={idx} className={`p-4 rounded-xl border ${bgClass}`}>
                                    <div className={`font-bold uppercase text-xs tracking-wider mb-3 ${textClass} flex justify-between items-center`}>
                                        <span>{label} • {formatDate(first.departure_airport.time)}</span>
                                        <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                            {formatDuration(leg.total_duration)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <img src={first.airline_logo} alt={first.airline} className="w-8 h-8 object-contain bg-white rounded p-0.5 shadow-sm" />
                                        <div>
                                            <div className="font-bold text-sm text-gray-800 dark:text-white">{first.airline}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{first.flight_number} • {first.airplane}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between relative px-2">
                                        <div className="text-left z-10">
                                            <div className="font-bold text-2xl text-gray-800 dark:text-white">{formatTime(first.departure_airport.time)}</div>
                                            <div className="font-bold text-sm text-gray-500 dark:text-gray-400">{first.departure_airport.id}</div>
                                        </div>
                                        
                                        <div className="absolute left-16 right-16 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                            <div className={`w-full h-[2px] ${isOutbound ? 'bg-blue-300 dark:bg-blue-700' : 'bg-orange-300 dark:bg-orange-700'}`}></div>
                                            <div className={`absolute p-1 rounded-full bg-white dark:bg-gray-800 border ${isOutbound ? 'border-blue-300' : 'border-orange-300'}`}>
                                                <svg className={`w-3 h-3 ${isOutbound ? 'text-blue-500 rotate-90' : 'text-orange-500 -rotate-90'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                                            </div>
                                        </div>

                                        <div className="text-right z-10">
                                            <div className="font-bold text-2xl text-gray-800 dark:text-white">{formatTime(last.arrival_airport.time)}</div>
                                            <div className="font-bold text-sm text-gray-500 dark:text-gray-400">{last.arrival_airport.id}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wider border-b pb-1 mb-2">Hành khách ({data.passengers.length})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {data.passengers.map((p: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                        <UserIcon className="w-3 h-3 text-gray-500" />
                                    </div>
                                    <span className="font-semibold uppercase">{p.title} {p.fullName}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wider border-b pb-1 mb-2">Liên hệ</h3>
                        <div className="text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded space-y-1">
                            <p><span className="text-gray-500 w-20 inline-block">Họ tên:</span> <strong>{data.contact.fullName}</strong></p>
                            <p><span className="text-gray-500 w-20 inline-block">SĐT:</span> <strong>{data.contact.phone}</strong></p>
                            <p><span className="text-gray-500 w-20 inline-block">Email:</span> {data.contact.email}</p>
                        </div>
                    </div>
                    
                    {isAgent && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-sm font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                                    <CreditCardIcon className="w-4 h-4" /> Số dư ví đại lý:
                                </div>
                                <div className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                    {formatCurrency(balance)}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm border-t border-purple-200 dark:border-purple-800 pt-2">
                                <span className="text-gray-600 dark:text-gray-300">Hoa hồng dự kiến (+):</span>
                                <span className="text-green-600 font-bold">+{formatCurrency(estimatedCommission)}</span>
                            </div>

                            {canPayWithWallet ? (
                                <div className="mt-2 text-xs text-green-600 dark:text-green-400 italic">
                                    * Số dư sau thanh toán: {formatCurrency(balance - total + estimatedCommission)}
                                </div>
                            ) : (
                                <div className="mt-2 text-xs text-red-600 italic">
                                    * Không đủ số dư để thanh toán bằng ví.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-4 rounded-xl">
                        <span className="font-bold text-gray-600 dark:text-gray-300">Tổng thanh toán:</span>
                        <span className="text-2xl font-bold text-red-600">{formatCurrency(priceData.finalTotal)}</span>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 flex-wrap">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-gray-600 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        Quay lại
                    </button>
                    
                    {isAgent && canPayWithWallet && (
                         <button 
                            onClick={() => onConfirm(true)} 
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <CreditCardIcon className="w-5 h-5" />}
                            Thanh toán Ví
                        </button>
                    )}

                    <button 
                        onClick={() => onConfirm(false)} 
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                    >
                         {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <CheckCircleIcon className="w-5 h-5" />}
                         {isAgent ? 'Giữ chỗ (Trả sau)' : 'Xác nhận & Xuất vé'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// BookingConfirmation
interface BookingConfirmationProps {
    onNewSearch: () => void;
    bookingData: BookingData;
    onShowTicket: () => void;
    searchParamsForCompactForm: SearchParams | null;
    onSearch: (params: SearchParams) => void;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ onNewSearch, bookingData, onShowTicket, searchParamsForCompactForm, onSearch }) => {
    useEffect(() => {
        sendTelegramNotification(bookingData);
    }, [bookingData]);

    const destCode = bookingData.flight.flights[bookingData.flight.flights.length - 1].arrival_airport.id;
    const cityName = AIRPORTS.find(a => a.id === destCode)?.name.replace(/\s*\(.*\)/, '').trim() || destCode;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <BookingSteps currentStep="complete" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-8">
                <div className="lg:col-span-2 max-w-4xl mx-auto bg-[var(--card-bg-color)] p-6 sm:p-8 rounded-lg shadow-lg w-full">
                    <div className="text-center border-b border-[var(--border-color)] pb-4 mb-6">
                        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                        <h2 className="mt-4 text-3xl font-bold text-[var(--text-color)]">Yêu cầu đặt vé đã được gửi!</h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">
                            Cảm ơn <span className="font-semibold">{bookingData.contact.fullName}</span>, chúng tôi đã nhận được yêu cầu của bạn.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center sm:text-left mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-[var(--border-color)]">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Mã đơn hàng</p>
                            <p className="font-bold text-xl text-red-600 tracking-wider">{bookingData.id}</p>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Mã đặt chỗ (PNR)</p>
                            <p className="font-bold text-xl text-red-600 tracking-wider">{bookingData.pnr}</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <DetailedFlightSummary 
                            details={bookingData.bookingDetails} 
                            selectedOutboundOption={bookingData.selectedOutboundOption} 
                            selectedInboundOption={bookingData.selectedInboundOption} 
                            ancillaries={bookingData.ancillaries}
                        />
                    </div>
                    
                    <ItineraryGenerator destination={cityName} />

                    <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-orange-800 dark:text-orange-200 flex items-start gap-3">
                        <InfoIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold">Lưu ý quan trọng về Giá vé & Xuất vé</h4>
                            <p className="text-sm mt-1">
                                Giá vé và tình trạng chỗ có thể thay đổi tùy thuộc vào thời điểm xuất vé thực tế của Hãng hàng không. 
                                Quý khách vui lòng hoàn tất thanh toán sớm để đảm bảo giữ được mức giá và hành trình đã chọn. 
                                Vé chỉ được coi là xuất thành công khi có xác nhận Số vé điện tử từ nhân viên phòng vé.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300">Bước tiếp theo là gì?</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Nhân viên sẽ sớm kiểm tra tình trạng vé và liên hệ với bạn qua SĐT <strong className="whitespace-nowrap">{bookingData.contact.phone}</strong> hoặc email <strong className="whitespace-nowrap">{bookingData.contact.email}</strong> để xác nhận và hướng dẫn thanh toán.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-[var(--border-color)] pt-6 mt-6">
                        <button
                            onClick={onNewSearch}
                            className="w-full sm:w-auto bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-300"
                        >
                            Tìm kiếm mới
                        </button>
                         <button
                            onClick={onShowTicket}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-300"
                        >
                            <DownloadIcon />
                            Xem & Tải vé điện tử
                        </button>
                    </div>
                </div>
                
                 <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[var(--card-bg-color)] p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-bold mb-3 text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <SearchIcon className="w-5 h-5" /> Tìm vé khác
                        </h3>
                        <CompactSearchForm onSearch={onSearch} initialParams={searchParamsForCompactForm} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckoutPage: React.FC<CheckoutPageProps> = (props) => {
    const { flight, passengers, onBack, onConfirmBooking, isLoading, isDetailsLoading, bookingDetails, selectedOutboundOption, onSelectOutboundOption, selectedInboundOption, onSelectInboundOption, isBookingConfirmed, onNewSearch, onSearch, bookingData, apiError, currentUser } = props;
    const [showTicket, setShowTicket] = useState(false);
    const [fareSelectionModal, setFareSelectionModal] = useState<'outbound' | 'inbound' | null>(null);
    
    const totalPricedPassengers = passengers.adults + passengers.children;
    const [passengerAncillaries, setPassengerAncillaries] = useState<PassengerAncillaries[]>(() => Array(totalPricedPassengers).fill({}));
    
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingBookingData, setPendingBookingData] = useState<(Pick<BookingData, 'passengers' | 'contact'> & { ancillaries: PassengerAncillaries[] }) | null>(null);

    const [feeConfig, setFeeConfig] = useState<AdminFeeConfig | null>(null);

    useEffect(() => {
        adminService.getFeeConfig().then(setFeeConfig);
    }, []);
    
    const currentSearchParams = useMemo((): SearchParams | null => {
        if (!flight || !flight.flights || flight.flights.length === 0) return null;
        
        const firstLeg = flight.flights[0];
        const isRoundTrip = flight.type.toLowerCase().includes('round');
        
        return {
            departure_id: firstLeg.departure_airport.id,
            arrival_id: firstLeg.arrival_airport.id,
            outbound_date: new Date(firstLeg.departure_airport.time).toISOString().split('T')[0],
            type: isRoundTrip ? 'round_trip' : 'one_way',
            passengers: passengers
        };
    }, [flight, passengers]);


    useEffect(() => {
      setPassengerAncillaries(Array(totalPricedPassengers).fill({}));
    }, [totalPricedPassengers]);

    const isRoundTrip = flight.type.toLowerCase().includes('round');

    const handleAncillaryChange = (index: number, type: 'outbound' | 'inbound', value: AncillaryOption) => {
        const newAncillaries = [...passengerAncillaries];
        if (type === 'outbound') {
            newAncillaries[index] = { ...newAncillaries[index], outboundBaggage: value };
        } else {
            newAncillaries[index] = { ...newAncillaries[index], inboundBaggage: value };
        }
        setPassengerAncillaries(newAncillaries);
    };

    const priceData = useMemo(() => {
        const pricedPassengers = passengers.adults + passengers.children;
        if (!selectedOutboundOption || pricedPassengers === 0) {
            return { baseTotal: 0, tax: 0, serviceFee: 0, ancillaryCost: 0, finalTotal: 0 };
        }

        const outboundFareUSD = selectedOutboundOption.together.price;
        const inboundFareUSD = (isRoundTrip && selectedInboundOption) 
            ? selectedInboundOption.together.price 
            : 0;
        
        const currentAncillaryCost = passengerAncillaries.reduce((total, p) => {
            return total + (p.outboundBaggage?.price || 0) + (p.inboundBaggage?.price || 0);
        }, 0);

        const currentBaseTotal = (outboundFareUSD + inboundFareUSD) * USD_VND_RATE * pricedPassengers;

        const primaryAirline = flight.flights[0]?.airline;
        const departureAirport = flight.flights[0]?.departure_airport.id;
        const arrivalAirport = flight.flights[flight.flights.length - 1]?.arrival_airport.id;
        
        const pricing = adminService.calculateAdditivePrice(
            currentBaseTotal,
            feeConfig,
            primaryAirline,
            departureAirport,
            arrivalAirport,
            passengers,
            isRoundTrip 
        );
        
        return { 
            baseTotal: currentBaseTotal, 
            tax: pricing.tax, 
            serviceFee: pricing.serviceFee, 
            ancillaryCost: currentAncillaryCost, 
            finalTotal: pricing.finalTotal + currentAncillaryCost 
        };
        
    }, [flight, passengers, selectedOutboundOption, selectedInboundOption, feeConfig, passengerAncillaries, isRoundTrip]);


    const handleFormSubmit = (formData: { passengers: PassengerDetails[]; contact: ContactDetails; ancillaries: PassengerAncillaries[] }) => {
        setPendingBookingData(formData);
        setIsConfirmModalOpen(true);
    };

    const handleFinalConfirmation = async (useWallet: boolean = false) => {
        if (!pendingBookingData) return;

        const baggageSummary: SelectedAncillaries = {};
        
        const outboundSelections = passengerAncillaries.map(p => p.outboundBaggage?.name).filter(Boolean);
        if (outboundSelections.length > 0) {
            baggageSummary.outboundBaggage = {
                id: 'summary-out',
                name: outboundSelections.join(', '),
                price: passengerAncillaries.reduce((sum, p) => sum + (p.outboundBaggage?.price || 0), 0)
            };
        }

        const inboundSelections = passengerAncillaries.map(p => p.inboundBaggage?.name).filter(Boolean);
        if (inboundSelections.length > 0) {
            baggageSummary.inboundBaggage = {
                id: 'summary-in',
                name: inboundSelections.join(', '),
                price: passengerAncillaries.reduce((sum, p) => sum + (p.inboundBaggage?.price || 0), 0)
            };
        }

        const fullBookingData = {
            ...pendingBookingData,
            ancillaries: baggageSummary,
            total_amount: priceData.finalTotal,
            payment_status: (useWallet ? 'paid' : 'pending') as 'paid' | 'pending' | 'refunded'
        };
        
        
        if (useWallet && currentUser) {
             const commission = walletService.calculateCommission(
                currentUser.role_level, 
                0, 
                (currentUser as any).commission_rate
            );
            
            (fullBookingData as any).payment_info = {
                method: 'Ví Đại lý',
                transaction_id: `WALLET-${Date.now()}`,
                date: new Date().toISOString(),
                is_wallet: true,
                commission: commission
            };
            (fullBookingData as any).payment_status = 'paid';
            (fullBookingData as any).status = 'confirmed';
            
            (fullBookingData as any).is_wallet_payment = true;
            (fullBookingData as any).commission_amount = commission;
        }
        
        onConfirmBooking(fullBookingData);
        setIsConfirmModalOpen(false);
    };
    
    const renderFareSelection = () => {
        if (!bookingDetails) return null;
        
        const lastLeg = flight.flights[flight.flights.length - 1];
        const destCode = lastLeg.arrival_airport.id;
        
        return (
            <div className="bg-[var(--card-bg-color)] p-6 rounded-lg shadow-md space-y-4 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--border-color)] pb-3 mb-4 gap-3">
                    
                    <HeaderWeatherWidget destinationCode={destCode} />
                    
                    <button onClick={onBack} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm ml-auto sm:ml-0">
                        Chọn lại <RefreshIcon className="w-4 h-4" />
                    </button>
                </div>

                <SelectedFareDisplay 
                    legTitle="Chuyến đi"
                    selectedOption={selectedOutboundOption} 
                    onChangeClick={() => setFareSelectionModal('outbound')}
                />

                {isRoundTrip && (
                    <SelectedFareDisplay 
                        legTitle="Chuyến về"
                        selectedOption={selectedInboundOption} 
                        onChangeClick={() => setFareSelectionModal('inbound')}
                    />
                )}
            </div>
        );
    };

    if (isBookingConfirmed && bookingData) {
        return (
            <>
                <BookingConfirmation 
                    onNewSearch={onNewSearch}
                    bookingData={bookingData}
                    onShowTicket={() => setShowTicket(true)}
                    searchParamsForCompactForm={currentSearchParams}
                    onSearch={onSearch}
                />
                
                {showTicket && (
                    <div className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center p-4 ticket-modal-container">
                        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[95vh] overflow-hidden flex flex-col">
                            <div className="flex-shrink-0 p-3 bg-gray-100 flex justify-between items-center no-print">
                                <h3 className="font-bold text-gray-800">Chi tiết vé: {bookingData.id}</h3>
                                <div>
                                     <button onClick={() => window.print()} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 mr-2 text-sm">In vé</button>
                                    <button onClick={() => setShowTicket(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 text-sm">Đóng</button>
                                </div>
                            </div>
                             <div className="flex-grow overflow-y-auto ticket-modal-content">
                               <div className="ticket-to-print">
                                    <ETicket
                                        pnr={bookingData.pnr}
                                        bookingTimestamp={bookingData.bookingTimestamp}
                                        flight={bookingData.flight}
                                        bookingData={bookingData}
                                        bookingDetails={bookingData.bookingDetails}
                                        selectedOutboundOption={bookingData.selectedOutboundOption}
                                        selectedInboundOption={bookingData.selectedInboundOption}
                                    />
                               </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    const isFareSelected = selectedOutboundOption && (!isRoundTrip || selectedInboundOption);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <BookingReviewModal 
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleFinalConfirmation}
                data={pendingBookingData || { passengers: [], contact: { fullName: '', email: '', phone: '', gender: 'Mr', address: '' }, ancillaries: [] }}
                priceData={priceData}
                flightDetails={bookingDetails || { selected_flights: [], booking_options: [], baggage_prices: {}, price_insights: { lowest_price: 0, price_level: '', typical_price_range: [0, 0] } }}
                isLoading={isLoading}
                currentUser={currentUser}
            />

            {bookingDetails && (
                <>
                    <FareSelectionModal 
                        isOpen={fareSelectionModal === 'outbound'}
                        onClose={() => setFareSelectionModal(null)}
                        options={(bookingDetails.booking_options && bookingDetails.booking_options.length > 0) ? bookingDetails.booking_options : (bookingDetails.outbound_booking_options || [])}
                        selectedOption={selectedOutboundOption}
                        onSelect={onSelectOutboundOption}
                        title="Chọn vé chiều đi"
                    />
                    <FareSelectionModal 
                        isOpen={fareSelectionModal === 'inbound'}
                        onClose={() => setFareSelectionModal(null)}
                        options={bookingDetails.inbound_booking_options || []}
                        selectedOption={selectedInboundOption}
                        onSelect={onSelectInboundOption}
                        title="Chọn vé chiều về"
                    />
                </>
            )}

            <BookingSteps currentStep={isFareSelected ? 'book' : 'select'} />
            
            <FlightSummaryHeader flight={flight} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {isDetailsLoading ? (
                        <div className="bg-white p-8 rounded-lg shadow text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p>Đang tải chi tiết chuyến bay...</p>
                        </div>
                    ) : (
                        <>
                            {renderFareSelection()}
                            
                            {isFareSelected && (
                                <>
                                    <BookingForm 
                                        passengers={passengers}
                                        flight={flight} 
                                        onSubmit={handleFormSubmit}
                                        isLoading={isLoading}
                                        apiError={apiError}
                                        currentUser={currentUser}
                                        ancillaries={passengerAncillaries}
                                        onAncillaryChange={handleAncillaryChange}
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                    {bookingDetails && (
                        <DetailedFlightSummary 
                            details={bookingDetails} 
                            selectedOutboundOption={selectedOutboundOption} 
                            selectedInboundOption={selectedInboundOption} 
                            ancillaries={passengerAncillaries}
                        />
                    )}

                    <div className="bg-[var(--card-bg-color)] p-4 rounded-xl shadow-md border border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-bold mb-3 text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <SearchIcon className="w-5 h-5" /> Tìm vé khác
                        </h3>
                        <CompactSearchForm onSearch={onSearch} initialParams={currentSearchParams} />
                    </div>

                    <CheckoutDestinationInfo destinationCode={flight.flights[flight.flights.length-1].arrival_airport.id} />
                    
                    <PriceDetails 
                        priceData={priceData}
                        passengers={passengers}
                        feeConfig={feeConfig}
                    />
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
