
import { ExchangeRate, WalletTransaction, User } from '../types';
import { DB_API_URL, EXCHANGE_RATE_API_URL, PROXY_URL } from './apiConfig';
import { getExchangeRatesAI as getRatesFromServer } from './geminiService';

// --- AI EXCHANGE RATES (Deprecated / Fallback) ---
export const getExchangeRatesAI = async (): Promise<ExchangeRate[]> => {
    return await getRatesFromServer();
};

// --- REAL EXCHANGE RATES FROM API ---
export const getRealExchangeRates = async (): Promise<ExchangeRate[]> => {
    try {
        // Use PROXY_URL to bypass CORS if running locally or cross-domain
        const response = await fetch(`${PROXY_URL}${EXCHANGE_RATE_API_URL}`);
        
        // If proxy fails (e.g. 429), try direct (in case on same origin)
        if (!response.ok) {
             const directResponse = await fetch(EXCHANGE_RATE_API_URL);
             if (!directResponse.ok) throw new Error('Failed to fetch exchange rates');
             return processRateResponse(await directResponse.json());
        }
        
        const data = await response.json();
        return processRateResponse(data);

    } catch (error) {
        console.error("Error fetching real exchange rates:", error);
        return []; // Return empty on error
    }
};

const processRateResponse = (data: any): ExchangeRate[] => {
    if (data.status === 'success' && Array.isArray(data.rates)) {
        return data.rates.map((item: any) => {
            // Parse "31.519,49" to float
            // 1. Remove dots (thousands separator)
            // 2. Replace comma with dot (decimal separator)
            const rateStr = String(item.value).replace(/\./g, '').replace(',', '.');
            const rate = parseFloat(rateStr);

            // Parse "■ 0.00%" or similar to float
            const changeStr = String(item.change).replace('%', '').trim();
            const match = changeStr.match(/([-+0-9.,]+)/);
            const changePercent = match ? parseFloat(match[0].replace(',', '.')) : 0;

            return {
                currency: item.code,
                rate: isNaN(rate) ? 0 : rate,
                change_percent: isNaN(changePercent) ? 0 : changePercent,
                updated_at: data.datetime
            };
        });
    }
    return [];
};

// --- WALLET & ROLE FUNCTIONS (REAL API CALLS) ---

export const getWalletTransactions = async (userId?: string | number): Promise<WalletTransaction[]> => {
    try {
        let url = `${DB_API_URL}?action=get_transactions`;
        if (userId) url += `&user_id=${userId}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            return data.map((tx: any) => ({
                ...tx,
                userId: tx.user_id || tx.userId,
                amount: Number(tx.amount) || 0, // Force number type, default 0
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
};

export const topUpWallet = async (userId: string | number, amount: number, adminName: string): Promise<boolean> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=wallet_topup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: userId, 
                amount: Number(amount), 
                performed_by: adminName,
                description: `Admin ${adminName} nạp tiền`
            }),
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error("Top up failed:", error);
        return false;
    }
};

export const updateUserRole = async (userId: string | number, role: 'user' | 'f1' | 'f2'): Promise<boolean> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=update_user_role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: userId, 
                role_level: role 
            }),
        });
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error("Update role failed:", error);
        return false;
    }
};

export const updateCommission = async (userId: string | number, rate: number): Promise<{ success: boolean, message: string }> => {
    try {
        const payload = { 
            user_id: userId,
            id: userId, // Backup ID field for compatibility with different backend implementations
            commission_rate: Number(rate) // Ensure number format
        };
        
        console.log("Sending update commission payload:", payload);

        const response = await fetch(`${DB_API_URL}?action=update_commission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const result = await response.json();
        if (!result.success) {
            console.warn("Update commission rejected:", result.message);
        }
        return result;
    } catch (error: any) {
        console.error("Update commission failed:", error);
        return { success: false, message: error.message || 'Lỗi kết nối' };
    }
};

export const calculateCommission = (role?: string, ticketPrice: number = 0, userRate?: number): number => {
    // 1. Priority: User-specific rate (Custom Setting)
    if (userRate !== undefined && userRate !== null && userRate > 0) {
        const rate = Number(userRate);
        
        // HEURISTIC: 
        // If rate <= 100, treat as PERCENTAGE (e.g., 5 means 5%)
        // If rate > 100, treat as FIXED AMOUNT (e.g., 50000 means 50,000 VND)
        if (rate <= 100) {
            return ticketPrice * (rate / 100);
        }
        return rate;
    }

    // 2. Fallback: Role-based default fixed amounts
    if (role === 'f1') return 50000; // Cấp 1: 50k/vé
    if (role === 'f2') return 20000; // Cấp 2: 20k/vé
    
    // 3. User / Guest
    return 0; 
};

export const payBookingWithWallet = async (bookingId: string, userId: string | number, amount: number, commission: number): Promise<{success: boolean, message: string}> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=pay_booking_wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                booking_id: bookingId,
                user_id: userId,
                amount: Number(amount),
                commission: Number(commission)
            }),
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Wallet payment failed:", error);
        return { success: false, message: 'Lỗi kết nối khi thanh toán ví.' };
    }
};
