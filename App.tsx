
// ... existing imports ...
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import SearchForm from './components/SearchForm';
import FlightResults, { CheapFlightRoutes } from './components/FlightResults';
import CheckoutPage from './components/CheckoutPage';
import Sidebar from './components/Sidebar';
import PopularFlights from './components/PopularFlights';
import AIPlanner from './components/AIPlanner';
import NewsSection from './components/NewsSection';
import AuthModal from './components/AuthModal';
import AdminPage from './components/AdminPage';
import BookingLookupModal from './components/BookingLookupModal';
import CompactSearchForm from './components/CompactSearchForm';
import MyBookingsModal from './components/MyBookingsModal';
import LiveFlightTracker from './components/LiveFlightTracker';
import AIChatbot from './components/AIChatbot';
import TravelMoodSection from './components/TravelMoodSection'; 
import RightSidebar from './components/RightSidebar'; 
import SimpleCurrencyConverter from './components/SimpleCurrencyConverter';
import IntroAnimation from './components/IntroAnimation'; 
import MonthFlightMatrix from './components/MonthFlightMatrix';

import { type ApiResult, type SearchParams, type Passengers, type FlightOption, type BookingData, type FlightDetailsResult, type BookingOption, TripType, User, SelectedAncillaries, BookingLookupData, DestinationInfo, AdminFeeConfig } from './types';
import { searchFlights, getFlightDetails } from './services/flightService';
import * as authService from './services/authService';
import * as adminService from './services/adminService';
import * as emailService from './services/emailService';
import * as walletService from './services/walletService';
import { CloseIcon, FilterIcon, PlaneIcon, ArrowLeftIcon } from './components/icons/Icons';
import DestinationAssistant from './components/DestinationAssistant';
import { getDestinationInfo } from './services/geminiService';

// ... existing code for HomepageDestinationFeature and ScrollToTop ...
const CHECKOUT_STATE_KEY = 'flightCheckoutState';
const DARK_MODE_KEY = 'flightDarkModeState';
const INTRO_SHOWN_KEY = 'flightIntroShown_v2'; // Updated to v2 to force show intro again
const DESTINATION_CACHE_KEY = 'flightDestinationCache_v1';

const HomepageDestinationFeature: React.FC = () => {
    // ... existing implementation ...
    const [info, setInfo] = useState<DestinationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [cityName, setCityName] = useState('Đà Nẵng');

    useEffect(() => {
        const cities = ["Đà Nẵng", "Hà Nội", "Hồ Chí Minh", "Nha Trang", "Phú Quốc", "Đà Lạt", "Huế", "Quy Nhơn", "Cần Thơ", "Vũng Tàu", "Hạ Long"];
        
        // 1. Try loading from Cache first
        try {
            const cachedData = sessionStorage.getItem(DESTINATION_CACHE_KEY);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                setCityName(parsed.city);
                setInfo(parsed.info);
                setLoading(false);
                return; // Stop here, don't call API
            }
        } catch (e) {
            // Ignore cache errors
        }

        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        setCityName(randomCity);

        const fetchInfo = async () => {
            setLoading(true);
            try {
                const data = await getDestinationInfo(randomCity);
                if (data && data.summary) {
                    setInfo(data);
                    // 2. Save to Cache
                    sessionStorage.setItem(DESTINATION_CACHE_KEY, JSON.stringify({
                        city: randomCity,
                        info: data,
                        timestamp: Date.now()
                    }));
                } else {
                    setInfo(null);
                }
            } catch (e: any) {
                console.warn("AI Info unavailable:", e.message);
                setInfo(null); 
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, []);

    if (!loading && !info) return null; 

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-600 pl-3">Gợi ý khám phá</h2>
            <DestinationAssistant info={info} cityName={cityName} loading={loading} />
        </div>
    );
};

const ScrollToTop: React.FC = () => {
     // ... existing implementation ...
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    useEffect(() => {
        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    return (
        <div className={`fixed bottom-24 right-4 z-50 transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
            <button
                onClick={scrollToTop}
                className="p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
                aria-label="Scroll to top"
            >
                <ArrowLeftIcon className="w-6 h-6 transform rotate-90" />
            </button>
        </div>
    );
};


const App: React.FC = () => {
  // ... existing state and logic ...
  const [outboundSearchResults, setOutboundSearchResults] = useState<ApiResult | null>(null);
  const [inboundSearchResults, setInboundSearchResults] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [currentPassengers, setCurrentPassengers] = useState<Passengers>({ adults: 1, children: 0, infants: 0 });
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<BookingData | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSearchParams, setCurrentSearchParams] = useState<SearchParams | null>(null);
  const [searchFormParams, setSearchFormParams] = useState<SearchParams | null>(null);
  const [bookingDetails, setBookingDetails] = useState<FlightDetailsResult | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState<boolean>(false);
  const [selectedOutboundOption, setSelectedOutboundOption] = useState<BookingOption | null>(null);
  const [selectedInboundOption, setSelectedInboundOption] = useState<BookingOption | null>(null);
  const [sortOption, setSortOption] = useState('price');
  const [filteredAirlines, setFilteredAirlines] = useState<string[]>([]);
  const [timeFilters, setTimeFilters] = useState<string[]>([]);
  const [stopFilters, setStopFilters] = useState<number[]>([]);
  const [priceDisplayMode, setPriceDisplayMode] = useState<'base' | 'total'>('total');
  const [feeConfig, setFeeConfig] = useState<AdminFeeConfig | null>(null);

  // New State for Month Search View
  const [isMonthViewMode, setIsMonthViewMode] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem(DARK_MODE_KEY) === 'true');
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isBookingLookupModalOpen, setBookingLookupModalOpen] = useState(false);
  const [isMyBookingsModalOpen, setMyBookingsModalOpen] = useState(false);
  const [view, setView] = useState<'main' | 'admin' | 'live-flight'>('main');
  
  // Intro Animation State
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
      // Check session storage to show intro only once per session
      const hasShown = sessionStorage.getItem(INTRO_SHOWN_KEY);
      if (!hasShown) {
          setShowIntro(true);
      }
  }, []);

  const handleIntroComplete = () => {
      setShowIntro(false);
      sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(DARK_MODE_KEY, 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(DARK_MODE_KEY, 'false');
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      const savedStateJSON = sessionStorage.getItem(CHECKOUT_STATE_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.selectedFlight && savedState.bookingDetails && savedState.currentPassengers) {
          setSelectedFlight(savedState.selectedFlight);
          setBookingDetails(savedState.bookingDetails);
          setCurrentPassengers(savedState.currentPassengers);
        }
      }
    } catch (error) {
      sessionStorage.removeItem(CHECKOUT_STATE_KEY);
    }
  }, []);

  useEffect(() => {
    adminService.getFeeConfig().then(setFeeConfig);
  }, []);

  useEffect(() => {
    if (bookingDetails) {
        if (bookingDetails.booking_options && bookingDetails.booking_options.length > 0) {
            setSelectedOutboundOption(bookingDetails.booking_options[0]);
        } else if (bookingDetails.outbound_booking_options && bookingDetails.outbound_booking_options.length > 0) {
            setSelectedOutboundOption(bookingDetails.outbound_booking_options[0]);
        } else {
            setSelectedOutboundOption(null);
        }
        if (bookingDetails.inbound_booking_options && bookingDetails.inbound_booking_options.length > 0) {
            setSelectedInboundOption(bookingDetails.inbound_booking_options[0]);
        } else {
            setSelectedInboundOption(null);
        }
    } else {
        setSelectedOutboundOption(null);
        setSelectedInboundOption(null);
    }
  }, [bookingDetails]);
  
  const resetStateForNewSearch = () => {
    setIsLoading(true);
    setError(null);
    setApiError(null);
    setSearchPerformed(true);
    setOutboundSearchResults(null);
    setInboundSearchResults(null);
    setSelectedFlight(null);
    setBookingDetails(null);
    setSelectedOutboundOption(null);
    setSelectedInboundOption(null);
    setBookingConfirmed(false);
    setConfirmedBookingData(null);
    resetFilters();
  }

  const handleSearch = async (params: SearchParams) => {
    resetStateForNewSearch();
    setCurrentPassengers(params.passengers);
    setCurrentSearchParams(params);

    // Month Search Logic Switch
    if (params.isMonthSearch) {
        setIsMonthViewMode(true);
        setIsLoading(false); // Stop loading spinner, waiting for month view to fetch its own data
        return; 
    } else {
        setIsMonthViewMode(false);
    }

    try {
        if (params.type === 'round_trip' && params.return_date) {
            const outboundParams = { ...params, type: 'one_way' as TripType, return_date: undefined };
            const inboundParams = { 
                ...params, 
                departure_id: params.arrival_id,
                arrival_id: params.departure_id,
                outbound_date: params.return_date,
                return_date: undefined,
                type: 'one_way' as TripType,
            };
            
            const [outbound, inbound] = await Promise.all([
                searchFlights(outboundParams),
                searchFlights(inboundParams)
            ]);

            let errors: string[] = [];
            if (outbound.best_flights.length === 0 && outbound.other_flights.length === 0) {
                errors.push('Không tìm thấy chuyến bay đi.');
            }
             if (inbound.best_flights.length === 0 && inbound.other_flights.length === 0) {
                errors.push('Không tìm thấy chuyến bay về.');
            }
            if (errors.length > 0) {
                setError(errors.join(' Vui lòng thử lại với thông tin khác. '));
            }
            
            setOutboundSearchResults(outbound);
            setInboundSearchResults(inbound);

        } else { 
            const results = await searchFlights(params);
            if (results.best_flights.length === 0 && results.other_flights.length === 0) {
                setError('Không tìm thấy chuyến bay nào. Vui lòng thử lại với thông tin khác.');
            }
            setOutboundSearchResults(results);
        }
    } catch (err) {
        setError('Đã xảy ra lỗi khi tìm kiếm chuyến bay. Vui lòng thử lại.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleDateSelectionFromMatrix = (date: string) => {
      if (currentSearchParams) {
          const newParams = { ...currentSearchParams, outbound_date: date, isMonthSearch: false };
          setSearchFormParams(newParams); // Update form UI
          handleSearch(newParams);
      }
  };

  const handleSuggestedSearch = (suggestion: Omit<SearchParams, 'passengers' | 'type'>) => {
    const params: SearchParams = {
        departure_id: suggestion.departure_id,
        arrival_id: suggestion.arrival_id,
        outbound_date: suggestion.outbound_date,
        return_date: suggestion.return_date,
        type: suggestion.return_date ? 'round_trip' : 'one_way',
        passengers: { adults: 1, children: 0, infants: 0 },
    };
    setSearchFormParams(params);
    handleSearch(params);
  };
  
  const handleSelectFlight = async (flight: FlightOption) => {
    setSelectedFlight(flight);
    window.scrollTo(0, 0);

    setIsDetailsLoading(true);
    setApiError(null);
    try {
        const details = await getFlightDetails(flight);
        setBookingDetails(details);
        
        const checkoutState = {
            selectedFlight: flight,
            currentPassengers: currentPassengers,
            bookingDetails: details,
        };
        sessionStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(checkoutState));
    } catch (err) {
        setApiError("Không thể tải chi tiết chuyến bay. Vui lòng thử lại.");
        setBookingDetails(null);
        sessionStorage.removeItem(CHECKOUT_STATE_KEY);
    } finally {
        setIsDetailsLoading(false);
    }
  };

  const handleBackToResults = () => {
    sessionStorage.removeItem(CHECKOUT_STATE_KEY);
    setSelectedFlight(null);
    setBookingDetails(null);
    setSelectedOutboundOption(null);
    setSelectedInboundOption(null);
    setBookingConfirmed(false);
    setConfirmedBookingData(null);
    setApiError(null);
  };
  
  const generateRandomCode = (prefix: string, length: number): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const handleConfirmBooking = async (bookingData: Omit<BookingData, 'id' | 'pnr' | 'bookingTimestamp' | 'flight' | 'bookingDetails' | 'selectedOutboundOption' | 'selectedInboundOption'>) => {
    if (!selectedFlight || !bookingDetails || !selectedOutboundOption) {
        setApiError("Đã xảy ra lỗi: Không có chuyến bay hoặc lựa chọn đặt vé nào được chọn.");
        return;
    }

    setIsLoading(true);
    setApiError(null);

    let finalUserId = currentUser?.id;

    try {
        if (!finalUserId) {
            const contactEmail = bookingData.contact.email.trim().toLowerCase();
            const contactPhone = bookingData.contact.phone.replace(/\s/g, '');
            const defaultPassword = contactPhone; 

            let allUsers = await authService.getAllUsers();
            let existingUser = allUsers.find(u => u.email.trim().toLowerCase() === contactEmail);

            if (existingUser && existingUser.id) {
                finalUserId = existingUser.id;
            } else {
                const newUser: User = {
                    name: bookingData.contact.fullName,
                    email: contactEmail,
                    phone: contactPhone,
                    password: defaultPassword,
                    gender: bookingData.contact.gender,
                    address: bookingData.contact.address,
                    nationality: 'Việt Nam',
                    dob: undefined, 
                    id_card: undefined, 
                };

                const regResult = await authService.register(newUser);
                
                if (regResult.success) {
                    const refreshedUsers = await authService.getAllUsers();
                    const newUserEntry = refreshedUsers.find(u => u.email.trim().toLowerCase() === contactEmail);
                    
                    if (newUserEntry && newUserEntry.id) {
                        finalUserId = newUserEntry.id;
                    } else {
                         const loginRes = await authService.login(contactEmail, defaultPassword);
                         if(loginRes.success && loginRes.user?.id) {
                             finalUserId = loginRes.user.id;
                         }
                    }
                }
            }
        }

        if (!finalUserId) {
            throw new Error("Không thể tạo hồ sơ khách hàng. Vui lòng thử Đăng ký tài khoản thủ công trước khi đặt vé.");
        }

        const fullBookingData: BookingData = {
            ...bookingData,
            id: generateRandomCode('VYY', 8),
            pnr: generateRandomCode('', 6),
            bookingTimestamp: new Date().toISOString(),
            flight: selectedFlight,
            bookingDetails: bookingDetails,
            selectedOutboundOption: selectedOutboundOption,
            selectedInboundOption: selectedInboundOption,
            userId: finalUserId,
            status: bookingData.status || 'pending'
        };

        const createResult = await adminService.createBooking(fullBookingData);
        if (!createResult.success) {
            throw new Error(createResult.message || 'Không thể lưu thông tin đặt vé vào hệ thống.');
        }

        if ((fullBookingData as any).is_wallet_payment) {
            const amount = Number(fullBookingData.total_amount) || 0;
            
            const commission = walletService.calculateCommission(
                currentUser?.role_level, 
                amount, 
                (currentUser as any)?.commission_rate
            );
            
            const walletResult = await walletService.payBookingWithWallet(
                fullBookingData.id,
                finalUserId,
                amount,
                commission
            );
            
            if (!walletResult.success) {
                console.error("Wallet deduction failed:", walletResult.message);
                alert(`LƯU Ý: Đơn hàng đã tạo nhưng lỗi trừ tiền ví: ${walletResult.message}. Liên hệ Admin.`);
            } else {
                console.log("Wallet payment successful. Commission:", commission);
                
                if (currentUser) {
                    const currentBalance = Number(currentUser.balance) || 0;
                    const newBalance = currentBalance - amount + commission;
                    
                    const updatedUser = { 
                        ...currentUser, 
                        balance: newBalance 
                    };
                    
                    setCurrentUser(updatedUser);
                    sessionStorage.setItem('flightUserState', JSON.stringify(updatedUser));
                }
            }
        }

        const emailResult = await emailService.sendConfirmationEmail(fullBookingData);
        if (!emailResult.success) {
            console.warn("Email failed to send.", emailResult.message);
        }

        setConfirmedBookingData(fullBookingData);
        setBookingConfirmed(true);
        window.scrollTo(0, 0);
        sessionStorage.removeItem(CHECKOUT_STATE_KEY);

    } catch (error) {
        console.error("Failed to process booking:", error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
        setApiError(`Không thể hoàn tất yêu cầu đặt vé. ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };


  const resetBaseState = () => {
      sessionStorage.removeItem(CHECKOUT_STATE_KEY);
      setOutboundSearchResults(null);
      setInboundSearchResults(null);
      setIsLoading(false);
      setError(null);
      setApiError(null);
      setSearchPerformed(false);
      setCurrentPassengers({ adults: 1, children: 0, infants: 0 });
      setSelectedFlight(null);
      setBookingDetails(null);
      setSelectedOutboundOption(null);
      setSelectedInboundOption(null);
      setBookingConfirmed(false);
      setConfirmedBookingData(null);
      setSearchFormParams(null);
      setCurrentSearchParams(null);
      setIsMonthViewMode(false);
  };
  
  const handleNewSearch = () => {
      resetBaseState();
      setView('main');
  };
  
  const handleNavigateToAdmin = () => {
      resetBaseState();
      setView('admin');
  }

  const handleNavigateToLiveFlight = () => {
      resetBaseState();
      setView('live-flight');
  }

  const handleExitAdmin = () => {
    setView('main');
  }

  const handleExitLiveFlight = () => {
      setView('main');
  }

  const resetFilters = () => {
    setSortOption('price');
    setFilteredAirlines([]);
    setTimeFilters([]);
    setStopFilters([]);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const availableAirlines = useMemo(() => {
    if (!outboundSearchResults && !inboundSearchResults) return [];
    const allFlights = [
        ...(outboundSearchResults?.best_flights || []),
        ...(outboundSearchResults?.other_flights || []),
        ...(inboundSearchResults?.best_flights || []),
        ...(inboundSearchResults?.other_flights || [])
    ];
    const airlines = new Set(allFlights.map(f => f.flights[0].airline));
    return Array.from(airlines).sort();
  }, [outboundSearchResults, inboundSearchResults]);

  useEffect(() => {
    if (searchPerformed) {
        setFilteredAirlines(availableAirlines);
    }
  }, [availableAirlines, searchPerformed]);

  const handleAirlineFilterChange = (airline: string, isChecked: boolean) => {
    setFilteredAirlines(prev => isChecked ? [...prev, airline] : prev.filter(a => a !== airline));
  };
  
  const handleTimeFilterChange = (timeRange: string) => {
    setTimeFilters(prev => prev.includes(timeRange) ? prev.filter(t => t !== timeRange) : [...prev, timeRange]);
  };
  
  const handleStopFilterChange = (stopCount: number) => {
    setStopFilters(prev => prev.includes(stopCount) ? prev.filter(s => s !== stopCount) : [...prev, stopCount]);
  };
  
  const applyFiltersAndSort = useMemo(() => {
    return (flights: FlightOption[] | undefined): FlightOption[] => {
        if (!flights) return [];
        let processedFlights = [...flights];

        if (filteredAirlines.length > 0 && availableAirlines.length > 0) {
            processedFlights = processedFlights.filter(f => filteredAirlines.includes(f.flights[0].airline));
        }

        if (timeFilters.length > 0) {
            processedFlights = processedFlights.filter(f => {
                const departureHour = new Date(f.flights[0].departure_airport.time).getHours();
                return timeFilters.some(filter => {
                    if (filter === 'early_morning') return departureHour >= 0 && departureHour < 6;
                    if (filter === 'morning') return departureHour >= 6 && departureHour < 12;
                    if (filter === 'afternoon') return departureHour >= 12 && departureHour < 18;
                    if (filter === 'evening') return departureHour >= 18 && departureHour < 24;
                    return false;
                });
            });
        }
        
        if (stopFilters.length > 0) {
            processedFlights = processedFlights.filter(f => {
                const stops = f.flights.length - 1;
                if (stops < 0) return stopFilters.includes(0);
                if (stopFilters.includes(2) && stops >= 2) return true;
                return stopFilters.includes(stops);
            });
        }

        processedFlights.sort((a, b) => {
            switch (sortOption) {
                case 'time':
                    return new Date(a.flights[0].departure_airport.time).getTime() - new Date(b.flights[0].departure_airport.time).getTime();
                case 'earliest': 
                    return new Date(a.flights[0].departure_airport.time).getTime() - new Date(b.flights[0].departure_airport.time).getTime();
                case 'airline':
                    return a.flights[0].airline.localeCompare(b.flights[0].airline);
                case 'price':
                default:
                    return a.price_net - b.price_net;
            }
        });
        return processedFlights;
    };
  }, [sortOption, filteredAirlines, availableAirlines, timeFilters, stopFilters]);

  const displayedOutboundFlights = useMemo(() => {
      if (!outboundSearchResults) return { best_flights: [], other_flights: [] };
      return {
          best_flights: applyFiltersAndSort(outboundSearchResults.best_flights),
          other_flights: applyFiltersAndSort(outboundSearchResults.other_flights),
      }
  }, [outboundSearchResults, applyFiltersAndSort]);

  const displayedInboundFlights = useMemo(() => {
      if (!inboundSearchResults) return { best_flights: [], other_flights: [] };
      return {
          best_flights: applyFiltersAndSort(inboundSearchResults.best_flights),
          other_flights: applyFiltersAndSort(inboundSearchResults.other_flights),
      }
  }, [inboundSearchResults, applyFiltersAndSort]);

  // --- CONDITIONAL RENDERING FOR FULL SCREEN MODES ---

  if (view === 'admin') {
      return <AdminPage onExitAdmin={handleExitAdmin} />;
  }

  if (view === 'live-flight') {
      // HIDE Header/Footer by returning component directly
      return <LiveFlightTracker onExit={handleExitLiveFlight} />;
  }

  // --- STANDARD LAYOUT ---
  const showSidebar = searchPerformed && !isLoading && !isMonthViewMode && (outboundSearchResults || inboundSearchResults);
  const hasActiveNonAirlineFilters = timeFilters.length > 0 || stopFilters.length > 0;
  const hasActiveAirlineFilters = filteredAirlines.length > 0 && filteredAirlines.length < availableAirlines.length;

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] font-sans flex flex-col relative">
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      <ScrollToTop />
      <Header 
        onNavigateHome={handleNewSearch} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        currentUser={currentUser}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onBookingLookupClick={() => setBookingLookupModalOpen(true)}
        onNavigateToAdmin={handleNavigateToAdmin}
        onMyBookingsClick={() => setMyBookingsModalOpen(true)}
        onLiveFlightClick={handleNavigateToLiveFlight}
        currentView={view}
      />
       {isAuthModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} onLoginSuccess={handleLoginSuccess} />}
       {isBookingLookupModalOpen && <BookingLookupModal onClose={() => setBookingLookupModalOpen(false)} />}
       {isMyBookingsModalOpen && currentUser && <MyBookingsModal user={currentUser} onClose={() => setMyBookingsModalOpen(false)} />}
       
       {/* Global Chatbot */}
       <AIChatbot onTriggerSearch={handleSuggestedSearch} />

      <main className="flex-grow">
        {selectedFlight ? (
           <CheckoutPage
            flight={selectedFlight}
            passengers={currentPassengers}
            onBack={handleBackToResults}
            onConfirmBooking={handleConfirmBooking}
            isLoading={isLoading}
            isDetailsLoading={isDetailsLoading}
            bookingDetails={bookingDetails}
            selectedOutboundOption={selectedOutboundOption}
            onSelectOutboundOption={setSelectedOutboundOption}
            selectedInboundOption={selectedInboundOption}
            onSelectInboundOption={setSelectedInboundOption}
            isBookingConfirmed={bookingConfirmed}
            onNewSearch={handleNewSearch}
            onSearch={handleSearch}
            bookingData={confirmedBookingData}
            apiError={apiError}
            currentUser={currentUser}
          />
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-7xl">
              <SearchForm onSearch={handleSearch} isLoading={isLoading} initialParams={searchFormParams} />
              {!searchPerformed && !isLoading && !isMonthViewMode && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-12">
                        <HomepageDestinationFeature />
                        <SimpleCurrencyConverter />
                        <CheapFlightRoutes onSearch={handleSearch} />
                        <PopularFlights onSearch={handleSearch} />
                        <TravelMoodSection onSearch={handleSearch} />
                        <AIPlanner onSuggestedSearch={handleSuggestedSearch} />
                        <NewsSection />
                    </div>
                    {/* Right Sidebar Area */}
                    <div className="hidden lg:block lg:col-span-1">
                       <RightSidebar onSearch={handleSearch} />
                    </div>
                  </div>
              )}

              {/* Month View Matrix */}
              {isMonthViewMode && currentSearchParams && (
                  <div className="mt-8">
                      <MonthFlightMatrix 
                          searchParams={currentSearchParams} 
                          onSelectDate={handleDateSelectionFromMatrix}
                          feeConfig={feeConfig} // Pass Fee Config to calculate real prices
                      />
                  </div>
              )}
              
              {searchPerformed && !isMonthViewMode && (
                <div className="mt-8 flex flex-col md:flex-row gap-8 items-start">
                    {showSidebar && (
                      <>
                        <div className="hidden md:block w-80 flex-shrink-0 space-y-6">
                           <CompactSearchForm onSearch={handleSearch} initialParams={currentSearchParams} />
                           <Sidebar
                              sortOption={sortOption}
                              onSortChange={setSortOption}
                              availableAirlines={availableAirlines}
                              filteredAirlines={filteredAirlines}
                              onAirlineFilterChange={handleAirlineFilterChange}
                              onSelectAllAirlines={() => setFilteredAirlines(availableAirlines)}
                              onDeselectAllAirlines={() => setFilteredAirlines([])}
                              timeFilters={timeFilters}
                              onTimeFilterChange={handleTimeFilterChange}
                              stopFilters={stopFilters}
                              onStopFilterChange={handleStopFilterChange}
                              outboundFlights={[...displayedOutboundFlights.best_flights, ...displayedOutboundFlights.other_flights]}
                              inboundFlights={[...displayedInboundFlights.best_flights, ...displayedInboundFlights.other_flights]}
                              searchParams={currentSearchParams}
                              priceDisplayMode={priceDisplayMode}
                              onPriceDisplayModeChange={setPriceDisplayMode}
                              feeConfig={feeConfig} 
                            />
                        </div>
                         {isSidebarOpen && (
                            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden" onClick={() => setIsSidebarOpen(false)}>
                                <div className="absolute left-0 top-0 h-full w-4/5 max-w-sm bg-[var(--bg-color)] p-4 overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-color)]">
                                        <h2 className="text-lg font-bold">Lọc & Sắp xếp</h2>
                                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                          <CloseIcon className="w-6 h-6"/>
                                        </button>
                                    </div>
                                    <Sidebar
                                        sortOption={sortOption}
                                        onSortChange={setSortOption}
                                        availableAirlines={availableAirlines}
                                        filteredAirlines={filteredAirlines}
                                        onAirlineFilterChange={handleAirlineFilterChange}
                                        onSelectAllAirlines={() => setFilteredAirlines(availableAirlines)}
                                        onDeselectAllAirlines={() => setFilteredAirlines([])}
                                        timeFilters={timeFilters}
                                        onTimeFilterChange={handleTimeFilterChange}
                                        stopFilters={stopFilters}
                                        onStopFilterChange={handleStopFilterChange}
                                        outboundFlights={[...displayedOutboundFlights.best_flights, ...displayedOutboundFlights.other_flights]}
                                        inboundFlights={[...displayedInboundFlights.best_flights, ...displayedInboundFlights.other_flights]}
                                        searchParams={currentSearchParams}
                                        priceDisplayMode={priceDisplayMode}
                                        onPriceDisplayModeChange={setPriceDisplayMode}
                                        feeConfig={feeConfig}
                                     />
                                </div>
                            </div>
                         )}
                      </>
                    )}
                    <div className="w-full">
                       {showSidebar && (
                            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden w-full flex items-center justify-center gap-2 p-3 mb-4 bg-[var(--card-bg-color)] rounded-md shadow font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 active:shadow-inner transition-colors z-40 relative">
                                <FilterIcon className="w-5 h-5" />
                                Lọc & Sắp xếp kết quả
                            </button>
                       )}
                       <FlightResults
                          outboundFlights={displayedOutboundFlights}
                          inboundFlights={displayedInboundFlights}
                          isLoading={isLoading}
                          error={error}
                          passengers={currentPassengers}
                          onSelectFlight={handleSelectFlight}
                          hasActiveFilters={hasActiveAirlineFilters || hasActiveNonAirlineFilters}
                          searchParams={currentSearchParams}
                          priceDisplayMode={priceDisplayMode}
                          feeConfig={feeConfig}
                          // Pass down sort props
                          sortOption={sortOption}
                          onSortChange={setSortOption}
                        />
                    </div>
                </div>
              )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
