
import { type ApiResult, type SearchParams, type FlightOption, type FlightDetailsResult, type SelectedFlightLeg, type BookingOption, type Baggage, type FeeConfig, type FlightDetail, type PriceInsights, type MonthDayFlightData, type DayFlightOption } from '../types';
import { PROXY_URL, FLIGHT_API_URL } from './apiConfig';

// Switched to a new CORS proxy to resolve blocking errors.
const API_BASE_URL = FLIGHT_API_URL;

// Helper function to get random integer in a range
const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// --- DYNAMIC DATA INJECTION FOR SEARCH RESULTS ---
const airlineBaseBaggage: { [key: string]: Baggage } = {
  'Vietnam Airlines': { carry_on: '12kg', checked: '23kg' },
  'Vietjet Air': { carry_on: '7kg', checked: 'Không bao gồm' },
  'Bamboo Airways': { carry_on: '7kg', checked: 'Không bao gồm' },
  'default': { carry_on: '7kg', checked: 'Theo quy định' }
};

// --- PRICE CACHING UTILS ---
// Changed key version to invalidate old mock data
const PRICE_CACHE_KEY = 'flight_monthly_prices_real_v3'; 

const getPriceCache = (): Record<string, MonthDayFlightData> => {
    try {
        const cache = sessionStorage.getItem(PRICE_CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    } catch { return {}; }
};

const setPriceCache = (key: string, data: MonthDayFlightData) => {
    try {
        const cache = getPriceCache();
        cache[key] = data;
        sessionStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
    } catch {}
};

/**
 * Check if data exists in cache for a specific route and date
 */
export const checkCacheForDate = (departureId: string, arrivalId: string, dateStr: string): MonthDayFlightData | null => {
    const cacheKey = `${departureId}_${arrivalId}_${dateStr}`;
    return getPriceCache()[cacheKey] || null;
}

/**
 * Fetches REAL flight data for a SINGLE day by calling the search API.
 * This ensures the data in the matrix matches the actual search results.
 */
export const fetchDayFlightData = async (departureId: string, arrivalId: string, dateStr: string): Promise<MonthDayFlightData | null> => {
    const cacheKey = `${departureId}_${arrivalId}_${dateStr}`;
    
    // 1. Check Cache
    const cachedData = getPriceCache()[cacheKey];
    if (cachedData) return cachedData;

    // 2. Skip past dates
    if (new Date(dateStr) < new Date(new Date().setHours(0,0,0,0))) return null;

    try {
        const params: SearchParams = {
            departure_id: departureId,
            arrival_id: arrivalId,
            outbound_date: dateStr,
            type: 'one_way',
            passengers: { adults: 1, children: 0, infants: 0 }
        };

        // Call the REAL search API
        const result = await searchFlights(params);
        
        // Combine best and other flights
        const allFlights = [...result.best_flights, ...result.other_flights];

        if (allFlights.length > 0) {
            // Sort by price low to high to find the cheapest for the day
            allFlights.sort((a, b) => a.price_net - b.price_net);
            
            const lowest = allFlights[0];
            
            // Extract top 5 options for the tooltip details
            const options: DayFlightOption[] = allFlights.slice(0, 5).map(f => {
                const leg = f.flights[0];
                const lastLeg = f.flights[f.flights.length - 1];
                return {
                    airline: leg.airline,
                    logo: leg.airline_logo,
                    departTime: new Date(leg.departure_airport.time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}),
                    arriveTime: new Date(lastLeg.arrival_airport.time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}),
                    price: f.price_net // Note: This is NET price. UI must calculate taxes.
                };
            });

            const dayData: MonthDayFlightData = {
                date: dateStr,
                lowestPrice: lowest.price_net,
                bestAirlineLogo: lowest.flights[0].airline_logo,
                options: options
            };

            setPriceCache(cacheKey, dayData);
            return dayData;
        }
    } catch (e) {
        console.warn(`Failed to fetch price for ${dateStr}`, e);
    }
    return null;
};

// Deprecated: Batch fetching is now handled by the UI component using fetchDayFlightData
export const getMonthlyTicketPrices = async (departureId: string, arrivalId: string, month: number, year: number): Promise<Record<string, MonthDayFlightData>> => {
    return {}; 
};

// --- MULTI-CITY LOGIC START ---
/**
 * Helper to generate a single-leg search API call promise.
 */
const fetchSegment = async (departureId: string, arrivalId: string, date: string): Promise<FlightOption[]> => {
    try {
        const queryObj = {
            departure_id: departureId,
            arrival_id: arrivalId,
            outbound_date: date,
            currency: 'VND',
            hl: 'vi',
            type: 'one_way'
        };
        const queryParams = new URLSearchParams(queryObj);
        const url = `${PROXY_URL}${API_BASE_URL}?${queryParams.toString()}`;
        
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        
        // Return combined list of valid flights
        const validFlights = [...(data.best_flights || []), ...(data.other_flights || [])].filter(f => f.price_net > 0);
        
        // Enrich data similar to main search
        return validFlights.map(f => {
            const airlineLower = f.flights[0]?.airline.toLowerCase() || '';
            let baseBaggage = airlineBaseBaggage['default'];
            if (airlineLower.includes('vietjet')) baseBaggage = airlineBaseBaggage['Vietjet Air'];
            else if (airlineLower.includes('vietnam airlines')) baseBaggage = airlineBaseBaggage['Vietnam Airlines'];
            else if (airlineLower.includes('bamboo')) baseBaggage = airlineBaseBaggage['Bamboo Airways'];
            
            return {
                ...f,
                seats_left: getRandomInt(3, 25),
                baggage: baseBaggage
            };
        });
    } catch (e) {
        console.warn("Segment fetch failed", e);
        return [];
    }
};

/**
 * Stitch multiple segments into multi-city flight options.
 * This simulates a multi-city search result by combining best options from each leg.
 */
const performMultiCitySearch = async (params: SearchParams): Promise<ApiResult> => {
    if (!params.multiCity || params.multiCity.length === 0) {
        return { status: "failure", best_flights: [], other_flights: [], airports: [] };
    }

    const segmentPromises = params.multiCity.map(seg => fetchSegment(seg.departure_id, seg.arrival_id, seg.date));
    const segmentsResults = await Promise.all(segmentPromises);

    // If any segment fails completely, we can't build a full itinerary
    if (segmentsResults.some(res => res.length === 0)) {
         return { status: "success", best_flights: [], other_flights: [], airports: [] };
    }

    // Simplify aggregation: Take top 3 combinations to avoid combinatorial explosion
    // Strategy: Create 3 aggregated options.
    // Option 1: Cheapest from each leg combined.
    // Option 2: Second cheapest...
    // Option 3: Third cheapest... (if available)

    const aggregatedOptions: FlightOption[] = [];
    
    // Sort each segment result by price
    segmentsResults.forEach(list => list.sort((a, b) => a.price_net - b.price_net));
    
    const maxCombinations = Math.min(5, ...segmentsResults.map(l => l.length));

    for (let i = 0; i < maxCombinations; i++) {
        const flightsForThisOption: FlightDetail[] = [];
        let totalPrice = 0;
        let currency = 'VND';
        let mainAirline = '';
        let mainLogo = '';
        let baggage = airlineBaseBaggage['default'];

        for (let segIdx = 0; segIdx < segmentsResults.length; segIdx++) {
            // Mix and match logic: 
            // For i=0 (Best option), take [0] from all segments.
            // For i=1, take [1] from all segments, etc.
            // This is a simplification. Real multi-city engines do complex graph search.
            const legOption = segmentsResults[segIdx][i];
            
            if (legOption) {
                flightsForThisOption.push(...legOption.flights);
                totalPrice += legOption.price_net;
                currency = legOption.currency;
                // Use first leg for branding
                if (segIdx === 0) {
                    mainAirline = legOption.flights[0].airline;
                    mainLogo = legOption.flights[0].airline_logo;
                    baggage = legOption.baggage;
                }
            }
        }

        if (flightsForThisOption.length === params.multiCity.length) { // Ensure all legs present (assuming 1 flight per leg in simple model)
             // Or check if length matches total segments if flights array stores 1 object per leg
             // NOTE: Our API returns 'flights' array. For 1 leg search, it has 1 object (usually, unless connecting).
             // We just concat them.
             
             aggregatedOptions.push({
                 flights: flightsForThisOption,
                 price_net: totalPrice,
                 currency: currency,
                 type: 'multi_city',
                 baggage: baggage,
                 seats_left: getRandomInt(2, 9)
             });
        }
    }

    return {
        status: "success",
        best_flights: aggregatedOptions, // Put all valid combos in best_flights
        other_flights: [],
        airports: [] // Can populate if needed, but UI uses static constants mostly
    };
};
// --- MULTI-CITY LOGIC END ---

export const searchFlights = async (params: SearchParams): Promise<ApiResult> => {
  // NEW: Handle Multi-city
  if (params.type === 'multi_city') {
      return performMultiCitySearch(params);
  }

  const queryObj: { [key: string]: string } = {
    departure_id: params.departure_id,
    arrival_id: params.arrival_id,
    outbound_date: params.outbound_date,
    currency: 'VND',
    hl: 'vi',
  };

  // Explicitly set type and return_date based on params.type to ensure correctness
  if (params.type === 'round_trip' && params.return_date) {
    queryObj.type = 'round_trip';
    queryObj.return_date = params.return_date;
  } else {
    queryObj.type = 'one_way';
  }

  const queryParams = new URLSearchParams(queryObj);
  
  const finalApiUrl = `${API_BASE_URL}?${queryParams.toString()}`;
  const proxiedUrl = `${PROXY_URL}${finalApiUrl}`;

  try {
    const response = await fetch(proxiedUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Proxy/API Error:", response.status, errorBody);
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const data: ApiResult = await response.json();
    
    // Process flights: filter out zero price and inject dynamic mock data
    const processFlights = (flights: FlightOption[] | undefined): FlightOption[] => {
        return (flights || [])
            .filter(f => f.price_net > 0)
            .map(f => {
                const airlineLower = f.flights[0]?.airline.toLowerCase() || '';
                let baseBaggage: Baggage;

                if (airlineLower.includes('vietjet')) {
                    baseBaggage = airlineBaseBaggage['Vietjet Air'];
                } else if (airlineLower.includes('vietnam airlines')) {
                    baseBaggage = airlineBaseBaggage['Vietnam Airlines'];
                } else if (airlineLower.includes('bamboo')) {
                    baseBaggage = airlineBaseBaggage['Bamboo Airways'];
                } else {
                    baseBaggage = airlineBaseBaggage['default'];
                }

                return {
                    ...f,
                    seats_left: getRandomInt(3, 25), // Inject mock seat count
                    baggage: baseBaggage, // Inject dynamic base baggage info
                };
            });
    };

    const best = processFlights(data.best_flights);
    const other = processFlights(data.other_flights);
    const allPrices = [...best, ...other].map(f => f.price_net).filter(p => p > 0);
    
    // GENERATE PRICE INSIGHTS (SerpApi Logic)
    let insights: PriceInsights | undefined;
    
    if (allPrices.length > 0) {
        const minPrice = Math.min(...allPrices);
        const sortedPrices = [...allPrices].sort((a, b) => a - b);
        const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
        
        // Mock typical range based on median
        const typicalLow = Math.round(median * 0.9);
        const typicalHigh = Math.round(median * 1.15);
        
        let level: 'low' | 'typical' | 'high' = 'typical';
        if (minPrice < typicalLow) level = 'low';
        else if (minPrice > typicalHigh) level = 'high';

        insights = {
            lowest_price: minPrice,
            price_level: level,
            typical_price_range: [typicalLow, typicalHigh],
            currency: 'VND'
        };
    }
    
    return {
      ...data,
      best_flights: best,
      other_flights: other,
      price_insights: insights // Attach insights
    };
  } catch (e) {
      console.error("Failed to fetch or parse flight data.", e);
      throw new Error("Invalid data format received or network error during flight search.");
  }
};


// --- DYNAMIC MOCK DATA GENERATION FOR CHECKOUT PAGE ---
// Keeps existing logic for checkout details simulation
const airlineFareClasses = {
  'Vietnam Airlines': [
    { name: 'Phổ thông Tiết kiệm', priceMultiplier: 1.0, seats: [10, 25], baggage: ["Miễn phí 1 kiện 12kg xách tay", "Miễn phí 1 kiện 23kg ký gửi"], extensions: ["Không hoàn vé", "Đổi vé mất phí", "Tích lũy dặm bay"] },
    { name: 'Phổ thông Tiêu chuẩn', priceMultiplier: 1.25, seats: [8, 20], baggage: ["Miễn phí 1 kiện 12kg xách tay", "Miễn phí 1 kiện 23kg ký gửi"], extensions: ["Hoàn vé mất phí", "Đổi vé mất phí", "Tích lũy dặm bay 100%"] },
    { name: 'Phổ thông Linh hoạt', priceMultiplier: 1.6, seats: [5, 15], baggage: ["Miễn phí 1 kiện 12kg xách tay", "Miễn phí 1 kiện 23kg ký gửi"], extensions: ["Miễn phí hoàn vé", "Miễn phí đổi vé", "Chọn trước chỗ ngồi"] },
    { name: 'Thương gia', priceMultiplier: 2.8, seats: [2, 8], baggage: ["Miễn phí 2 kiện 18kg xách tay", "Miễn phí 1 kiện 32kg ký gửi"], extensions: ["Miễn phí hoàn vé và đổi vé", "Phòng chờ thương gia", "Ưu tiên làm thủ tục"] }
  ],
  'Vietjet Air': [
    { name: 'Eco', priceMultiplier: 1.0, seats: [15, 30], baggage: ["Miễn phí 7kg xách tay"], extensions: ["Không hoàn vé", "Đổi vé mất phí", "Không bao gồm suất ăn"] },
    { name: 'Deluxe', priceMultiplier: 1.35, seats: [10, 25], baggage: ["Miễn phí 7kg xách tay", "Miễn phí 20kg ký gửi"], extensions: ["Miễn phí đổi vé (thu chênh lệch)", "Chọn trước chỗ ngồi (trừ hàng ghế thoát hiểm)"] },
    { name: 'SkyBoss', priceMultiplier: 2.4, seats: [3, 9], baggage: ["Miễn phí 10kg xách tay", "Miễn phí 30kg ký gửi"], extensions: ["Miễn phí thay đổi chuyến bay", "Phòng chờ ưu tiên", "Ưu tiên làm thủ tục & hành lý"] }
  ],
  'Bamboo Airways': [
    { name: 'Economy Saver', priceMultiplier: 1.0, seats: [12, 28], baggage: ["Miễn phí 7kg xách tay"], extensions: ["Không hoàn vé", "Đổi vé mất phí"] },
    { name: 'Economy Smart', priceMultiplier: 1.25, seats: [8, 22], baggage: ["Miễn phí 7kg xách tay", "Miễn phí 20kg ký gửi"], extensions: ["Hoàn vé mất phí", "Đổi vé mất phí"] },
    { name: 'Business', priceMultiplier: 2.6, seats: [4, 10], baggage: ["Miễn phí 2 kiện 7kg xách tay", "Miễn phí 40kg ký gửi"], extensions: ["Miễn phí hoàn vé", "Phòng chờ thương gia", "Suất ăn miễn phí"] }
  ],
  'default': [
    { name: 'Phổ thông Tiết kiệm', priceMultiplier: 1.0, seats: [10, 25], baggage: ["1 kiện xách tay miễn phí", "Hành lý ký gửi trả phí"], extensions: ["Không hoàn vé", "Đổi vé mất phí"] },
    { name: 'Phổ thông Linh hoạt', priceMultiplier: 1.4, seats: [5, 15], baggage: ["1 kiện xách tay miễn phí", "Miễn phí 1 kiện 23kg ký gửi"], extensions: ["Miễn phí đổi vé", "Miễn phí chọn chỗ ngồi"] }
  ]
};

const getFareClassesForAirline = (airlineName: string) => {
    const airlineLower = airlineName.toLowerCase();
    if (airlineLower.includes('vietjet')) return airlineFareClasses['Vietjet Air'];
    if (airlineLower.includes('vietnam airlines')) return airlineFareClasses['Vietnam Airlines'];
    if (airlineLower.includes('bamboo')) return airlineFareClasses['Bamboo Airways'];
    return airlineFareClasses['default'];
};


const generateBookingOptionsForLeg = (basePriceUSD: number, airline: string, logo: string, flightNumbers: string[]): BookingOption[] => {
    const fareClasses = getFareClassesForAirline(airline);
    return fareClasses.map(fare => ({
        together: {
            book_with: airline,
            airline: true,
            airline_logos: [logo],
            marketed_as: flightNumbers,
            price: parseFloat((basePriceUSD * fare.priceMultiplier).toFixed(2)),
            option_title: fare.name,
            extensions: fare.extensions,
            baggage_prices: fare.baggage,
            seats_left: getRandomInt(fare.seats[0], fare.seats[1]),
        }
    }));
};

// --- ROUND TRIP PROCESSING LOGIC ---

export const splitRoundTrip = (flights: FlightDetail[]): { outbound: FlightDetail[], inbound: FlightDetail[] } => {
    if (flights.length < 2) {
        return { outbound: flights, inbound: [] };
    }

    let longestLayover = -1;
    let splitIndex = -1;

    for (let i = 0; i < flights.length - 1; i++) {
        const arrivalTime = new Date(flights[i].arrival_airport.time).getTime();
        const departureTime = new Date(flights[i + 1].departure_airport.time).getTime();
        const layover = departureTime - arrivalTime;
        if (layover > longestLayover) {
            longestLayover = layover;
            splitIndex = i + 1;
        }
    }

    if (splitIndex !== -1) {
        return {
            outbound: flights.slice(0, splitIndex),
            inbound: flights.slice(splitIndex),
        };
    }
    
    // Fallback for cases with no significant layover (e.g., only 2 legs)
    return { outbound: [flights[0]], inbound: flights.slice(1) };
};

const generateMockFlightDetails = (flightOption: FlightOption): FlightDetailsResult => {
  const USD_VND_RATE = 25400;
  const basePriceUSD = flightOption.price_net / USD_VND_RATE;
  
  const result: FlightDetailsResult = {
      selected_flights: [],
      booking_options: [],
      baggage_prices: { together: ["Thông tin hành lý chi tiết theo từng gói vé"] },
      price_insights: {
          lowest_price: parseFloat(basePriceUSD.toFixed(2)),
          price_level: "bình thường",
          typical_price_range: [parseFloat((basePriceUSD * 0.9).toFixed(2)), parseFloat((basePriceUSD * 1.5).toFixed(2))]
      }
  };

  if (flightOption.type.toLowerCase() === 'round trip' && flightOption.flights.length > 1) {
      const { outbound: outboundFlights, inbound: inboundFlights } = splitRoundTrip(flightOption.flights);
      
      const outboundLeg: SelectedFlightLeg = {
          flights: outboundFlights,
          total_duration: outboundFlights.reduce((sum, f) => sum + f.duration, 0),
          carbon_emissions: { this_flight: 20000 + getRandomInt(0, 2500), typical_for_this_route: 20000, difference_percent: getRandomInt(0, 10) },
          type: "Chuyến đi",
          airline_logo: outboundFlights[0].airline_logo,
          departure_token: `mock_token_outbound`
      };
      result.selected_flights.push(outboundLeg);

      if (inboundFlights.length > 0) {
          const inboundLeg: SelectedFlightLeg = {
              flights: inboundFlights,
              total_duration: inboundFlights.reduce((sum, f) => sum + f.duration, 0),
              carbon_emissions: { this_flight: 20000 + getRandomInt(0, 2500), typical_for_this_route: 20000, difference_percent: getRandomInt(0, 10) },
              type: "Chuyến về",
              airline_logo: inboundFlights[0].airline_logo,
              departure_token: `mock_token_inbound`
          };
          result.selected_flights.push(inboundLeg);

          // Generate separate booking options for each leg
          const legPrice = basePriceUSD / 2;
          result.outbound_booking_options = generateBookingOptionsForLeg(legPrice, outboundFlights[0].airline, outboundFlights[0].airline_logo, outboundFlights.map(f => f.flight_number));
          result.inbound_booking_options = generateBookingOptionsForLeg(legPrice, inboundFlights[0].airline, inboundFlights[0].airline_logo, inboundFlights.map(f => f.flight_number));
      } else {
         // Fallback to one-way logic if inbound is empty
         result.booking_options = generateBookingOptionsForLeg(basePriceUSD, outboundFlights[0].airline, outboundFlights[0].airline_logo, outboundFlights.map(f => f.flight_number));
      }

  } else if (flightOption.type === 'multi_city') {
      // NEW: Handle Multi-city for checkout
      // Treat as a single combined journey for booking options (simplification)
      // or split into legs if possible. Here we simply show it as a sequence.
      
      const multiLeg: SelectedFlightLeg = {
          flights: flightOption.flights,
          total_duration: flightOption.flights.reduce((sum, f) => sum + f.duration, 0),
          carbon_emissions: { this_flight: 50000 + getRandomInt(0, 5000), typical_for_this_route: 50000, difference_percent: getRandomInt(0, 10) },
          type: "Hành trình nhiều chặng",
          airline_logo: flightOption.flights[0].airline_logo,
          departure_token: `mock_token_multicity`
      };
      result.selected_flights.push(multiLeg);
      
      // Use the first flight's airline for pricing options, but use total price
      result.booking_options = generateBookingOptionsForLeg(
          basePriceUSD, 
          flightOption.flights[0].airline, 
          flightOption.flights[0].airline_logo, 
          flightOption.flights.map(f => f.flight_number)
      );

  } else {
      // One-way logic
      const leg: SelectedFlightLeg = {
          flights: flightOption.flights,
          total_duration: flightOption.flights.reduce((sum, f) => sum + f.duration, 0),
          carbon_emissions: { this_flight: 40000 + getRandomInt(0, 5000), typical_for_this_route: 40000, difference_percent: getRandomInt(0, 10) },
          type: "Một chiều",
          airline_logo: flightOption.flights[0].airline_logo,
          departure_token: `mock_token_oneway`
      };
      result.selected_flights.push(leg);
      result.booking_options = generateBookingOptionsForLeg(basePriceUSD, flightOption.flights[0].airline, flightOption.flights[0].airline_logo, flightOption.flights.map(f => f.flight_number));
  }
  
  return result;
};


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const getFlightDetails = async (flight: FlightOption): Promise<FlightDetailsResult> => {
  console.log(`Generating dynamic details for flight: ${flight.flights[0].airline} ${flight.flights[0].flight_number}.`);
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
  
  // Generate mock details based on the actual flight data
  const dynamicDetails = generateMockFlightDetails(flight);
  
  return dynamicDetails;
};
