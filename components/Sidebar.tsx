
import React, { useState } from 'react';
import { FlightOption, SearchParams, AdminFeeConfig } from '../types';
import { AIRPORTS } from '../constants';
import { CheckIcon, FileTextIcon, CreditCardIcon } from './icons/Icons';
import * as adminService from '../services/adminService';

interface SidebarProps {
  sortOption: string;
  onSortChange: (option: string) => void;
  availableAirlines: string[];
  filteredAirlines: string[];
  onAirlineFilterChange: (airline: string, checked: boolean) => void;
  onSelectAllAirlines: () => void;
  onDeselectAllAirlines: () => void;
  timeFilters: string[];
  onTimeFilterChange: (timeRange: string) => void;
  stopFilters: number[];
  onStopFilterChange: (stopCount: number) => void;
  outboundFlights?: FlightOption[];
  inboundFlights?: FlightOption[];
  searchParams?: SearchParams | null;
  priceDisplayMode?: 'base' | 'total';
  onPriceDisplayModeChange?: (mode: 'base' | 'total') => void;
  feeConfig: AdminFeeConfig | null;
}

const SidebarCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-[var(--card-bg-color)] rounded-md shadow">
        <h3 className="text-sm font-bold text-gray-800 bg-yellow-400 p-3 rounded-t-md">{title}</h3>
        <div className="p-4 space-y-3">
            {children}
        </div>
    </div>
);

const TimeFilterButton: React.FC<{ label: string; range: string; subtext: string; isActive: boolean; onClick: () => void; }> = ({ label, range, subtext, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-2 rounded-md border text-sm transition-colors ${isActive ? 'bg-blue-100 border-blue-300 text-blue-800 font-semibold' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
    >
        <div className="flex justify-between items-center">
            <span>{label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{subtext}</span>
        </div>
    </button>
);

// --- NEW COPY COMPONENT ---
const getCityName = (code: string) => {
    const airport = AIRPORTS.find(a => a.id === code);
    if (!airport) return code;
    const match = airport.name.match(/(.*?)\s*\(/);
    return match ? match[1].trim().toUpperCase() : airport.name.toUpperCase();
};

const formatPriceCompact = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price);
};

const CopyFlightTool: React.FC<{ outboundFlights: FlightOption[], inboundFlights: FlightOption[], params: SearchParams, feeConfig: AdminFeeConfig | null }> = ({ outboundFlights, inboundFlights, params, feeConfig }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const generateTextForLeg = (flights: FlightOption[], dateStr: string, from: string, to: string) => {
            if (!flights || flights.length === 0) return '';
            
            const date = new Date(dateStr);
            const dateFormatted = `Chủ Nhật, ngày ${date.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'})}`.replace('Chủ Nhật', ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][date.getDay()]);
            
            let text = `${getCityName(from)} (${from}) ${getCityName(to)}\n`;
            text += `${dateFormatted} \n`;
            text += `   ========>*<========\n\n`;
            text += `(VJ: VietJet Air; QH: Bamboo Airways; VN: VietnamAirlines; VU: Vietravel Airlines)\n\n`;

            flights.forEach(f => {
                const leg = f.flights[0];
                const lastLeg = f.flights[f.flights.length - 1];
                const depTime = new Date(leg.departure_airport.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                const arrTime = new Date(lastLeg.arrival_airport.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                // const airlineCode = leg.flight_number.substring(0, 2); 
                const flightNum = leg.flight_number.padEnd(8, ' ');
                const dep = depTime.padEnd(8, ' ');
                const arr = arrTime.padEnd(10, ' ');
                
                // Calculate Price with Admin Fees
                const pricing = adminService.calculateAdditivePrice(
                    f.price_net,
                    feeConfig,
                    leg.airline,
                    leg.departure_airport.id,
                    lastLeg.arrival_airport.id,
                    params.passengers // Pass full passengers object
                );

                const price = formatPriceCompact(pricing.finalTotal);
                
                text += `${flightNum}${dep}${arr}${price} (Đã gồm thuế phí)\n`;
            });
            return text;
        };

        let fullText = generateTextForLeg(outboundFlights, params.outbound_date, params.departure_id, params.arrival_id);

        if (params.type === 'round_trip' && inboundFlights.length > 0 && params.return_date) {
            fullText += `\n\n----------------------------------\n\n`;
            fullText += generateTextForLeg(inboundFlights, params.return_date, params.arrival_id, params.departure_id);
        }

        navigator.clipboard.writeText(fullText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const routeLabel = params.type === 'round_trip' 
        ? `${params.departure_id}-${params.arrival_id}-${params.departure_id}` 
        : `${params.departure_id}-${params.arrival_id}`;

    return (
        <div className="bg-[var(--card-bg-color)] rounded-md shadow overflow-hidden mb-6">
            <div className="bg-green-600 text-white p-3 font-bold text-sm">Copy Nhanh (Giá Tổng)</div>
            <div className="p-4 flex justify-center">
                <button 
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-md font-semibold text-sm transition-all transform active:scale-95 ${copied ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}
                >
                    {copied ? <CheckIcon className="w-4 h-4"/> : <FileTextIcon className="w-4 h-4"/>}
                    {copied ? 'Đã Copy!' : `Chặng: ${routeLabel}`}
                </button>
            </div>
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ 
    sortOption, 
    onSortChange, 
    availableAirlines,
    filteredAirlines, 
    onAirlineFilterChange,
    onSelectAllAirlines,
    onDeselectAllAirlines,
    timeFilters,
    onTimeFilterChange,
    stopFilters,
    onStopFilterChange,
    outboundFlights,
    inboundFlights,
    searchParams,
    priceDisplayMode,
    onPriceDisplayModeChange,
    feeConfig
}) => {

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectAllAirlines();
    } else {
      onDeselectAllAirlines();
    }
  };

  const areAllAirlinesSelected = availableAirlines.length > 0 && filteredAirlines.length === availableAirlines.length;

  const stopOptions = [
      { label: 'Bay thẳng', value: 0 },
      { label: '1 điểm dừng', value: 1 },
      { label: '2+ điểm dừng', value: 2 },
  ];

  return (
    <aside className="flex-shrink-0 space-y-6">
        {/* NEW: Price Display Mode Toggle */}
        {onPriceDisplayModeChange && (
            <SidebarCard title="Chế độ hiển thị giá">
                <label className="flex items-center space-x-2 cursor-pointer p-1">
                    <input 
                        type="radio" 
                        name="price_display" 
                        value="base" 
                        checked={priceDisplayMode === 'base'} 
                        onChange={() => onPriceDisplayModeChange('base')}
                        className="form-radio text-blue-600"
                    />
                    <span className="text-sm">Giá vé cơ bản cho người lớn</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer p-1">
                    <input 
                        type="radio" 
                        name="price_display" 
                        value="total" 
                        checked={priceDisplayMode === 'total'} 
                        onChange={() => onPriceDisplayModeChange('total')}
                        className="form-radio text-blue-600"
                    />
                    <span className="text-sm font-semibold">Giá vé bao gồm thuế và phí</span>
                </label>
                <div className="text-xs text-gray-500 italic mt-2 border-t pt-2 dark:border-gray-600">
                    * Thuế và phí bao gồm VAT, phí sân bay, phí an ninh và các khoản phụ thu khác.
                </div>
            </SidebarCard>
        )}

        {/* New Copy Tool Widget */}
        {searchParams && outboundFlights && outboundFlights.length > 0 && (
            <CopyFlightTool 
                outboundFlights={outboundFlights} 
                inboundFlights={inboundFlights || []} 
                params={searchParams} 
                feeConfig={feeConfig}
            />
        )}

        <SidebarCard title="Sắp xếp">
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="sort" value="price" checked={sortOption === 'price'} onChange={e => onSortChange(e.target.value)} className="form-radio text-red-600"/>
                <span className="text-sm">Giá thấp</span>
            </label>
             <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="sort" value="time" checked={sortOption === 'time'} onChange={e => onSortChange(e.target.value)} className="form-radio text-red-600"/>
                <span className="text-sm">Thời gian khởi hành</span>
            </label>
             <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="sort" value="airline" checked={sortOption === 'airline'} onChange={e => onSortChange(e.target.value)} className="form-radio text-red-600"/>
                <span className="text-sm">Hãng</span>
            </label>
        </SidebarCard>

        <SidebarCard title="Khai thác bởi">
            {availableAirlines.length > 1 && (
                <label className="flex items-center space-x-2 cursor-pointer border-b border-[var(--border-color)] pb-3">
                    <input 
                        type="checkbox"
                        checked={areAllAirlinesSelected}
                        onChange={handleSelectAll}
                        className="form-checkbox text-red-600 rounded"
                    />
                    <span className="text-sm font-semibold">Chọn tất cả</span>
                </label>
            )}
            {availableAirlines.map(airline => (
                 <label key={airline} className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={filteredAirlines.includes(airline)}
                        onChange={(e) => onAirlineFilterChange(airline, e.target.checked)}
                        className="form-checkbox text-red-600 rounded"
                     />
                    <span className="text-sm">{airline}</span>
                </label>
            ))}
        </SidebarCard>
        
        <SidebarCard title="Thời gian khởi hành">
            <div className="space-y-2">
                <TimeFilterButton label="Sáng sớm" range="early_morning" subtext="00:00-06:00" isActive={timeFilters.includes('early_morning')} onClick={() => onTimeFilterChange('early_morning')} />
                <TimeFilterButton label="Buổi sáng" range="morning" subtext="06:00-12:00" isActive={timeFilters.includes('morning')} onClick={() => onTimeFilterChange('morning')} />
                <TimeFilterButton label="Buổi chiều" range="afternoon" subtext="12:00-18:00" isActive={timeFilters.includes('afternoon')} onClick={() => onTimeFilterChange('afternoon')} />
                <TimeFilterButton label="Buổi tối" range="evening" subtext="18:00-24:00" isActive={timeFilters.includes('evening')} onClick={() => onTimeFilterChange('evening')} />
            </div>
        </SidebarCard>

        <SidebarCard title="Nối chuyến">
            <div className="space-y-2">
                {stopOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={stopFilters.includes(option.value)}
                            onChange={() => onStopFilterChange(option.value)}
                            className="form-checkbox text-red-600 rounded"
                        />
                        <span className="text-sm">{option.label}</span>
                    </label>
                ))}
            </div>
        </SidebarCard>

    </aside>
  );
};

export default Sidebar;
