
import { AviationStackFlight } from '../types';
import { AIRLABS_API_URL, AIRLABS_API_KEY, PROXY_URL } from './apiConfig';
import { AIRPORTS } from '../constants';

// --- NEW INTERFACE BASED ON USER SAMPLE ---
interface NewApiFlight {
    flight: string;           // "BA112"
    route?: string;           // "JFK (KJFK) → LHR (EGLL)"
    icao24_hex?: string;      // "4079A3"
    departure: {
        scheduled: string;    // "2025-12-18 19:45:00"
        actual?: string | null;
        gate?: string | null;
        terminal?: string | null;
        icao: string;         // "KJFK"
        iata?: string;        // "JFK"
    };
    arrival: {
        scheduled: string;
        actual?: string | null;
        gate?: string | null;
        terminal?: string | null;
        icao: string;
        iata?: string;
    };
    delay_sec: number | null;
    status: string;           // "airborne", "landed", etc.
    position?: {
        lat: number;
        lng: number;
        altitude_ft: number;
        speed_kt: number;
        heading: number;
    };
    aircraft?: {
        type_code?: string;   // "B738"
        registration?: string; // "B-5545"
        airline_iata?: string;
        airline_icao?: string;
        flag?: string;
    };
}

// --- TIMEZONE HELPERS ---
const getVietnamDateString = (dateObj: Date): string => {
    return new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(dateObj);
};

const parseTime = (timeStr: string | undefined | null): Date | null => {
    if (!timeStr) return null;
    let iso = timeStr.replace(' ', 'T');
    if (iso.includes('T') && !iso.endsWith('Z') && !iso.includes('+')) {
        iso += 'Z';
    }
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
};

// --- MATH HELPERS ---
const getAirportCoords = (code: string) => {
    const airport = AIRPORTS.find(a => 
        a.id === code || 
        (code.length === 4 && a.id === code.substring(1)) ||
        (code.length === 3 && a.id === code)
    );
    return airport ? { lat: airport.lat, lon: airport.lon, name: airport.name } : { lat: 10.8189, lon: 106.6519, name: code };
};

// --- MAPPER: New API -> Internal Format ---
const mapNewApiToInternal = (f: NewApiFlight): AviationStackFlight => {
    const now = new Date();
    const flightIata = f.flight || (f as any).flight_iata || 'UNKNOWN';
    
    const airlineMatch = flightIata.match(/^([A-Z0-9]{2,3})(\d+)$/);
    const airlineIata = f.aircraft?.airline_iata || (airlineMatch ? airlineMatch[1] : flightIata.substring(0, 2));
    const flightNumber = airlineMatch ? airlineMatch[2] : flightIata.substring(2);

    const cleanIata = (icao: string, iata?: string) => {
        if (iata && iata.length === 3) return iata;
        if (icao && icao.length === 4) return icao.substring(1);
        return iata || icao || 'N/A';
    };

    const depIata = cleanIata(f.departure.icao, f.departure.iata);
    const arrIata = cleanIata(f.arrival.icao, f.arrival.iata);
    const depCoords = getAirportCoords(depIata);
    const arrCoords = getAirportCoords(arrIata);

    const stdDate = parseTime(f.departure.scheduled) || now;
    const staDate = parseTime(f.arrival.scheduled) || new Date(stdDate.getTime() + 7200000);

    let logo = `https://content.r9cdn.net/rimg/provider-logos/airlines/v/${airlineIata}.png`;
    if (airlineIata === 'VN') logo = 'https://plugin.datacom.vn/Resources/Images/Airline/VN.gif';
    if (airlineIata === 'VJ') logo = 'https://plugin.datacom.vn/Resources/Images/Airline/VJ.gif';
    if (airlineIata === 'QH') logo = 'https://plugin.datacom.vn/Resources/Images/Airline/QH.gif';
    if (airlineIata === 'VU') logo = 'https://plugin.datacom.vn/Resources/Images/Airline/VU.gif';

    return {
        flight_date: getVietnamDateString(stdDate),
        flight_status: f.status === 'airborne' ? 'active' : (f.status === 'landed' ? 'landed' : f.status),
        departure: {
            airport: depCoords.name,
            timezone: 'Asia/Ho_Chi_Minh',
            iata: depIata,
            icao: f.departure.icao,
            terminal: f.departure.terminal || null,
            gate: f.departure.gate || null,
            delay: f.delay_sec ? Math.round(f.delay_sec / 60) : 0,
            scheduled: stdDate.toISOString(),
            estimated: stdDate.toISOString(),
            actual: f.departure.actual ? parseTime(f.departure.actual)?.toISOString() || null : null,
            latitude: depCoords.lat,
            longitude: depCoords.lon
        },
        arrival: {
            airport: arrCoords.name,
            timezone: 'Asia/Ho_Chi_Minh',
            iata: arrIata,
            icao: f.arrival.icao,
            terminal: f.arrival.terminal || null,
            gate: f.arrival.gate || null,
            baggage: null,
            scheduled: staDate.toISOString(),
            estimated: staDate.toISOString(),
            actual: f.arrival.actual ? parseTime(f.arrival.actual)?.toISOString() || null : null,
            delay: null,
            latitude: arrCoords.lat,
            longitude: arrCoords.lon
        },
        airline: {
            name: (f as any).airline_name || `Airline ${airlineIata}`,
            iata: airlineIata,
            icao: f.aircraft?.airline_icao || airlineIata,
            logo: logo
        },
        flight: {
            number: flightNumber,
            iata: flightIata,
            icao: flightIata,
            codeshared: null
        },
        live: f.position ? {
            updated: now.toISOString(),
            latitude: f.position.lat,
            longitude: f.position.lng,
            altitude: f.position.altitude_ft,
            direction: f.position.heading,
            speed_horizontal: f.position.speed_kt * 1.852, 
            speed_vertical: 0,
            is_ground: f.status === 'landed'
        } : null,
        aircraft: {
            registration: f.aircraft?.registration || 'N/A',
            iata: f.aircraft?.type_code || 'N/A',
            icao: f.aircraft?.type_code || 'N/A',
            icao24: f.icao24_hex || 'N/A'
        }
    };
};

export const fetchCombinedFlights = async (query?: string): Promise<AviationStackFlight[]> => {
    try {
        const url = `${AIRLABS_API_URL}?api_key=${AIRLABS_API_KEY}&bbox=5.0,100.0,26.0,115.0`;
        const response = await fetch(`${PROXY_URL}${url}`);
        
        if (!response.ok) throw new Error(`API Fetch Error: ${response.status}`);

        const data = await response.json();
        const rawFlights: NewApiFlight[] = data.response || (Array.isArray(data) ? data : []);
        
        if (!Array.isArray(rawFlights)) return [];

        let final = rawFlights.map(mapNewApiToInternal);

        if (query) {
            const q = query.toUpperCase().replace(/\s+/g, '');
            final = final.filter(f => 
                f.flight.iata.includes(q) || 
                f.flight.number.includes(q) ||
                f.departure.iata === q ||
                f.arrival.iata === q
            );
        }

        return final.sort((a, b) => {
            if (a.flight_status === 'active' && b.flight_status !== 'active') return -1;
            if (a.flight_status !== 'active' && b.flight_status === 'active') return 1;
            return new Date(a.departure.scheduled).getTime() - new Date(b.departure.scheduled).getTime();
        });

    } catch (e) {
        console.error("Live fetch error:", e);
        return [];
    }
};

export const getRealTimeFlight = async (query: string): Promise<AviationStackFlight[]> => {
    return await fetchCombinedFlights(query);
};

export const syncSingleFlight = async (flightNumber: string, flightDate: string): Promise<AviationStackFlight | null> => {
    const flights = await fetchCombinedFlights(flightNumber);
    const match = flights.find(f => f.flight_date === flightDate);
    return match || (flights.length > 0 ? flights[0] : null);
};

export const getDelayedFlights = async (): Promise<AviationStackFlight[]> => {
    const flights = await fetchCombinedFlights();
    return flights.filter(f => (f.departure.delay || 0) > 15);
};
