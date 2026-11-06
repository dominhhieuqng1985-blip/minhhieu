
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AviationStackFlight } from '../types';
import { fetchCombinedFlights } from '../services/liveFlightService';
import { SearchIcon, RefreshIcon, CloseIcon, RadarIcon, PlaneTakeoffIcon, MapPinIcon, PlaneIcon, TowerIcon, PlaneUpIcon, PlaneDownIcon, ClockIcon, MaximizeIcon, MinimizeIcon, BriefcaseIcon, LayoutDashboardIcon, ChevronRightIcon, ChevronLeftIcon, EyeIcon, EyeOffIcon, ArrowLeftIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';

declare global {
    interface Window {
        L: any;
    }
}

// ... (CONSTANTS: VN_LOCATIONS, AIRLINES_DATA, AIRCRAFT_NAMES, getNearestLocation, getCityName) ...
// --- CONSTANTS & DATA ---
const VN_LOCATIONS = [
    { name: "Hà Nội", lat: 21.0285, lng: 105.8542, code: "HAN" },
    { name: "TP. Hồ Chí Minh", lat: 10.8231, lng: 106.6297, code: "SGN" },
    { name: "Đà Nẵng", lat: 16.0544, lng: 108.2022, code: "DAD" },
    { name: "Hải Phòng", lat: 20.8449, lng: 106.6881, code: "HPH" },
    { name: "Cần Thơ", lat: 10.0452, lng: 105.7469, code: "VCA" },
    { name: "Nghệ An", lat: 19.2343, lng: 104.9953, code: "VII" },
    { name: "Thanh Hóa", lat: 19.8067, lng: 105.7853, code: "THD" },
    { name: "Quảng Bình", lat: 17.4833, lng: 106.6000, code: "VDH" },
    { name: "Huế", lat: 16.4637, lng: 107.5909, code: "HUI" },
    { name: "Khánh Hòa", lat: 12.2388, lng: 109.1967, code: "CXR" },
    { name: "Lâm Đồng (Đà Lạt)", lat: 11.9404, lng: 108.4583, code: "DLI" },
    { name: "Bình Định", lat: 13.7820, lng: 109.2267, code: "UIH" },
    { name: "Quảng Nam", lat: 15.5667, lng: 107.9833, code: "VCL" },
    { name: "Quảng Ngãi", lat: 15.1205, lng: 108.7923 },
    { name: "Phú Yên", lat: 13.0882, lng: 109.0924, code: "TBB" },
    { name: "Bình Thuận", lat: 11.0962, lng: 108.0837 },
    { name: "Đồng Nai", lat: 11.0264, lng: 107.1643 },
    { name: "Kiên Giang (Phú Quốc)", lat: 10.2899, lng: 103.9840, code: "PQC" },
    { name: "Hà Giang", lat: 22.8233, lng: 104.9833 },
    { name: "Sơn La", lat: 21.3276, lng: 103.9167 },
    { name: "Điện Biên", lat: 21.3833, lng: 103.0167, code: "DIN" },
    { name: "Lào Cai", lat: 22.4833, lng: 103.9667 },
    { name: "Biển Đông", lat: 16.0, lng: 112.0 },
    { name: "Bangkok", lat: 13.7563, lng: 100.5018, code: "BKK" },
    { name: "Singapore", lat: 1.3521, lng: 103.8198, code: "SIN" },
    { name: "Seoul", lat: 37.5665, lng: 126.9780, code: "ICN" },
    { name: "Tokyo", lat: 35.6762, lng: 139.6503, code: "NRT" },
];

const AIRLINES_DATA = [
    { code: 'VN', name: 'Vietnam Airlines', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VN.gif' },
    { code: 'VJ', name: 'Vietjet Air', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VJ.gif' },
    { code: 'QH', name: 'Bamboo Airways', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/QH.gif' },
    { code: 'VU', name: 'Vietravel Airlines', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VU.gif' },
    { code: 'BL', name: 'Pacific Airlines', logo: 'https://content.r9cdn.net/rimg/provider-logos/airlines/v/BL.png' },
];

const AIRCRAFT_NAMES: Record<string, string> = {
    'A320': 'Airbus A320',
    'A321': 'Airbus A321',
    'A20N': 'Airbus A320neo',
    'A21N': 'Airbus A321neo',
    'A330': 'Airbus A330',
    'A350': 'Airbus A350 XWB',
    'B737': 'Boeing 737',
    'B738': 'Boeing 737-800',
    'B777': 'Boeing 777',
    'B787': 'Boeing 787 Dreamliner',
    'E190': 'Embraer E190',
    'AT76': 'ATR 72-600'
};

const getNearestLocation = (lat: number, lng: number) => {
    let minDesc = 1000;
    let nearest = "Vùng trời quốc tế";
    for (const loc of VN_LOCATIONS) {
        const dist = Math.sqrt(Math.pow(lat - loc.lat, 2) + Math.pow(lng - loc.lng, 2));
        if (dist < minDesc) {
            minDesc = dist;
            nearest = loc.name;
        }
    }
    if (minDesc > 2.5) return "Vùng trời quốc tế";
    return `Khu vực ${nearest}`;
};

const getCityName = (code: string, airportName?: string) => {
    const vnLoc = VN_LOCATIONS.find(l => l.code === code);
    if (vnLoc) return vnLoc.name;

    const airport = AIRPORTS.find(a => a.id === code);
    if (airport) {
        let name = airport.name.replace(/\(.*\)/, '').trim();
        name = name.replace(/^TP\.\s*/, '');
        return name;
    }
    return airportName || code;
};

// --- UTILS ---
const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
};

const toRad = (d: number) => d * Math.PI / 180;
const toDeg = (r: number) => r * 180 / Math.PI;

const getGreatCirclePath = (start: [number, number], end: [number, number], numPoints = 150) => {
    const lat1 = toRad(start[0]);
    const lon1 = toRad(start[1]);
    const lat2 = toRad(end[0]);
    const lon2 = toRad(end[1]);
    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));
    const points: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
        const lon = Math.atan2(y, x);
        points.push([toDeg(lat), toDeg(lon)]);
    }
    return points;
};

const movePoint = (lat: number, lng: number, speedKmh: number, heading: number, timeDiffSeconds: number) => {
    const R = 6371e3; // Earth radius in meters
    const dist = (speedKmh * 1000 / 3600) * timeDiffSeconds; // Distance in meters
    const brng = toRad(heading);
    const lat1 = toRad(lat);
    const lon1 = toRad(lng);

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist / R) +
                  Math.cos(lat1) * Math.sin(dist / R) * Math.cos(brng));
    
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist / R) * Math.cos(lat1),
                     Math.cos(dist / R) - Math.sin(lat1) * Math.sin(lat2));

    return { lat: toDeg(lat2), lng: toDeg(lon2) };
};

// FIX: Time Formatting to always use Asia/Ho_Chi_Minh
const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
        // Enforce Vietnam Timezone: Asia/Ho_Chi_Minh (UTC+7)
        return new Date(isoString).toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh'
        }); 
    } catch { 
        return '--:--'; 
    }
};

// --- COMPONENTS ---

const SmartAirlineLogo: React.FC<{ airline: AviationStackFlight['airline'], className?: string }> = ({ airline, className }) => {
    const iataCode = airline.iata?.replace(/[^a-zA-Z]/g, '').toUpperCase() || '';
    const datacomUrl = iataCode ? `https://plugin.datacom.vn/Resources/Images/Airline/${iataCode}.gif` : '';
    const apiLogo = airline.logo || '';
    const fallbackUrl = 'https://cdn-icons-png.flaticon.com/512/7893/7893979.png';
    const [imgSrc, setImgSrc] = useState(datacomUrl || apiLogo || fallbackUrl);

    useEffect(() => {
        setImgSrc(datacomUrl || apiLogo || fallbackUrl);
    }, [airline]);

    return (
        <img 
            src={imgSrc} 
            className={className} 
            alt={airline.name}
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src === datacomUrl && apiLogo && apiLogo !== datacomUrl) {
                    target.src = apiLogo;
                } else if (target.src !== fallbackUrl) {
                    target.src = fallbackUrl;
                }
            }}
        />
    );
};

const DepartureBoard: React.FC<{ flights: AviationStackFlight[], onSelect: (flight: AviationStackFlight) => void, onClose: () => void }> = ({ flights, onSelect, onClose }) => {
    
    // CURRENT REAL TIME CLOCK
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // FILTER LOGIC
    // Show flights from -4h ago to +24h ahead
    const validFlights = flights.filter(f => {
        const depTime = new Date(f.departure.scheduled).getTime();
        const now = currentTime.getTime();
        const windowStart = now - (4 * 60 * 60 * 1000);
        const windowEnd = now + (24 * 60 * 60 * 1000);
        if (!isNaN(depTime) && depTime >= windowStart && depTime <= windowEnd) return true;
        return false;
    });

    const sortedFlights = [...validFlights].sort((a, b) => {
        // Priority 1: System Flights (Top)
        const isSystemA = a.aircraft?.customMessage?.message.includes("System") ? 1 : 0;
        const isSystemB = b.aircraft?.customMessage?.message.includes("System") ? 1 : 0;
        if (isSystemA !== isSystemB) return isSystemB - isSystemA;

        // Priority 2: Status Importance
        const getStatusScore = (s: string) => {
            if (s === 'airborne' || s === 'active') return 4;
            if (s === 'taxiing') return 3;
            if (s === 'boarding') return 2;
            if (s === 'scheduled') return 1;
            return 0; 
        };
        const scoreA = getStatusScore(a.flight_status);
        const scoreB = getStatusScore(b.flight_status);
        if (scoreA !== scoreB) return scoreB - scoreA;

        // Priority 3: Scheduled Time
        const timeA = new Date(a.departure.scheduled).getTime();
        const timeB = new Date(b.departure.scheduled).getTime();
        return timeA - timeB;
    });
    
    return (
        <div className="absolute top-0 left-0 w-full h-full md:w-[600px] bg-[#111827]/95 backdrop-blur-xl border-r border-gray-700 shadow-2xl z-[1200] flex flex-col font-mono animate-slide-right">
            <div className="bg-[#1f2937] p-4 border-b border-gray-600 shadow-md z-10 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full transition-colors">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                        <PlaneTakeoffIcon className="w-6 h-6" /> BẢNG ĐIỆN TỬ
                    </h2>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-400">GIỜ ĐỊA PHƯƠNG</div>
                    <div className="text-lg font-bold text-white tabular-nums">
                        {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}
                    </div>
                </div>
            </div>
            
            <div className="flex-grow overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#374151] text-gray-300 uppercase text-xs tracking-wider sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-3 w-16">Giờ</th>
                            <th className="p-3 w-20">Mã CB</th>
                            <th className="p-3">Hành Trình</th>
                            <th className="p-3 w-24">Hãng</th>
                            <th className="p-3 w-24 text-right">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                        {sortedFlights.map((f, i) => {
                            const isDelayed = f.departure.delay && f.departure.delay > 15;
                            const isSystem = f.aircraft?.customMessage?.message.includes("System");
                            
                            let statusText = 'DỰ KIẾN';
                            let statusColor = 'text-yellow-500';

                            // ENGINE STATUS LOGIC
                            if (f.flight_status === 'landed') {
                                statusText = 'ĐÃ HẠ CÁNH';
                                statusColor = 'text-gray-400';
                            } else if (f.flight_status === 'cancelled') {
                                statusText = 'ĐÃ HỦY';
                                statusColor = 'text-red-600';
                            } else if (f.flight_status === 'diverted') {
                                statusText = 'CHUYỂN HƯỚNG';
                                statusColor = 'text-orange-500';
                            } else if (f.flight_status === 'airborne' || f.flight_status === 'active') {
                                statusText = 'AIRBORNE'; // Đang bay
                                statusColor = 'text-green-500 font-bold animate-pulse';
                            } else if (f.flight_status === 'taxiing') {
                                statusText = 'TAXIING'; // Đang lăn
                                statusColor = 'text-blue-400 font-bold';
                            } else if (f.flight_status === 'boarding') {
                                statusText = 'BOARDING'; // Đang lên máy bay
                                statusColor = 'text-orange-400 font-bold animate-pulse';
                            } else if (isDelayed || f.flight_status === 'delayed') {
                                statusText = `DELAY ${f.departure.delay}P`;
                                statusColor = 'text-red-500 font-bold';
                            } else {
                                // Scheduled default
                                statusText = 'LÊN LỊCH';
                                statusColor = 'text-gray-300';
                            }
                            
                            // Format flight date/time strictly to VN Timezone
                            const depTimeStr = formatTime(f.departure.scheduled);
                            const depDateObj = new Date(f.departure.scheduled);
                            const depDateStr = depDateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

                            return (
                                <tr key={i} onClick={() => onSelect(f)} className={`cursor-pointer transition-colors group ${isSystem ? 'bg-blue-900/10 hover:bg-blue-900/30' : 'hover:bg-gray-800'}`}>
                                    <td className="p-3 font-bold text-yellow-200 tabular-nums">
                                        <div>{depTimeStr}</div>
                                        <div className="text-[9px] text-gray-500">{depDateStr}</div>
                                    </td>
                                    <td className="p-3 font-bold text-white">
                                        {f.flight.iata}
                                        {isSystem && <span className="block text-[8px] text-blue-400 font-normal">SYSTEM</span>}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 text-white">
                                            <span className="font-bold text-blue-300">{f.departure.iata}</span>
                                            <span className="text-gray-500">➔</span>
                                            <span className="font-bold text-orange-300">{f.arrival.iata}</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <SmartAirlineLogo airline={f.airline} className="h-6 object-contain bg-white rounded-sm px-1" />
                                    </td>
                                    <td className={`p-3 text-right font-bold ${statusColor} text-xs tracking-wider`}>
                                        {statusText}
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedFlights.length === 0 && (
                            <tr><td colSpan={5} className="p-10 text-center text-gray-500 italic">Đang cập nhật dữ liệu chuyến bay...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ... (FlightDetailBottomPanel, TrafficMap, FlightMapView, LiveFlightTracker remain similar but ensure correct status usage)
// 2. Flight Detail Bottom Panel (Updated to fix Progress Bar bug)
const FlightDetailBottomPanel: React.FC<{ flight: AviationStackFlight; onClose: () => void }> = ({ flight, onClose }) => {
    const isDelayed = flight.departure.delay && flight.departure.delay > 15;
    
    let statusText = 'ĐÚNG GIỜ';
    let statusBg = 'bg-green-500/20';
    let statusTextCol = 'text-green-400';
    let statusBorder = 'border-green-500/50';

    const status = flight.flight_status;

    if (status === 'airborne' || status === 'active') {
        statusText = 'ĐANG BAY';
        statusBg = 'bg-green-500/20';
        statusTextCol = 'text-green-400';
    } else if (status === 'taxiing') {
        statusText = 'ĐANG LĂN';
        statusBg = 'bg-blue-500/20';
        statusTextCol = 'text-blue-400';
    } else if (status === 'boarding') {
        statusText = 'ĐANG RA CỬA';
        statusBg = 'bg-orange-500/20';
        statusTextCol = 'text-orange-400';
    } else if (status === 'landed') {
        statusText = 'ĐÃ HẠ CÁNH';
        statusBg = 'bg-gray-500/20';
        statusTextCol = 'text-gray-400';
        statusBorder = 'border-gray-500/50';
    } else if (status === 'delayed' || isDelayed) {
        statusText = `TRỄ ${flight.departure.delay}P`;
        statusBg = 'bg-red-500/20';
        statusTextCol = 'text-red-400';
        statusBorder = 'border-red-500/50';
    } else if (status === 'cancelled') {
        statusText = 'ĐÃ HỦY';
        statusBg = 'bg-red-500/20';
        statusTextCol = 'text-red-600';
        statusBorder = 'border-red-500/50';
    }
    
    const lat = flight.live?.latitude || 0;
    const lng = flight.live?.longitude || 0;
    const locationName = getNearestLocation(lat, lng);

    const formatTimeOnly = (iso?: string) => formatTime(iso);
    
    const aircraftCode = flight.aircraft?.icao || flight.aircraft?.iata || 'N/A';
    const aircraftName = AIRCRAFT_NAMES[aircraftCode] || aircraftCode;
    const registration = flight.aircraft?.registration || 'Reg N/A';
    const hex = flight.aircraft?.icao24 || '';

    // --- FIX: Time Calculation for Overnight Flights ---
    const depTime = new Date(flight.departure.actual || flight.departure.scheduled).getTime();
    let arrTime = new Date(flight.arrival.estimated || flight.arrival.scheduled).getTime();
    
    if (arrTime < depTime) {
        arrTime += 24 * 60 * 60 * 1000;
    }

    const now = Date.now();
    const totalDurationMs = Math.max(1, arrTime - depTime);
    let progressPercent = 0;
    
    if (status === 'airborne' || status === 'active' || status === 'taxiing') {
        progressPercent = Math.min(100, Math.max(0, ((now - depTime) / totalDurationMs) * 100));
    } else if (status === 'landed' || status === 'arrived') {
        progressPercent = 100;
    }

    const durationHours = Math.floor(totalDurationMs / 3600000);
    const durationMinutes = Math.floor((totalDurationMs % 3600000) / 60000);
    const durationStr = `${durationHours}h ${durationMinutes}m`;

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-gray-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[1100] animate-slide-up text-white max-h-[85vh] md:max-h-[260px] overflow-y-auto overflow-x-hidden flex flex-col font-sans">
            
            <button 
                onClick={onClose} 
                className="absolute top-3 right-3 z-30 p-2 text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors border border-white/10"
            >
                <CloseIcon className="w-5 h-5"/>
            </button>

            <div className="flex flex-col md:flex-row h-full">
                
                <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-gray-700">
                    
                    <div className="flex justify-between items-start mb-6 pr-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-lg shadow-md">
                                <SmartAirlineLogo airline={flight.airline} className="h-10 w-10 object-contain" />
                            </div>
                            <div>
                                <div className="text-2xl font-black tracking-tight leading-none text-white">
                                    {flight.flight.iata}
                                </div>
                                <div className="text-sm text-gray-400 font-semibold mt-1">{flight.airline.name}</div>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <div className={`px-3 py-1 rounded-full border ${statusBg} ${statusBorder} ${statusTextCol} font-bold text-xs tracking-wider uppercase inline-block shadow-sm`}>
                                {statusText}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mt-2 flex items-center justify-end gap-1">
                                <MapPinIcon className="w-3 h-3" /> {locationName}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="flex flex-col text-left justify-end">
                            <div className="mb-3">
                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 leading-none">{flight.departure.iata}</div>
                                <div className="text-sm font-bold text-white truncate max-w-[120px]" title={getCityName(flight.departure.iata, flight.departure.airport)}>
                                    {getCityName(flight.departure.iata, flight.departure.airport)}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate max-w-[120px]">
                                    {flight.departure.airport}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-2 border border-gray-700 shadow-inner">
                                <div className="text-3xl font-bold font-mono text-white tracking-tight">{formatTimeOnly(flight.departure.actual || flight.departure.scheduled)}</div>
                                <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">Scheduled</div>
                                
                                <div className="flex justify-between border-t border-gray-700 pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-gray-500 uppercase font-bold">Term</span>
                                        <span className="text-sm font-bold text-white">{flight.departure.terminal || '-'}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[8px] text-gray-500 uppercase font-bold">Gate</span>
                                        <span className="text-sm font-bold text-yellow-400">{flight.departure.gate || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                            <div className="text-[10px] font-bold text-gray-300 bg-gray-800 px-3 py-1 rounded-full mb-3 border border-gray-600 flex items-center gap-1 shadow-md">
                                <ClockIcon className="w-3 h-3 text-blue-400" />
                                {durationStr}
                            </div>

                            <div className="relative w-full h-2 bg-gray-800 rounded-full mb-2 overflow-hidden shadow-inner border border-gray-700">
                                <div 
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" 
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                                <div className="absolute top-0 bottom-0 w-10 bg-white/20 blur-md transform -skew-x-12 animate-shimmer" style={{ left: `${progressPercent}%` }}></div>
                                <div 
                                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-blue-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-1000 z-20"
                                    style={{ left: `calc(${progressPercent}% - 12px)` }}
                                >
                                    <PlaneIcon className="w-4 h-4 text-blue-600 transform rotate-90" />
                                </div>
                            </div>
                            
                            <div className="flex justify-between w-full text-[9px] text-gray-500 font-mono mt-1">
                                <span>DEP</span>
                                <span>ARR</span>
                            </div>
                        </div>

                        <div className="flex flex-col text-right justify-end">
                            <div className="mb-3">
                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-l from-orange-400 to-orange-600 leading-none">{flight.arrival.iata}</div>
                                <div className="text-sm font-bold text-white truncate max-w-[120px]" title={getCityName(flight.arrival.iata, flight.arrival.airport)}>
                                    {getCityName(flight.arrival.iata, flight.arrival.airport)}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate max-w-[120px] ml-auto">
                                    {flight.arrival.airport}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/80 rounded-lg p-2 border border-gray-700 shadow-inner">
                                <div className="text-3xl font-bold font-mono text-green-400 tracking-tight">{formatTimeOnly(flight.arrival.estimated || flight.arrival.scheduled)}</div>
                                <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">Estimated</div>
                                
                                <div className="flex justify-between border-t border-gray-700 pt-2">
                                    <div className="flex flex-col text-left">
                                        <span className="text-[8px] text-gray-500 uppercase font-bold">Term</span>
                                        <span className="text-sm font-bold text-white">{flight.arrival.terminal || '-'}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[8px] text-gray-500 uppercase font-bold">Gate</span>
                                        <span className="text-sm font-bold text-yellow-400">{flight.arrival.gate || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:w-[420px] p-4 bg-gray-900/50 flex flex-col gap-4 border-l border-gray-800">
                    
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-xl border border-gray-700 shadow-md">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                             <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">AIRCRAFT INFORMATION</div>
                             <div className="text-[10px] font-mono text-blue-400">{flight.aircraft?.icao24 || 'N/A'}</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-bold text-lg text-white">{aircraftName}</div>
                                <div className="text-xs text-gray-500">Type Code: {aircraftCode}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-lg font-bold text-yellow-500 tracking-wider bg-black/30 px-2 rounded border border-gray-700">
                                    {registration}
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                                    {hex && <span>HEX: {hex}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 flex-grow">
                        <div className="bg-black/40 p-3 rounded-xl flex flex-col items-center justify-center border border-gray-700 shadow-inner group hover:border-blue-500 transition-colors">
                            <div className="mb-2 p-2 bg-gray-800 rounded-full group-hover:bg-blue-900/50 transition-colors">
                                <PlaneUpIcon className="w-5 h-5 text-blue-400"/>
                            </div>
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Speed</div>
                            <div className="font-mono font-bold text-xl text-white">{formatNumber(flight.live?.speed_horizontal)} <span className="text-[10px] font-normal text-gray-400">km/h</span></div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl flex flex-col items-center justify-center border border-gray-700 shadow-inner group hover:border-purple-500 transition-colors">
                            <div className="mb-2 p-2 bg-gray-800 rounded-full group-hover:bg-purple-900/50 transition-colors">
                                <TowerIcon className="w-5 h-5 text-purple-400"/>
                            </div>
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Altitude</div>
                            <div className="font-mono font-bold text-xl text-white">{formatNumber(flight.live?.altitude)} <span className="text-[10px] font-normal text-gray-400">ft</span></div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl flex flex-col items-center justify-center border border-gray-700 shadow-inner group hover:border-orange-500 transition-colors">
                            <div className="w-9 h-9 rounded-full border-2 border-gray-600 flex items-center justify-center mb-2 bg-gray-800 group-hover:border-orange-500 transition-colors" style={{ transform: `rotate(${flight.live?.direction || 0}deg)` }}>
                                <div className="w-1 h-3 bg-orange-500 -mt-1 rounded-full shadow-[0_0_5px_orange]"></div>
                            </div>
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Heading</div>
                            <div className="font-mono font-bold text-xl text-white">{Math.round(flight.live?.direction || 0)}°</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-2 border-t border-gray-800">
                        <div className="flex gap-2">
                           <span className="bg-gray-800 px-1 rounded text-gray-300">LAT: {flight.live?.latitude.toFixed(4)}</span>
                           <span className="bg-gray-800 px-1 rounded text-gray-300">LON: {flight.live?.longitude.toFixed(4)}</span>
                        </div>
                        <div>
                            UTC: {new Date().toISOString().substring(11, 16)}Z
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 3. Traffic Map (Main Map)
export const TrafficMap: React.FC<{ 
    flights: AviationStackFlight[], 
    onSelect: (f: AviationStackFlight) => void,
    focusedLocation?: { lat: number, lng: number } | null,
    selectedFlight?: AviationStackFlight | null 
}> = ({ flights, onSelect, focusedLocation, selectedFlight }) => {
    const mapContainerId = useMemo(() => `traffic-map-${Math.random()}`, []);
    const mapRef = useRef<any>(null);
    const flightsRef = useRef<Map<string, { marker: any, data: AviationStackFlight, lastUpdate: number }>>(new Map());
    const pathRef = useRef<any>(null); 
    const airportMarkersRef = useRef<any[]>([]); 
    const animationFrameRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);

    // Initialize Map
    useEffect(() => {
        if (typeof window === 'undefined' || !window.L) return;

        // --- CSS Injection for Map Styles ---
        const style = document.createElement('style');
        style.innerHTML = `
            /* Smooth Rotation for Plane Icons - CSS Transition helps interpolation */
            .plane-traffic-marker > div {
                transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: transform;
            }
            /* Animated Flight Path (Running Line) */
            @keyframes dash {
                to {
                    stroke-dashoffset: -20;
                }
            }
            .animated-flight-path {
                animation: dash 1s linear infinite;
                filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
            }
        `;
        document.head.appendChild(style);

        if (!mapRef.current) {
            const map = window.L.map(mapContainerId, {
                center: [16.0, 108.0],
                zoom: 6,
                zoomControl: false,
                attributionControl: false,
                dragging: true,
                scrollWheelZoom: true,
                preferCanvas: true // Performance boost for many markers
            });

            // Use CartoDB Dark Matter for high contrast professional look
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);

            mapRef.current = map;
        }

        return () => {
            document.head.removeChild(style);
        }
    }, [mapContainerId]);

    // Handle Selected Flight (Focus & Draw Path)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Invalidate size to ensure map renders correctly when container size changes
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        // Clear existing path and auxiliary markers
        if (pathRef.current) {
            map.removeLayer(pathRef.current.flown);
            map.removeLayer(pathRef.current.remaining);
            pathRef.current = null;
        }
        airportMarkersRef.current.forEach(m => map.removeLayer(m));
        airportMarkersRef.current = [];

        // If a flight is selected, focus on it and draw the path
        if (selectedFlight && selectedFlight.live) {
            const { latitude, longitude } = selectedFlight.live;
            
            const dep = selectedFlight.departure;
            const arr = selectedFlight.arrival;
            
            if (dep.latitude && dep.longitude && arr.latitude && arr.longitude) {
                // 1. Draw Path (Great Circle)
                // Use 2 curves: Dep -> Current, Current -> Arr
                // This ensures the line always passes through the plane
                
                // Segment 1: Flown (Solid Blue)
                const flownPath = getGreatCirclePath(
                    [dep.latitude, dep.longitude], 
                    [latitude, longitude],
                    100
                );
                
                // Segment 2: Remaining (Dashed Lighter Blue)
                const remainingPath = getGreatCirclePath(
                    [latitude, longitude],
                    [arr.latitude, arr.longitude],
                    100
                );

                const flownLine = window.L.polyline(flownPath, { 
                    color: '#3b82f6', // Bright Blue
                    weight: 3, 
                    opacity: 0.9,
                    lineCap: 'round'
                }).addTo(map);

                // ANIMATED Dashed line for future path
                const remainingLine = window.L.polyline(remainingPath, { 
                    color: '#60a5fa', // Lighter Blue
                    weight: 2, 
                    opacity: 0.6, 
                    dashArray: '8, 8',
                    className: 'animated-flight-path' // CSS Class for animation
                }).addTo(map);

                pathRef.current = { flown: flownLine, remaining: remainingLine };

                // 2. Add Airport Markers with Tooltips
                const depMarker = window.L.circleMarker([dep.latitude, dep.longitude], {
                    radius: 6, color: '#10b981', fillOpacity: 1, fillColor: '#000', weight: 2
                }).addTo(map).bindTooltip(`${dep.iata}`, { direction: 'top', offset: [0, -8], className: 'bg-black/80 text-green-400 text-xs border border-green-500/50 font-bold px-1 rounded', permanent: true });
                
                const arrMarker = window.L.circleMarker([arr.latitude, arr.longitude], {
                    radius: 6, color: '#f59e0b', fillOpacity: 1, fillColor: '#000', weight: 2
                }).addTo(map).bindTooltip(`${arr.iata}`, { direction: 'top', offset: [0, -8], className: 'bg-black/80 text-yellow-400 text-xs border border-yellow-500/50 font-bold px-1 rounded', permanent: true });

                airportMarkersRef.current.push(depMarker, arrMarker);

                // 3. FIT BOUNDS (Fix: Ensure map shows full route)
                const bounds = window.L.latLngBounds([
                    [dep.latitude, dep.longitude],
                    [arr.latitude, arr.longitude],
                    [latitude, longitude]
                ]);
                map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5 });

            } else {
                map.flyTo([latitude, longitude], 8, { animate: true, duration: 1 });
            }
        } else if (focusedLocation) {
            map.flyTo([focusedLocation.lat, focusedLocation.lng], 10, { animate: true, duration: 1.5 });
        } else {
            // Default view (Vietnam)
            if (map.getZoom() > 8) {
                map.flyTo([16.0, 108.0], 6, { animate: true, duration: 1.5 });
            }
        }

    }, [selectedFlight, focusedLocation]);

    // Update Markers (Main Traffic Loop)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const currentIds = new Set<string>();
        
        // If a flight is selected, we ONLY show that flight (Zen Focus).
        // Otherwise show all.
        const flightsToRender = selectedFlight 
            ? flights.filter(f => f.flight.iata === selectedFlight.flight.iata) 
            : flights;

        flightsToRender.forEach(f => {
            if (!f.live || f.flight_status === 'landed') return;
            const id = f.flight.iata || f.flight.number;
            currentIds.add(id);

            const existing = flightsRef.current.get(id);
            const isInternal = f.aircraft?.customMessage?.message === "Internal System Flight";
            
            // Highlight selected flight strongly
            const isSelected = selectedFlight?.flight.iata === id;
            const color = isInternal ? "#ef4444" : (isSelected ? "#22c55e" : "#fbbf24");
            const scale = isSelected ? 2.0 : 1; 
            const zIndex = isSelected ? 2000 : 100;
            
            const tooltipContent = `
                <div class="font-sans text-xs px-2 py-1 text-center">
                    <div class="font-bold text-yellow-400 text-sm tracking-wider">${f.flight.iata}</div>
                    <div class="text-gray-300 text-[10px] font-mono">${f.departure.iata} <span class="text-gray-500">➔</span> ${f.arrival.iata}</div>
                </div>
            `;

            if (existing) {
                // UPDATE DATA REFERENCE (Logic moved to Animation Loop)
                existing.data = f;
                existing.lastUpdate = Date.now();
                existing.marker.setTooltipContent(tooltipContent);
                existing.marker.setZIndexOffset(zIndex);
                
                // Update color/scale if selection changes
                const iconEl = document.getElementById(`icon-${id}-svg`);
                if (iconEl) {
                    iconEl.setAttribute('fill', color);
                    iconEl.style.transform = `scale(${scale})`;
                }

            } else {
                const heading = f.live.direction || 0;
                // Use a high-quality SVG plane
                const planeSvg = `<svg id="icon-${id}-svg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="black" stroke-width="0.5" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.8)); transform: scale(${scale}); transition: fill 0.3s, transform 0.3s;"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

                const iconDiv = window.L.divIcon({
                    html: `<div id="icon-${id}" style="transform: rotate(${heading}deg); transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);">${planeSvg}</div>`,
                    className: 'plane-traffic-marker',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                const marker = window.L.marker([f.live.latitude, f.live.longitude], { icon: iconDiv, zIndexOffset: zIndex })
                    .addTo(map)
                    .bindTooltip(tooltipContent, { 
                        direction: 'top', 
                        offset: [0, -15],
                        className: 'bg-black/80 border border-gray-600 text-white rounded shadow-2xl backdrop-blur-md'
                    })
                    .on('click', () => onSelect(f));

                flightsRef.current.set(id, { marker, data: f, lastUpdate: Date.now() });
            }
        });

        // Cleanup
        for (const [id, entry] of flightsRef.current) {
            if (!currentIds.has(id)) {
                map.removeLayer(entry.marker);
                flightsRef.current.delete(id);
            }
        }

    }, [flights, onSelect, selectedFlight]);

    // ANIMATION LOOP (Physics Interpolation)
    // Uses Geodesic calculation to move plane along the curve
    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
            const deltaTimeSeconds = (timestamp - lastFrameTimeRef.current) / 1000;
            lastFrameTimeRef.current = timestamp;

            // Cap delta time to prevent huge jumps if tab inactive
            const safeDelta = Math.min(deltaTimeSeconds, 0.5); 

            flightsRef.current.forEach((entry, id) => {
                const { marker, data } = entry;
                
                // Only animate if flying
                if (data.live && !data.live.is_ground && data.flight_status !== 'landed') {
                    
                    const currentLatLng = marker.getLatLng();
                    const speedKmh = Math.max(data.live.speed_horizontal, 400); // Enforce min speed for visual movement
                    
                    // Move the point along the bearing
                    // If we have a destination lat/lng, calculate bearing to it
                    // Otherwise rely on heading
                    
                    let heading = data.live.direction;
                    
                    // Basic Physics: Move point along heading
                    // Note: movePoint implements Geodesic calculation (Spherical Earth)
                    const newPos = movePoint(currentLatLng.lat, currentLatLng.lng, speedKmh, heading, safeDelta);
                    
                    marker.setLatLng([newPos.lat, newPos.lng]);
                    
                    // Smooth rotation via CSS (handled in marker creation style)
                    // Just update transform property
                    const iconEl = document.getElementById(`icon-${id}`);
                    if (iconEl) {
                         // Ensure shortest rotation path (e.g. 350 -> 10 is +20, not -340)
                         // But for simple 1-frame updates, setting absolute deg is fine with CSS transition
                         iconEl.style.transform = `rotate(${heading}deg)`;
                    }
                }
            });
            
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, []);

    return <div id={mapContainerId} className="w-full h-full z-0 bg-[#0b0f19]"></div>;
};

export const FlightMapView: React.FC<{ flight: AviationStackFlight; onBack: () => void }> = ({ flight, onBack }) => {
    // Wrapper for Admin Page compatibility
    return (
        <div className="relative w-full h-full">
            <TrafficMap flights={[flight]} onSelect={()=>{}} selectedFlight={flight} />
            <FlightDetailBottomPanel flight={flight} onClose={onBack} />
        </div>
    );
};

// --- SEARCH TYPES ---
type SearchSuggestion = {
    type: 'airport' | 'airline' | 'flight';
    label: string;
    subLabel: string;
    code: string;
    icon: React.ReactNode;
    data?: any;
};

// --- MAIN WRAPPER ---
interface LiveFlightTrackerProps {
    onExit?: () => void;
}

const LiveFlightTracker: React.FC<LiveFlightTrackerProps> = ({ onExit }) => {
    const [flights, setFlights] = useState<AviationStackFlight[]>([]);
    const [selectedFlight, setSelectedFlight] = useState<AviationStackFlight | null>(null);
    const [loading, setLoading] = useState(false);
    
    // UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedLocation, setFocusedLocation] = useState<{lat: number, lng: number} | null>(null);
    
    // Zen Mode: Hides UI overlays
    const [isZenMode, setIsZenMode] = useState(false);
    // Departure Board Visibility - Default TRUE
    const [showBoard, setShowBoard] = useState(true);
    
    const searchRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        const loadFlights = async () => {
            setLoading(true);
            try {
                // Pass empty query to get all active flights + mock/system
                const data = await fetchCombinedFlights();
                setFlights(data);
            } catch (e) { 
                console.error(e); 
            } finally { 
                setLoading(false); 
            }
        };
        loadFlights();
        
        // Refresh every 30s
        const interval = setInterval(loadFlights, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // NEW: Handle ESC Key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showSuggestions) {
                    setShowSuggestions(false);
                } else if (selectedFlight) {
                    setSelectedFlight(null);
                } else if (showBoard) {
                    setShowBoard(false);
                } else if (onExit) {
                    onExit(); // Go back to App
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSuggestions, selectedFlight, showBoard, onExit]);

    // --- SEARCH LOGIC ---
    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Clean query: uppercase and remove ALL spaces for strict matching
        const qUpper = query.toUpperCase();
        const qClean = qUpper.replace(/\s+/g, '');
        
        const newSuggestions: SearchSuggestion[] = [];

        // 1. Search Active Flights (Robust match)
        const matchedFlights = flights.filter(f => {
            const rawIata = (f.flight.iata || '').toUpperCase().replace(/\s+/g, '');
            const rawNum = (f.flight.number || '').toUpperCase().replace(/\s+/g, '');
            return rawIata.includes(qClean) || rawNum.includes(qClean);
        });

        matchedFlights.slice(0, 3).forEach(f => {
            newSuggestions.push({
                type: 'flight',
                label: f.flight.iata,
                subLabel: `${f.departure.iata} ➔ ${f.arrival.iata}`,
                code: f.flight.iata,
                data: f,
                icon: <PlaneIcon className="w-4 h-4 text-blue-500 transform rotate-45" />
            });
        });

        // 2. Search Airlines
        AIRLINES_DATA.forEach(al => {
            if (al.name.toLowerCase().includes(query.toLowerCase()) || al.code.includes(qUpper)) {
                newSuggestions.push({
                    type: 'airline',
                    label: al.name,
                    subLabel: `Hãng bay (${al.code})`,
                    code: al.code,
                    icon: <BriefcaseIcon className="w-4 h-4 text-orange-500" />
                });
            }
        });

        // 3. Search Airports (VN Only for now + major hubs)
        const vnAirports = [
            {id: 'SGN', name: 'Tân Sơn Nhất', lat: 10.8189, lng: 106.6519},
            {id: 'HAN', name: 'Nội Bài', lat: 21.2130, lng: 105.8035},
            {id: 'DAD', name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022},
            // ... Add more if needed
        ];
        
        vnAirports.forEach(ap => {
            if (ap.id.includes(qUpper) || ap.name.toLowerCase().includes(query.toLowerCase())) {
                newSuggestions.push({
                    type: 'airport',
                    label: `${ap.name} (${ap.id})`,
                    subLabel: 'Sân bay',
                    code: ap.id,
                    data: { lat: ap.lat, lng: ap.lng },
                    icon: <MapPinIcon className="w-4 h-4 text-red-500" />
                });
            }
        });

        setSuggestions(newSuggestions);
        setShowSuggestions(true);
    };

    const handleSelectSuggestion = (s: SearchSuggestion) => {
        setSearchQuery(s.label);
        setShowSuggestions(false);

        if (s.type === 'flight') {
            setSelectedFlight(s.data);
            setFocusedLocation(null); 
        } else if (s.type === 'airport') {
            if (s.data) {
                setFocusedLocation(s.data);
            }
        }
    };

    return (
        <div className="relative w-full h-[calc(100vh)] bg-[#0f172a] overflow-hidden flex flex-col">
            
            {/* --- MAP LAYER (ALWAYS VISIBLE) --- */}
            <div className="absolute inset-0 z-0">
                <TrafficMap 
                    flights={flights} 
                    onSelect={(f) => { setSelectedFlight(f); setShowBoard(false); }}
                    focusedLocation={focusedLocation}
                    selectedFlight={selectedFlight}
                />
            </div>

            {/* --- UI OVERLAY LAYER --- */}
            <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${isZenMode ? 'opacity-0' : 'opacity-100'}`}>
                
                {/* 1. BRAND & SEARCH (Top Left - Floating) */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 w-[calc(100%-4rem)] md:w-[320px] pointer-events-auto">
                    {/* Brand Pill (with Back function) */}
                    <div 
                        onClick={onExit}
                        className="bg-[#1f2937]/90 backdrop-blur-md border border-gray-700 rounded-lg p-2 flex items-center gap-2 shadow-lg w-fit mb-2 cursor-pointer hover:bg-gray-800 transition-colors group"
                        title="Quay lại trang chủ"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                        <RadarIcon className="w-5 h-5 text-red-600 animate-pulse" />
                        <span className="font-black italic tracking-tighter text-white text-lg">
                            NHAUYEN<span className="text-blue-500">LIVE</span>
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {/* Search Bar */}
                        <div className="relative group flex-grow" ref={searchRef}>
                            <div className="flex items-center bg-[#1f2937]/90 backdrop-blur-md border border-gray-600 rounded-lg shadow-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                <div className="pl-3 text-gray-400">
                                    <SearchIcon className="w-5 h-5" />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Tìm chuyến bay (VJ102)..." 
                                    value={searchQuery} 
                                    onChange={handleSearchInput} 
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    className="bg-transparent border-none text-white placeholder-gray-400 px-3 py-3 text-sm focus:ring-0 w-full font-medium" 
                                />
                                {loading && <RefreshIcon className="animate-spin w-4 h-4 text-blue-500 mr-3" />}
                            </div>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1f2937]/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto animate-fade-in divide-y divide-gray-700">
                                    {suggestions.map((s, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleSelectSuggestion(s)}
                                            className="flex items-center gap-3 p-3 hover:bg-blue-600/20 hover:border-l-4 hover:border-blue-500 cursor-pointer transition-all group pointer-events-auto"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center border border-gray-600 group-hover:border-blue-400">
                                                {s.icon}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-100 group-hover:text-blue-300">{s.label}</span>
                                                <span className="text-[10px] text-gray-400 font-mono uppercase">{s.subLabel}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* List/Board Toggle Button */}
                        <button 
                            onClick={() => setShowBoard(!showBoard)}
                            className={`p-3 rounded-lg border shadow-xl transition-all ${showBoard ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-[#1f2937]/90 text-white border-gray-600 hover:bg-gray-700'}`}
                            title="Bảng điện tử chuyến bay"
                        >
                            <LayoutDashboardIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. STATS PILL (Bottom Left - Hidden on Mobile if Detail Open) */}
                {!selectedFlight && (
                    <div className="absolute bottom-4 left-4 pointer-events-auto hidden md:flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-mono text-gray-300">
                            ACTIVE FLIGHTS: <strong className="text-white">{flights.filter(f => f.live).length}</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* --- ZEN MODE TOGGLE (Floating Top Right) --- */}
            <div className="absolute top-4 right-4 z-[1300] pointer-events-auto">
                <button 
                    onClick={() => setIsZenMode(!isZenMode)}
                    className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-lg"
                    title={isZenMode ? "Hiện giao diện" : "Ẩn giao diện (Zen Mode)"}
                >
                    {isZenMode ? <EyeOffIcon className="w-6 h-6 text-red-400" /> : <EyeIcon className="w-6 h-6" />}
                </button>
            </div>

            {/* --- DEPARTURE BOARD OVERLAY --- */}
            {showBoard && !isZenMode && (
                <DepartureBoard 
                    flights={flights} 
                    onSelect={(f) => { setSelectedFlight(f); setShowBoard(false); }}
                    onClose={() => setShowBoard(false)}
                />
            )}

            {/* --- FLIGHT DETAIL PANEL (Bottom Sheet) --- */}
            {selectedFlight && (
                <FlightDetailBottomPanel 
                    flight={selectedFlight} 
                    onClose={() => setSelectedFlight(null)} 
                />
            )}

        </div>
    );
};

export default LiveFlightTracker;
