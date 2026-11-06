import React, { useState } from 'react';
import { TripType, SearchParams } from '../types';
import { PlaneIcon, SwapIcon } from './icons';

interface FlightSearchFormProps {
  onSearch: (criteria: SearchParams) => void;
}

export const FlightSearchForm: React.FC<FlightSearchFormProps> = ({ onSearch }) => {
  const [tripType, setTripType] = useState<TripType>('round_trip');
  const [from, setFrom] = useState('SGN');
  const [to, setTo] = useState('HAN');
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      type: tripType,
      departure_id: from,
      arrival_id: to,
      outbound_date: departureDate,
      return_date: tripType === 'round_trip' ? returnDate : undefined,
      passengers,
    });
  };
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-4xl mx-auto -mt-10 relative z-10">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center mb-6 space-x-6">
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="tripType" value="round_trip" checked={tripType === 'round_trip'} onChange={() => setTripType('round_trip')} className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500" />
            <span className="ml-2 text-gray-700 font-medium">Khứ hồi</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="tripType" value="one_way" checked={tripType === 'one_way'} onChange={() => setTripType('one_way')} className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500" />
            <span className="ml-2 text-gray-700 font-medium">Một chiều</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
             <div>
                <label htmlFor="from" className="block text-sm font-medium text-gray-500">Điểm đi</label>
                <input type="text" id="from" value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} className="mt-1 block w-full border-b-2 border-gray-300 focus:border-red-500 focus:ring-0 text-xl font-bold p-2" placeholder="SGN" />
            </div>
            <div>
                <label htmlFor="to" className="block text-sm font-medium text-gray-500">Điểm đến</label>
                <input type="text" id="to" value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} className="mt-1 block w-full border-b-2 border-gray-300 focus:border-red-500 focus:ring-0 text-xl font-bold p-2" placeholder="HAN" />
            </div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border shadow-md hidden sm:block">
                 <button type="button" onClick={handleSwap} className="text-gray-500 hover:text-red-600 transition-transform duration-300 hover:rotate-180">
                    <SwapIcon className="w-6 h-6" />
                </button>
            </div>
          </div>
          
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="departureDate" className="block text-sm font-medium text-gray-500">Ngày đi</label>
                <input type="date" id="departureDate" value={departureDate} min={today} onChange={(e) => setDepartureDate(e.target.value)} className="mt-1 block w-full border-b-2 border-gray-300 focus:border-red-500 focus:ring-0 text-lg p-2" />
            </div>
            <div>
                <label htmlFor="returnDate" className="block text-sm font-medium text-gray-500">Ngày về</label>
                <input type="date" id="returnDate" value={returnDate} min={departureDate} disabled={tripType === 'one_way'} onChange={(e) => setReturnDate(e.target.value)} className="mt-1 block w-full border-b-2 border-gray-300 focus:border-red-500 focus:ring-0 text-lg p-2 disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>
          </div>
          
          <div className="md:col-span-1">
            <button type="submit" className="w-full bg-[#fdb913] hover:bg-yellow-500 text-[#da251d] font-bold py-3 px-4 rounded-lg flex items-center justify-center text-lg transition-colors">
              <PlaneIcon className="w-6 h-6 mr-2" />
              Tìm bay
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};