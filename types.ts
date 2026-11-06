
export interface Airport {
  id: string;
  name: string;
}

export interface AirportInfo {
  airport: Airport;
  city: string;
  country: string;
  country_code: string;
}

export interface FlightAirportInfo {
  name: string;
  id: string;
  time: string;
}

export interface FlightDetail {
  departure_airport: FlightAirportInfo;
  arrival_airport: FlightAirportInfo;
  airline: string;
  airline_logo: string;
  flight_number: string;
  duration: number;
  airplane: string;
  class: string;
  travel_class?: string;
  legroom?: string;
  extensions?: string[];
}

export interface Baggage {
  carry_on: string;
  checked: string;
}

export interface FlightOption {
  flights: FlightDetail[];
  price_net: number;
  currency: string;
  type: string; 
  baggage: Baggage;
  booking_token?: string;
  seats_left?: number;
}

// SerpApi Price Insights Structure
export interface PriceInsights {
  lowest_price: number;
  price_level: 'low' | 'typical' | 'high';
  typical_price_range: [number, number];
  currency: string;
  history?: { date: string; price: number }[]; // Optional history graph data
}

export interface ApiResult {
  status: string;
  best_flights: FlightOption[];
  other_flights: FlightOption[];
  airports: {
    departure: AirportInfo[];
    arrival: AirportInfo[];
  }[];
  price_insights?: PriceInsights; // Added field
}

export type TripType = 'one_way' | 'round_trip' | 'multi_city';

export interface Passengers {
    adults: number;
    children: number;
    infants: number;
}

export interface FlightSegment {
    departure_id: string;
    arrival_id: string;
    date: string;
}

export interface SearchParams {
  departure_id: string;
  arrival_id: string;
  outbound_date: string;
  return_date?: string;
  type: TripType;
  passengers: Passengers;
  // New fields for extended search features
  multiCity?: FlightSegment[];
  isMonthSearch?: boolean;
}

// NEW INTERFACES FOR MONTH MATRIX
export interface DayFlightOption {
    airline: string;
    logo: string;
    departTime: string;
    arriveTime: string;
    price: number;
}

export interface MonthDayFlightData {
    date: string;
    lowestPrice: number;
    bestAirlineLogo: string;
    options: DayFlightOption[];
}

export interface PassengerDetails {
  fullName: string;
  title: 'Mr' | 'Mrs' | 'Miss' | 'Master' | 'Ms' | 'Mstr'; 
  gender: 'Male' | 'Female';
  dob: string;
  idNumber: string; 
  type: 'Adult' | 'Child' | 'Infant';
}

export interface ContactDetails {
  fullName: string;
  email: string;
  phone: string;
  gender: 'Mr' | 'Mrs';
  address: string;
}

export interface AncillaryOption {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface SelectedAncillaries {
  outboundBaggage?: AncillaryOption;
  inboundBaggage?: AncillaryOption;
}

export interface BookingData {
    // Core booking info
    id: string; // Order ID
    pnr: string;
    bookingTimestamp: string; // ISO string
    passengers: PassengerDetails[];
    contact: ContactDetails;
    ancillaries?: SelectedAncillaries;
    status?: string; // e.g., 'pending', 'confirmed', 'cancelled'
    admin_note?: string;
    userId?: number | string;
    
    // Professional V2 Payment & Cancellation Fields
    payment_status?: 'pending' | 'paid' | 'refunded';
    payment_info?: any; // Stores JSON payment details (method, transaction ID, date)
    total_amount?: number;
    cancellation_reason?: string;
    
    // Professional V3 Reschedule Field
    update_bookingTimestamp?: string;

    // Data needed to reconstruct the E-Ticket
    flight: FlightOption;
    bookingDetails: FlightDetailsResult;
    selectedOutboundOption: BookingOption;
    selectedInboundOption: BookingOption | null;
}


// New types for flight details API
export interface SelectedFlightLeg {
  flights: FlightDetail[];
  total_duration: number;
  carbon_emissions: {
    this_flight: number;
    typical_for_this_route: number;
    difference_percent: number;
  };
  type: string;
  airline_logo: string;
  departure_token: string;
}

export interface BookingOptionDetails {
    book_with: string;
    airline: boolean;
    airline_logos: string[];
    marketed_as: string[];
    price: number;
    option_title?: string;
    extensions: string[];
    baggage_prices: string[];
    seats_left?: number;
}

export interface BookingOption {
  together: BookingOptionDetails;
  departing?: BookingOptionDetails;
  returning?: BookingOptionDetails;
  separate_tickets?: boolean;
}

export interface FlightDetailsResult {
  selected_flights: SelectedFlightLeg[];
  baggage_prices: {
    together?: string[];
    departing?: string[];
    returning?: string[];
  };
  booking_options: BookingOption[];
  outbound_booking_options?: BookingOption[];
  inbound_booking_options?: BookingOption[];
  price_insights: {
    lowest_price: number;
    price_level: string;
    typical_price_range: [number, number];
  };
}

export interface FeeConfig {
  service_type: 'fixed' | 'percent';
  service_value: number;
  tax_type: 'fixed' | 'percent';
  tax_value: number;
  currency?: string;
}

export interface AdminFeeConfig {
  default: FeeConfig;
  domestic: FeeConfig;
  international: FeeConfig;
  airlines: {
    [key: string]: FeeConfig; 
  };
}


export interface NewsArticle {
    title: string;
    link: string;
    source: string;
    summary: string;
    imageUrl?: string;
}

export interface DestinationInfo {
  summary: string;
  topAttractions: string[];
  weatherForecast: string;
  currency: string;
}

export interface AISuggestion {
  destinationName: string;
  airportCode: string;
  description: string;
  activities: string[];
  suggestedOutboundDate: string;
  suggestedReturnDate?: string;
}

// --- NEW TYPES FOR WALLET & AGENTS ---
export type UserRole = 'user' | 'f1' | 'f2' | 'admin';

export interface User {
  id?: number | string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  gender?: string;
  dob?: string;
  address?: string;
  id_card?: string; 
  nationality?: string;
  created_at?: string;
  loyalty_points?: number; 
  
  // Wallet & Agency Features
  balance?: number;
  role_level?: UserRole; // 'user', 'f1', 'f2'
  commission_rate?: number; // Percent or Fixed amount per ticket
}

export interface WalletTransaction {
    id: string;
    userId: string | number;
    type: 'topup' | 'payment' | 'commission' | 'refund';
    amount: number;
    description: string;
    timestamp: string;
    status: 'success' | 'pending' | 'failed';
    performedBy?: string; // Admin who performed topup
}

export interface ExchangeRate {
    currency: string;
    rate: number;
    change_percent: number; // 24h change
    updated_at: string;
}
// -------------------------------------

export interface Admin {
  id: number | string;
  fullname: string; // Changed from name
  username: string;
  email: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export interface BookingLookupData {
  orderId: string;
  email: string;
}

export interface PaymentHistory {
    bookingId: string;
    pnr: string;
    payment_status: string;
    total_amount: number;
    payment_info: any;
    bookingTimestamp: string;
}

// --- Footer Configuration Types ---
export interface FooterLink {
    id: string;
    label: string;
    url: string;
    icon?: string; // Icon name from Icons.tsx
    target?: '_blank' | '_self';
}

export interface FooterColumn {
    id: string;
    title: string;
    icon?: string;
    links: FooterLink[];
}

// --- Flight Tracking Types ---
export type FlightStatus = 'SCHEDULED' | 'CHECK_IN' | 'BOARDING' | 'GATE_CLOSED' | 'DEPARTED' | 'CRUISING' | 'LANDING' | 'ARRIVED' | 'DELAYED' | 'CANCELLED';

export interface FlightTrackingInfo {
    bookingId: string;
    pnr: string;
    flightNumber: string;
    airline: string;
    airlineLogo?: string; // Added for better UI
    departure: {
        airport: string;
        time: string;
        terminal?: string;
        gate?: string;
    };
    arrival: {
        airport: string;
        time: string;
        terminal?: string;
        gate?: string; // Added gate for arrival
        belt?: string;
    };
    status: FlightStatus;
    statusLabel: string;
    progressPercent: number; // 0-100
    timeRemaining?: string; // e.g. "35 min"
    color: string; // hex or tailwind class
    lastUpdated: string;
    legIndex: number; // 0 for outbound, 1 for inbound
    legType: 'Outbound' | 'Inbound';
    fullBookingData?: BookingData; // Reference for updates
}

// --- Live Flight API Types ---
export interface AviationStackFlight {
    flight_date: string;
    flight_status: string;
    departure: {
        airport: string;
        timezone: string;
        iata: string;
        icao: string;
        terminal: string | null;
        gate: string | null;
        delay: number | null;
        scheduled: string;
        estimated: string;
        actual: string | null;
        latitude?: number;
        longitude?: number;
    };
    arrival: {
        airport: string;
        timezone: string;
        iata: string;
        icao: string;
        terminal: string | null;
        gate: string | null;
        baggage: string | null;
        scheduled: string;
        estimated: string;
        actual: string | null;
        delay: number | null;
        latitude?: number;
        longitude?: number;
    };
    airline: {
        name: string;
        iata: string;
        icao: string;
        logo?: string; // NEW: Added logo property
    };
    flight: {
        number: string;
        iata: string;
        icao: string;
        codeshared: any;
    };
    aircraft?: {
        registration: string;
        iata: string;
        icao: string;
        icao24: string;
        customMessage?: any; // To allow flexibility for custom API responses
    } | null;
    live: {
        updated: string;
        latitude: number;
        longitude: number;
        altitude: number;
        direction: number;
        speed_horizontal: number;
        speed_vertical: number;
        is_ground: boolean;
    } | null;
}