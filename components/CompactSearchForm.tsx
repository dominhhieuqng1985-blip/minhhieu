import React, { useState, useEffect } from 'react';
import { type TripType, type SearchParams, type Passengers } from '../types';
import AirportSelector from './AirportSelector';
import PassengerSelector from './PassengerSelector';
import { CalendarIcon, SearchIcon, SwapArrowsIcon, TicketIcon } from './icons/Icons';

interface CompactSearchFormProps {
  onSearch: (params: SearchParams) => void;
  initialParams?: SearchParams | null;
}

const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

const CompactSearchForm: React.FC<CompactSearchFormProps> = ({ onSearch, initialParams }) => {
  const [tripType, setTripType] = useState<TripType>('round_trip');
  const [departureId, setDepartureId] = useState('SGN');
  const [arrivalId, setArrivalId] = useState('HAN');
  const [outboundDate, setOutboundDate] = useState(formatDateForInput(new Date(Date.now() + 86400000))); // Tomorrow
  const [returnDate, setReturnDate] = useState(formatDateForInput(new Date(Date.now() + 2 * 86400000))); // Day after tomorrow
  const [passengers, setPassengers] = useState<Passengers>({ adults: 1, children: 0, infants: 0 });
  
  const [activeAirportModal, setActiveAirportModal] = useState<'departure' | 'arrival' | null>(null);

  useEffect(() => {
    if (initialParams) {
      setTripType(initialParams.type);
      setDepartureId(initialParams.departure_id);
      setArrivalId(initialParams.arrival_id);
      setOutboundDate(initialParams.outbound_date);
      setReturnDate(initialParams.return_date || formatDateForInput(new Date(Date.now() + 2 * 86400000)));
      setPassengers(initialParams.passengers);
    }
  }, [initialParams]);

  const handleSwapAirports = () => {
    const temp = departureId;
    setDepartureId(arrivalId);
    setArrivalId(temp);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: SearchParams = {
      departure_id: departureId,
      arrival_id: arrivalId,
      outbound_date: outboundDate,
      type: tripType,
      passengers,
      return_date: tripType === 'round_trip' ? returnDate : undefined,
    };
    onSearch(params);
  };

  return (
    <div className="bg-red-600 rounded-lg shadow-lg text-white p-4">
      <div className="flex items-center justify-center space-x-6 mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="radio" name="tripTypeCompact" value="round_trip" checked={tripType === 'round_trip'} onChange={() => setTripType('round_trip')} className="form-radio bg-transparent border-white text-yellow-400 h-4 w-4"/>
          <span className="font-semibold text-sm">Khứ hồi</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="radio" name="tripTypeCompact" value="one_way" checked={tripType === 'one_way'} onChange={() => setTripType('one_way')} className="form-radio bg-transparent border-white text-yellow-400 h-4 w-4"/>
          <span className="font-semibold text-sm">Một chiều</span>
        </label>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Departure */}
        <div className="bg-white text-gray-800 dark:text-white dark:bg-gray-700 rounded-md">
           <label className="text-xs pl-3 pt-1 text-gray-500 dark:text-gray-400">Điểm khởi hành</label>
           <AirportSelector
                id="compact_departure"
                selectedAirportId={departureId}
                onSelectAirport={setDepartureId}
                className="w-full text-sm font-semibold"
                isOpen={activeAirportModal === 'departure'}
                onOpen={() => setActiveAirportModal('departure')}
                onClose={() => setActiveAirportModal(null)}
            />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
            <button type="button" onClick={handleSwapAirports} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40">
                <SwapArrowsIcon className="w-5 h-5" />
            </button>
        </div>

        {/* Arrival */}
        <div className="bg-white text-gray-800 dark:text-white dark:bg-gray-700 rounded-md">
           <label className="text-xs pl-3 pt-1 text-gray-500 dark:text-gray-400">Điểm đến</label>
           <AirportSelector
                id="compact_arrival"
                selectedAirportId={arrivalId}
                onSelectAirport={setArrivalId}
                className="w-full text-sm font-semibold"
                isOpen={activeAirportModal === 'arrival'}
                onOpen={() => setActiveAirportModal('arrival')}
                onClose={() => setActiveAirportModal(null)}
            />
        </div>

        {/* Dates */}
        <div className="flex gap-2">
          <div className="w-1/2 bg-white text-gray-800 dark:text-white dark:bg-gray-700 rounded-md">
            <label className="text-xs pl-3 pt-1 text-gray-500 dark:text-gray-400">Chọn ngày đi</label>
            <input type="date" value={outboundDate} onChange={e => setOutboundDate(e.target.value)} className="w-full bg-transparent p-1.5 pt-0 text-sm font-semibold border-0 focus:ring-0" />
          </div>
          <div className={`w-1/2 bg-white text-gray-800 dark:text-white dark:bg-gray-700 rounded-md transition-opacity ${tripType === 'one_way' ? 'opacity-50' : 'opacity-100'}`}>
            <label className="text-xs pl-3 pt-1 text-gray-500 dark:text-gray-400">Chọn ngày về</label>
            <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} disabled={tripType === 'one_way'} className="w-full bg-transparent p-1.5 pt-0 text-sm font-semibold border-0 focus:ring-0 disabled:cursor-not-allowed" />
          </div>
        </div>

        {/* Passengers */}
        <div className="bg-white text-gray-800 dark:text-white dark:bg-gray-700 rounded-md">
            <label className="text-xs pl-3 pt-1 text-gray-500 dark:text-gray-400">Hành khách</label>
            <PassengerSelector value={passengers} onChange={setPassengers} />
        </div>
        
         {/* Promo Code */}
        <div className="relative">
            <input type="text" placeholder="Mã khuyến mãi" className="w-full bg-white/20 border-white/30 rounded-md placeholder-white/70 text-sm h-10 pl-10 focus:ring-yellow-400 focus:border-yellow-400" />
            <TicketIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />
        </div>

        {/* Search Button */}
        <button type="submit" className="w-full bg-yellow-400 text-red-700 font-bold py-3 rounded-md hover:bg-yellow-500 transition-colors shadow-lg flex items-center justify-center gap-2">
            <SearchIcon className="w-5 h-5" />
            Tìm chuyến bay
        </button>
      </form>
    </div>
  );
};

export default CompactSearchForm;
