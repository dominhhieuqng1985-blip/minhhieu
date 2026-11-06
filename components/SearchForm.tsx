
import React, { useState, useEffect, useRef } from 'react';
import { type TripType, type SearchParams, type Passengers, type FlightSegment } from '../types';
import AirportSelector from './AirportSelector';
import PassengerSelector from './PassengerSelector';
import PriceCalendar from './PriceCalendar';
import { CalendarIcon, PlaneTakeoffIcon, PlaneLandIcon, UserIcon, SearchIcon, RefreshIcon, CheckIcon, SwapArrowsIcon, MicrophoneIcon, WaveformIcon, ClockIcon, PlusIcon, TrashIcon, MapPinIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';
import { synthesizeSpeech, parseVoiceFlightQuery } from '../services/geminiService';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  initialParams?: SearchParams | null;
}

const airlines = [
    { code: 'VN', name: 'Vietnam Airlines', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VN.gif' },
    { code: 'VJ', name: 'Vietjet Air', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VJ.gif' },
    { code: 'QH', name: 'Bamboo Airways', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/QH.gif' },
    { code: 'VU', name: 'Vietravel Airlines', logo: 'https://plugin.datacom.vn/Resources/Images/Airline/VU.gif' },
];

const formatDateForDisplay = (dateString: string, isMonth = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    if (isMonth) return `Tháng ${month}, ${year}`;
    return `${day}/${month}/${year}`;
}

const getCityName = (code: string) => {
    const airport = AIRPORTS.find(a => a.id === code);
    if (!airport) return code;
    const match = airport.name.match(/(.*?)\s*\(/);
    return match ? match[1].trim() : airport.name;
};

const RECENT_SEARCHES_KEY = 'flight_recent_searches';

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading, initialParams }) => {
  const [tripType, setTripType] = useState<TripType>('one_way');
  const [departureId, setDepartureId] = useState<string>('SGN');
  const [arrivalId, setArrivalId] = useState<string>('HAN');
  const [activeAirportModal, setActiveAirportModal] = useState<'departure' | 'arrival' | null>(null);
  const [activeMultiCityModal, setActiveMultiCityModal] = useState<{ index: number, type: 'departure' | 'arrival' } | null>(null);

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getDayAfterTomorrow = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  };

  const [outboundDate, setOutboundDate] = useState<string>(getTomorrow());
  const [returnDate, setReturnDate] = useState<string>(getDayAfterTomorrow());
  const [passengers, setPassengers] = useState<Passengers>({ adults: 1, children: 0, infants: 0 });
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>(airlines.map(a => a.code));
  const [formError, setFormError] = useState<string | null>(null);
  const [isCalendarOpen, setCalendarOpen] = useState<'outbound' | 'inbound' | null>(null);
  const [findCheapest, setFindCheapest] = useState(false);
  const [isMonthSearch, setIsMonthSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchParams[]>([]);

  const [multiCitySegments, setMultiCitySegments] = useState<FlightSegment[]>([
      { departure_id: 'SGN', arrival_id: 'HAN', date: getTomorrow() },
      { departure_id: 'HAN', arrival_id: 'DAD', date: getDayAfterTomorrow() }
  ]);

  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  useEffect(() => {
    if (initialParams) {
      setTripType(initialParams.type);
      setDepartureId(initialParams.departure_id);
      setArrivalId(initialParams.arrival_id);
      setOutboundDate(initialParams.outbound_date);
      if (initialParams.return_date) {
        setReturnDate(initialParams.return_date);
      } else {
        setReturnDate(getDayAfterTomorrow());
      }
      setPassengers(initialParams.passengers);
      if (initialParams.multiCity) {
          setMultiCitySegments(initialParams.multiCity);
      }
      if (initialParams.isMonthSearch) {
          setIsMonthSearch(initialParams.isMonthSearch);
      }
    }
    
    try {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    } catch (e) {
        console.warn("Failed to load recent searches");
    }
  }, [initialParams]);

  const handleAirlineToggle = (code: string) => {
    setSelectedAirlines(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSwapAirports = () => {
    const temp = departureId;
    setDepartureId(arrivalId);
    setArrivalId(temp);
  };
  
  const handleDepartureSelect = (id: string) => {
    setDepartureId(id);
    setActiveAirportModal('arrival');
  };

  const handleArrivalSelect = (id: string) => {
    setArrivalId(id);
    setActiveAirportModal(null);
  };

  const saveRecentSearch = (params: SearchParams) => {
      let newSearches = [params, ...recentSearches];
      newSearches = newSearches.filter((item, index, self) => 
        index === self.findIndex((t) => (
            t.departure_id === item.departure_id &&
            t.arrival_id === item.arrival_id &&
            t.outbound_date === item.outbound_date &&
            t.return_date === item.return_date &&
            t.type === item.type
        ))
      );
      newSearches = newSearches.slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
  };

  const handleSubmit = (e: React.FormEvent) => {
    if(e) e.preventDefault();
    setFormError(null);

    if (tripType === 'multi_city') {
        for (let i = 0; i < multiCitySegments.length; i++) {
            const seg = multiCitySegments[i];
            if (seg.departure_id === seg.arrival_id) {
                setFormError(`Chặng ${i + 1}: Điểm đi và điểm đến không được trùng nhau.`);
                return;
            }
        }
    } else {
        if (departureId === arrivalId) {
            setFormError('Điểm đi và điểm đến không được trùng nhau.');
            return;
        }
    }
    
    const params: SearchParams = {
      departure_id: departureId,
      arrival_id: arrivalId,
      outbound_date: outboundDate,
      type: tripType,
      passengers: passengers,
      isMonthSearch: isMonthSearch
    };

    if (tripType === 'round_trip') {
      if (!returnDate) {
        setFormError('Vui lòng chọn ngày về.');
        return;
      }
       if (new Date(returnDate) < new Date(outboundDate)) {
        setFormError('Ngày về phải sau hoặc cùng ngày đi.');
        return;
      }
      params.return_date = returnDate;
    }

    if (tripType === 'multi_city') {
        params.multiCity = multiCitySegments;
        params.departure_id = multiCitySegments[0].departure_id;
        params.arrival_id = multiCitySegments[0].arrival_id;
        params.outbound_date = multiCitySegments[0].date;
    }
    
    saveRecentSearch(params);
    onSearch(params);
  };
  
  const handleApplyRecentSearch = (params: SearchParams) => {
      setDepartureId(params.departure_id);
      setArrivalId(params.arrival_id);
      setOutboundDate(params.outbound_date);
      setTripType(params.type);
      if(params.return_date) setReturnDate(params.return_date);
      setPassengers(params.passengers);
      if (params.multiCity) setMultiCitySegments(params.multiCity);
      if (params.isMonthSearch) setIsMonthSearch(params.isMonthSearch);
      onSearch(params);
  };
  
  useEffect(() => {
    if (findCheapest) {
        setCalendarOpen('outbound');
    }
  }, [findCheapest]);

  const handleMultiCityChange = (index: number, field: keyof FlightSegment, value: string) => {
      const newSegments = [...multiCitySegments];
      newSegments[index] = { ...newSegments[index], [field]: value };
      setMultiCitySegments(newSegments);
      
      if (field === 'departure_id') {
          setActiveMultiCityModal({ index, type: 'arrival' });
      } else if (field === 'arrival_id') {
          setActiveMultiCityModal(null);
      }
  };

  const addSegment = () => {
      if (multiCitySegments.length >= 4) return;
      const lastSegment = multiCitySegments[multiCitySegments.length - 1];
      const nextDate = new Date(lastSegment.date);
      nextDate.setDate(nextDate.getDate() + 2);
      
      setMultiCitySegments([...multiCitySegments, {
          departure_id: lastSegment.arrival_id,
          arrival_id: 'HAN',
          date: nextDate.toISOString().split('T')[0]
      }]);
  };

  const removeSegment = (index: number) => {
      if (multiCitySegments.length <= 1) return;
      const newSegments = multiCitySegments.filter((_, i) => i !== index);
      setMultiCitySegments(newSegments);
  };

  const playAudioResponse = (base64String: string): Promise<void> => {
      return new Promise(async (resolve) => {
          try {
              const audio = new Audio(`data:audio/wav;base64,${base64String}`);
              audio.onended = () => resolve();
              audio.onerror = async () => {
                  try {
                      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                      const binaryString = atob(base64String);
                      const len = binaryString.length;
                      const bytes = new Uint8Array(len);
                      for (let i = 0; i < len; i++) {
                          bytes[i] = binaryString.charCodeAt(i);
                      }
                      if (bytes.length >= 4 && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF') {
                          const buffer = await audioContext.decodeAudioData(bytes.buffer);
                          const source = audioContext.createBufferSource();
                          source.buffer = buffer;
                          source.connect(audioContext.destination);
                          source.onended = () => resolve();
                          source.start();
                      } else {
                          const dataInt16 = new Int16Array(bytes.buffer);
                          const frameCount = dataInt16.length; 
                          const audioBuffer = audioContext.createBuffer(1, frameCount, 24000);
                          const channelData = audioBuffer.getChannelData(0);
                          for (let i = 0; i < frameCount; i++) {
                              channelData[i] = dataInt16[i] / 32768.0;
                          }
                          const source = audioContext.createBufferSource();
                          source.buffer = audioBuffer;
                          source.connect(audioContext.destination);
                          source.onended = () => resolve();
                          source.start();
                      }
                  } catch (e2) {
                      console.error("Audio playback fallback error:", e2);
                      resolve();
                  }
              };
              await audio.play().catch(() => {
                  audio.onerror?.(new Event('error'));
              });
              setTimeout(() => resolve(), 7000);
          } catch (e) {
              console.error("Audio playback error:", e);
              resolve();
          }
      });
  };

  const speakResponse = async (text: string): Promise<void> => {
      try {
          const base64Audio = await synthesizeSpeech(text);
          if (base64Audio) {
              await playAudioResponse(base64Audio);
          }
      } catch (e: any) {
          console.warn("TTS Error, skipping voice output:", e);
      }
  };

  const startListening = () => {
      if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
          alert('Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói.');
          return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
          setIsListening(true);
          setVoiceText('Đang nghe...');
          setFormError(null);
      };

      recognition.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setVoiceText(`"${transcript}"`);
          setIsListening(false);
          setIsProcessingVoice(true);
          
          try {
              const data = await processVoiceQuery(transcript);
              
              if (data.departure_id) setDepartureId(data.departure_id);
              if (data.arrival_id) setArrivalId(data.arrival_id);
              if (data.outbound_date) setOutboundDate(data.outbound_date);
              
              let newTripType: TripType = 'one_way';
              if (data.return_date) {
                  setReturnDate(data.return_date);
                  setTripType('round_trip');
                  newTripType = 'round_trip';
              } else {
                  setTripType('one_way');
                  newTripType = 'one_way';
              }

              const finalDeparture = data.departure_id || departureId;
              const finalArrival = data.arrival_id || arrivalId;
              const finalOutbound = data.outbound_date || outboundDate;
              
              if (finalDeparture === finalArrival) {
                   setFormError('Điểm đi và đến trùng nhau. Vui lòng kiểm tra lại.');
                   setIsProcessingVoice(false);
                   return;
              }

              const params: SearchParams = {
                  departure_id: finalDeparture,
                  arrival_id: finalArrival,
                  outbound_date: finalOutbound,
                  type: newTripType,
                  passengers: passengers, 
                  return_date: newTripType === 'round_trip' ? data.return_date : undefined
              };
              
              const depName = getCityName(finalDeparture);
              const arrName = getCityName(finalArrival);
              const dateObj = new Date(finalOutbound);
              const spokenDate = `ngày ${dateObj.getDate()} tháng ${dateObj.getMonth() + 1}`;
              
              const confirmText = `Đã rõ. Đang tìm vé từ ${depName} đi ${arrName} ${spokenDate}.`;
              
              await speakResponse(confirmText);

              saveRecentSearch(params);
              onSearch(params); 

          } catch (error: any) {
              console.error(error);
              if (error.message.includes('429')) {
                  setFormError("Hệ thống AI đang quá tải (Quota). Vui lòng tìm kiếm thủ công.");
              } else {
                  setFormError(`Lỗi xử lý: ${error.message}`);
                  speakResponse("Xin lỗi, tôi chưa nghe rõ. Vui lòng thử lại.");
              }
          } finally {
              setIsProcessingVoice(false);
          }
      };

      recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
              setFormError('Vui lòng cho phép truy cập Micro trên trình duyệt để sử dụng tính năng này.');
          } else if (event.error === 'no-speech') {
              setFormError('Không nghe thấy giọng nói. Vui lòng thử lại.');
          } else {
              setFormError(`Lỗi nhận diện: ${event.error}. Vui lòng thử lại.`);
          }
      };

      recognition.start();
  };

  const processVoiceQuery = async (text: string) => {
    try {
      return await parseVoiceFlightQuery(text);
    } catch (e: any) {
      console.error("AI parse error", e);
      throw new Error("AI không phân tích được yêu cầu. Vui lòng thử lại.");
    }
  };
  
  const renderMultiCity = () => {
    return (
        <div className="space-y-4">
             {multiCitySegments.map((segment, index) => (
                 <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="md:col-span-1 text-center font-bold text-gray-500 text-sm">Chặng {index + 1}</div>
                    
                    <div className="md:col-span-2 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
                         <AirportSelector
                            id={`multi_dep_${index}`}
                            selectedAirportId={segment.departure_id}
                            onSelectAirport={(id) => handleMultiCityChange(index, 'departure_id', id)}
                            placeholder="Điểm đi"
                            className="w-full text-sm min-w-0"
                            isOpen={activeMultiCityModal?.index === index && activeMultiCityModal?.type === 'departure'}
                            onOpen={() => setActiveMultiCityModal({ index, type: 'departure' })}
                            onClose={() => setActiveMultiCityModal(null)}
                         />
                    </div>
                    
                    <div className="hidden md:flex md:col-span-1 justify-center">
                        <SwapArrowsIcon className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="md:col-span-2 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
                        <AirportSelector
                            id={`multi_arr_${index}`}
                            selectedAirportId={segment.arrival_id}
                            onSelectAirport={(id) => handleMultiCityChange(index, 'arrival_id', id)}
                            placeholder="Điểm đến"
                            className="w-full text-sm min-w-0"
                            isOpen={activeMultiCityModal?.index === index && activeMultiCityModal?.type === 'arrival'}
                            onOpen={() => setActiveMultiCityModal({ index, type: 'arrival' })}
                            onClose={() => setActiveMultiCityModal(null)}
                         />
                    </div>
                    
                    <div className="md:col-span-1">
                         <input 
                            type="date" 
                            value={segment.date}
                            onChange={(e) => handleMultiCityChange(index, 'date', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none"
                         />
                    </div>

                     {index > 1 && (
                         <div className="md:col-span-1 flex justify-center">
                             <button type="button" onClick={() => removeSegment(index)} className="text-red-500 hover:text-red-700 p-1">
                                 <TrashIcon className="w-5 h-5"/>
                             </button>
                         </div>
                     )}
                 </div>
             ))}

            <div className="flex justify-between items-center">
                <button 
                    type="button" 
                    onClick={addSegment} 
                    disabled={multiCitySegments.length >= 4}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlusIcon className="w-4 h-4" /> Thêm chuyến bay
                </button>
                <div className="flex items-center bg-[var(--card-bg-color)] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                    <UserIcon className="text-gray-500 w-4 h-4 mr-2"/>
                    <PassengerSelector value={passengers} onChange={setPassengers} />
                </div>
            </div>
            
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors duration-300 disabled:bg-orange-300 disabled:cursor-wait flex items-center justify-center mt-2"
                >
                {isLoading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                    <>
                    <SearchIcon className="h-5 w-5" />
                    <span className="ml-2">TÌM CHUYẾN BAY (NHIỀU CHẶNG)</span>
                    </>
                )}
            </button>
        </div>
    );
  };
  
  const renderOneWayRoundTrip = () => {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,_2fr)_auto_minmax(0,_2fr)_minmax(0,_2fr)_minmax(0,_2fr)_minmax(0,_1fr)_auto] gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="flex items-center bg-[var(--card-bg-color)]">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 h-full flex items-center"><PlaneTakeoffIcon className="text-gray-500"/></div>
                    <AirportSelector
                        id="departure"
                        selectedAirportId={departureId}
                        onSelectAirport={handleDepartureSelect}
                        placeholder="Điểm đi"
                        className="flex-grow min-w-0"
                        isOpen={activeAirportModal === 'departure'}
                        onOpen={() => setActiveAirportModal('departure')}
                        onClose={() => setActiveAirportModal(null)}
                    />
                </div>

                <div className="flex items-center justify-center bg-[var(--card-bg-color)] px-1">
                    <button
                        type="button"
                        onClick={handleSwapAirports}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-500 transition-colors"
                        aria-label="Đảo chiều điểm đi và điểm đến"
                    >
                        <SwapArrowsIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center bg-[var(--card-bg-color)]">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 h-full flex items-center"><PlaneLandIcon className="text-gray-500"/></div>
                    <AirportSelector
                        id="arrival"
                        selectedAirportId={arrivalId}
                        onSelectAirport={handleArrivalSelect}
                        placeholder="Điểm đến"
                        className="flex-grow min-w-0"
                        isOpen={activeAirportModal === 'arrival'}
                        onOpen={() => setActiveAirportModal('arrival')}
                        onClose={() => setActiveAirportModal(null)}
                    />
                </div>
                 <div className="flex items-center bg-[var(--card-bg-color)]">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 h-full flex items-center"><CalendarIcon className="text-gray-500"/></div>
                    {isMonthSearch ? (
                         <input 
                            type="month"
                            value={outboundDate.slice(0, 7)}
                            onChange={(e) => {
                                const val = e.target.value;
                                if(val) setOutboundDate(`${val}-01`); 
                            }}
                            className="w-full p-2 bg-transparent focus:outline-none cursor-pointer"
                         />
                    ) : (
                        <button type="button" onClick={() => setCalendarOpen('outbound')} className="w-full p-2 text-left bg-transparent focus:outline-none">
                            {formatDateForDisplay(outboundDate)}
                        </button>
                    )}
                 </div>
                 <div className="flex items-center bg-[var(--card-bg-color)]">
                    <div className={`bg-gray-100 dark:bg-gray-800 p-3 h-full flex items-center ${tripType === 'one_way' ? 'opacity-50' : ''}`}><CalendarIcon className={`${tripType === 'one_way' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500'}`}/></div>
                     {isMonthSearch ? (
                         <input 
                            type="month"
                            disabled={tripType === 'one_way'}
                            value={returnDate.slice(0, 7)}
                            onChange={(e) => {
                                const val = e.target.value;
                                if(val) setReturnDate(`${val}-01`);
                            }}
                            className="w-full p-2 bg-transparent focus:outline-none disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed"
                         />
                     ) : (
                         <button type="button" onClick={() => setCalendarOpen('inbound')} disabled={tripType === 'one_way'} className="w-full p-2 text-left bg-transparent focus:outline-none disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed">
                            {tripType === 'round_trip' ? formatDateForDisplay(returnDate) : 'Ngày về'}
                        </button>
                     )}
                 </div>
                 <div className="flex items-center bg-[var(--card-bg-color)]">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 h-full flex items-center"><UserIcon className="text-gray-500"/></div>
                    <PassengerSelector
                      value={passengers}
                      onChange={setPassengers}
                    />
                 </div>
                 <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-orange-500 text-white font-bold py-3 px-4 hover:bg-orange-600 transition-colors duration-300 disabled:bg-orange-300 disabled:cursor-wait flex items-center justify-center"
                    >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <>
                        <SearchIcon className="h-5 w-5" />
                        <span className="ml-2 hidden lg:inline">TÌM KIẾM</span>
                        </>
                    )}
                </button>
            </div>
        </>
    );
  };

  return (
    <div className="bg-[var(--card-bg-color)] rounded-lg shadow-lg relative">
        {(isListening || isProcessingVoice) && (
            <div className="absolute inset-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isListening ? 'bg-red-100 animate-pulse' : 'bg-blue-100'}`}>
                    {isListening ? <MicrophoneIcon className="w-8 h-8 text-red-600 animate-bounce" /> : <WaveformIcon className="w-8 h-8 text-blue-600 animate-spin" />}
                </div>
                <p className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                    {isListening ? "Đang nghe bạn nói..." : "Đang xử lý & Phản hồi..."}
                </p>
                <p className="text-gray-500 italic text-center animate-fade-in">{voiceText}</p>
                {isListening && <button onClick={() => setIsListening(false)} className="mt-4 text-sm text-red-500 underline">Hủy bỏ</button>}
            </div>
        )}

        {isCalendarOpen && (
            <PriceCalendar
                departureId={departureId}
                arrivalId={arrivalId}
                onClose={() => setCalendarOpen(null)}
                onSelectDate={(date) => {
                    if (isCalendarOpen === 'outbound') {
                        setOutboundDate(date);
                        if (tripType === 'round_trip' && new Date(date) > new Date(returnDate)) {
                            const nextDay = new Date(date);
                            nextDay.setDate(nextDay.getDate() + 1);
                            setReturnDate(nextDay.toISOString().split('T')[0]);
                        }
                    } else {
                        setReturnDate(date);
                    }
                    setCalendarOpen(null);
                }}
                minDate={isCalendarOpen === 'inbound' ? outboundDate : undefined}
                selectedDate={isCalendarOpen === 'outbound' ? outboundDate : returnDate}
            />
        )}

        <div className="bg-[#0083C2] text-white flex items-center justify-between p-3 rounded-t-lg">
            <div className="flex items-center">
                <RefreshIcon className="w-6 h-6" /> 
                <h2 className="text-xl font-bold ml-2">TÌM KIẾM CHUYẾN BAY</h2>
            </div>
            <button onClick={startListening} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors text-sm font-semibold backdrop-blur-sm border border-white/30" title="Tìm bằng giọng nói">
                <MicrophoneIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Voice Search</span>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="tripType" value="round_trip" checked={tripType === 'round_trip'} onChange={() => setTripType('round_trip')} className="form-radio text-orange-500 h-4 w-4"/>
                        <span className="font-semibold">Khứ hồi</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="tripType" value="one_way" checked={tripType === 'one_way'} onChange={() => setTripType('one_way')} className="form-radio text-orange-500 h-4 w-4"/>
                        <span className="font-semibold">Một chiều</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="tripType" value="multi_city" checked={tripType === 'multi_city'} onChange={() => setTripType('multi_city')} className="form-radio text-orange-500 h-4 w-4"/>
                        <span className="font-semibold">Nhiều chặng</span>
                    </label>
                </div>
                
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={isMonthSearch} onChange={(e) => setIsMonthSearch(e.target.checked)} className="form-checkbox text-orange-500 rounded-sm h-4 w-4"/>
                        <span className="font-semibold">Tìm theo tháng</span>
                    </label>
                    {/* Preserve old check for calendar popup if desired, though now redundant with month search */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={findCheapest} onChange={(e) => setFindCheapest(e.target.checked)} className="form-checkbox text-orange-500 rounded-sm h-4 w-4"/>
                        <span className="font-semibold">Tìm vé rẻ</span>
                    </label>
                </div>
            </div>

            <div className="flex items-center space-x-6 border-t border-b border-[var(--border-color)] py-4">
                {airlines.map((airline) => (
                    <div key={airline.code} onClick={() => handleAirlineToggle(airline.code)} className="cursor-pointer relative">
                         <img src={airline.logo} alt={airline.name} className={`h-6 object-contain transition-opacity duration-200 ${selectedAirlines.includes(airline.code) ? 'opacity-100' : 'opacity-30 dark:opacity-50'}`} />
                         {selectedAirlines.includes(airline.code) && (
                             <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-px ring-1 ring-white">
                                 <CheckIcon className="w-2.5 h-2.5 text-white" />
                             </div>
                         )}
                    </div>
                ))}
            </div>

            {tripType === 'multi_city' ? renderMultiCity() : renderOneWayRoundTrip()}

            {formError && (
                <p className="text-red-600 text-center font-semibold text-sm mt-3 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                    {formError}
                </p>
            )}

            {recentSearches.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 items-center text-sm pt-2 border-t border-[var(--border-color)]">
                    <span className="text-gray-500 flex items-center gap-1 font-semibold text-xs uppercase">
                        <ClockIcon className="w-3 h-3" /> Tìm gần đây:
                    </span>
                    {recentSearches.map((s, idx) => (
                        <button key={idx} type="button" onClick={() => handleApplyRecentSearch(s)} className="bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1 rounded-full transition-colors flex items-center gap-1 text-xs border border-transparent hover:border-blue-300">
                            <span className="font-bold">{s.departure_id}</span> <SwapArrowsIcon className="w-3 h-3 text-gray-400" /> <span className="font-bold">{s.arrival_id}</span>
                            <span className="text-gray-500 ml-1">({formatDateForDisplay(s.outbound_date)})</span>
                        </button>
                    ))}
                </div>
            )}
        </form>
    </div>
  );
};

export default SearchForm;
