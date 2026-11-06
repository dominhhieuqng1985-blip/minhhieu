

import { BookingData, FlightTrackingInfo, FlightStatus } from '../types';

// --- CONSTANTS FOR SIMULATION (Fallback only) ---
// These are used only when no real data is available to estimate status
const CHECKIN_OPENS_MINUTES = 24 * 60; 
const CHECKIN_CLOSES_MINUTES = 60;     
const BOARDING_OPENS_MINUTES = 45;     
const GATE_CLOSES_MINUTES = 15;        
const LANDING_PHASE_MINUTES = 30;      

// Helper to calculate time difference in minutes
const getMinutesDiff = (date1: Date, date2: Date) => {
    return Math.floor((date1.getTime() - date2.getTime()) / 60000);
};

const getFlightStatus = (
    departureTime: Date,
    arrivalTime: Date,
    now: Date
): { status: FlightStatus; label: string; color: string; progress: number; remaining: string } => {
    const minsToDep = getMinutesDiff(departureTime, now);
    const minsSinceDep = getMinutesDiff(now, departureTime);
    const flightDuration = getMinutesDiff(arrivalTime, departureTime);
    
    // 1. Future: > 24h before departure
    if (minsToDep > CHECKIN_OPENS_MINUTES) {
        const days = Math.ceil(minsToDep / 60 / 24);
        return { 
            status: 'SCHEDULED', 
            label: 'SCHEDULED / LÊN LỊCH', 
            color: 'text-gray-500', 
            progress: 0, 
            remaining: `Starts in ${days} days / Còn ${days} ngày` 
        };
    }

    // 2. Check-in: 24h -> 60m before
    if (minsToDep <= CHECKIN_OPENS_MINUTES && minsToDep > CHECKIN_CLOSES_MINUTES) {
        const hours = (minsToDep / 60).toFixed(1);
        return { 
            status: 'CHECK_IN', 
            label: 'CHECK-IN OPEN / LÀM THỦ TỤC', 
            color: 'text-blue-600', 
            progress: 0, // Map should stay at 0
            remaining: `Departing in ${hours}h / Bay sau ${hours}h` 
        };
    }

    // 3. Boarding: 60m -> 15m before
    if (minsToDep <= CHECKIN_CLOSES_MINUTES && minsToDep > GATE_CLOSES_MINUTES) {
        return { 
            status: 'BOARDING', 
            label: 'BOARDING / ĐANG RA CỬA', 
            color: 'text-orange-500 animate-pulse', 
            progress: 0, // Map should stay at 0
            remaining: `Gate closing in ${minsToDep - GATE_CLOSES_MINUTES}m / Đóng cửa sau ${minsToDep - GATE_CLOSES_MINUTES}p` 
        };
    }

    // 4. Gate Closed: 15m -> 0m before
    if (minsToDep <= GATE_CLOSES_MINUTES && minsToDep > 0) {
        return { 
            status: 'GATE_CLOSED', 
            label: 'GATE CLOSED / CỔNG ĐÃ ĐÓNG', 
            color: 'text-red-600', 
            progress: 0, 
            remaining: `Departing in ${minsToDep}m / Khởi hành sau ${minsToDep}p` 
        };
    }

    // 5. Departed / Taking off: 0m -> 10m after dep
    if (minsSinceDep >= 0 && minsSinceDep <= 15) {
        return { 
            status: 'DEPARTED', 
            label: 'DEPARTED / ĐÃ CẤT CÁNH', 
            color: 'text-green-600', 
            progress: 10, // Started moving
            remaining: 'Taking off / Đang cất cánh' 
        };
    }

    // 6. Cruising: 15m after dep -> 30m before arr
    if (minsSinceDep > 15 && minsSinceDep < flightDuration - LANDING_PHASE_MINUTES) {
        // Map progress linearly from 10% to 90% based on flight time
        const cruisingDuration = flightDuration - 15 - LANDING_PHASE_MINUTES;
        const timeInCruise = minsSinceDep - 15;
        const pct = 10 + (timeInCruise / cruisingDuration) * 80;
        
        const minsToArr = flightDuration - minsSinceDep;
        return { 
            status: 'CRUISING', 
            label: 'EN ROUTE / ĐANG BAY', 
            color: 'text-green-600', 
            progress: Math.min(90, pct), 
            remaining: `Arriving in ${minsToArr}m / Đến nơi sau ${minsToArr}p` 
        };
    }

    // 7. Landing: 30m before arr -> Arr time
    if (minsSinceDep >= flightDuration - LANDING_PHASE_MINUTES && minsSinceDep < flightDuration) {
        return { 
            status: 'LANDING', 
            label: 'LANDING / ĐANG HẠ CÁNH', 
            color: 'text-purple-600 animate-pulse', 
            progress: 95, 
            remaining: 'Landing soon / Sắp hạ cánh' 
        };
    }

    // 8. Arrived: After Arr time
    if (minsSinceDep >= flightDuration) {
        return { 
            status: 'ARRIVED', 
            label: 'ARRIVED / ĐÃ ĐẾN', 
            color: 'text-gray-800', 
            progress: 100, 
            remaining: 'Arrived / Đã đến nơi' 
        };
    }

    // Fallback logic for future flights not caught by above (e.g. months ahead)
    if (minsToDep > 0) {
         return { 
            status: 'SCHEDULED', 
            label: 'SCHEDULED / LÊN LỊCH', 
            color: 'text-gray-500', 
            progress: 0, 
            remaining: 'Scheduled / Theo lịch' 
        };
    }

    // Fallback
    return { 
        status: 'SCHEDULED', 
        label: 'SCHEDULED / CHỜ LỊCH', 
        color: 'text-gray-500', 
        progress: 0, 
        remaining: 'N/A' 
    };
};

/**
 * Transforms a BookingData object into an ARRAY of FlightTrackingInfo based on LEGS.
 * Handles Outbound (0) and Inbound (1) separately.
 */
export const trackBookingLegs = (booking: BookingData): FlightTrackingInfo[] => {
    if (!booking.bookingDetails || !booking.bookingDetails.selected_flights) return [];

    const trackingResults: FlightTrackingInfo[] = [];
    const now = new Date();

    // Iterate through all legs (Outbound, Inbound)
    booking.bookingDetails.selected_flights.forEach((legInfo, legIndex) => {
        if (!legInfo.flights || legInfo.flights.length === 0) return;

        // Use the first flight of the leg for Departure and last for Arrival
        const firstFlight = legInfo.flights[0];
        const lastFlight = legInfo.flights[legInfo.flights.length - 1];

        const departureTime = new Date(firstFlight.departure_airport.time);
        const arrivalTime = new Date(lastFlight.arrival_airport.time);

        const statusInfo = getFlightStatus(departureTime, arrivalTime, now);

        // Explicitly handle Cancelled status from database overrides everything
        if (booking.status === 'cancelled') {
            statusInfo.status = 'CANCELLED';
            statusInfo.label = 'CANCELLED / ĐÃ HỦY';
            statusInfo.color = 'text-red-600 bg-red-100 px-2 rounded';
            statusInfo.progress = 0;
            statusInfo.remaining = 'Flight Cancelled / Chuyến bay đã hủy';
        }

        const legType = legIndex === 0 ? 'Outbound' : 'Inbound';
        
        // Normalize flight number for display e.g. "QH 270" (with space)
        // But internal matching should be robust.
        const flightDisplay = `${firstFlight.airline} ${firstFlight.flight_number}`;

        // NO FAKE DATA - Initialize as null.
        // Real data will be populated when Admin Page calls syncSingleFlight.
        
        trackingResults.push({
            bookingId: booking.id, 
            pnr: booking.pnr,
            flightNumber: flightDisplay,
            airline: firstFlight.airline,
            airlineLogo: firstFlight.airline_logo,
            departure: {
                airport: firstFlight.departure_airport.id,
                time: firstFlight.departure_airport.time,
                terminal: 'T1', // Default fallback, will update on sync
                gate: null // Start null, no fake
            },
            arrival: {
                airport: lastFlight.arrival_airport.id,
                time: lastFlight.arrival_airport.time,
                terminal: 'T2', // Default fallback
                gate: null, // Start null, no fake
                belt: null // Start null, no fake
            },
            status: statusInfo.status,
            statusLabel: statusInfo.label,
            progressPercent: statusInfo.progress,
            timeRemaining: statusInfo.remaining,
            color: statusInfo.color,
            lastUpdated: new Date().toISOString(),
            legIndex: legIndex,
            legType: legType,
            fullBookingData: booking
        });
    });

    return trackingResults;
};

/**
 * Filters bookings to find "Active" flights for the Dashboard.
 * Prioritizes PAID flights and includes both legs of Round Trips.
 * MODIFIED: Returns ALL future/active flights, excludes only old history.
 */
export const getActiveflights = (bookings: BookingData[]): FlightTrackingInfo[] => {
    const now = new Date();
    
    const allLegs: FlightTrackingInfo[] = bookings.flatMap(b => trackBookingLegs(b));

    return allLegs.filter(t => {
        // Exclude cancelled explicitly
        if (t.status === 'CANCELLED') return false;

        // For ARRIVED flights, keep them visible for 4 hours after landing
        if (t.status === 'ARRIVED') {
            const arrTime = new Date(t.arrival.time).getTime();
            const timeSinceLanding = now.getTime() - arrTime;
            // 4 hours in ms = 14400000
            if (timeSinceLanding > 14400000) return false;
        }

        // Keep all paid/confirmed flights regardless of how far in future
        if (t.fullBookingData?.payment_status === 'paid' || t.fullBookingData?.status === 'paid') {
             return true;
        }

        // For unpaid/pending, show if departure is within reasonable window (e.g. next 7 days)
        // OR if it's active right now
        const flightTime = new Date(t.departure.time);
        const diffHours = (flightTime.getTime() - now.getTime()) / (1000 * 60 * 60); 
        
        // Show if it departed in the last 24h OR is departing in the next 30 days
        return diffHours > -24 && diffHours < (24 * 30);

    }).sort((a, b) => new Date(a.departure.time).getTime() - new Date(b.departure.time).getTime());
};
