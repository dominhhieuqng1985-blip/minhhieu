import { User, BookingData } from '../types';
import { DB_API_URL } from './apiConfig';

const CURRENT_USER_KEY = 'flightUserState';

// --- Public API ---

export const register = async (newUser: User): Promise<{ success: boolean, message: string }> => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.phone) {
        return { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc (Họ tên, Email, SĐT, Mật khẩu).' };
    }
    if (newUser.password.length < 6) {
        return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' };
    }

    const sanitizeOptional = (str?: string) => {
        if (!str) return null;
        const trimmed = str.trim();
        return trimmed.length > 0 ? trimmed : null;
    };

    let genderDB = 'Other';
    const inputGender = newUser.gender; 
    
    if (inputGender === 'Mr' || inputGender === 'Nam' || inputGender === 'Male') {
        genderDB = 'Male';
    } else if (inputGender === 'Mrs' || inputGender === 'Miss' || inputGender === 'Nữ' || inputGender === 'Female') {
        genderDB = 'Female';
    }

    const payload = {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        phone: newUser.phone.trim(),
        password: newUser.password,
        gender: genderDB, 
        dob: sanitizeOptional(newUser.dob), 
        id_card: sanitizeOptional(newUser.id_card),
        address: sanitizeOptional(newUser.address),
        nationality: newUser.nationality || 'Việt Nam'
    };

    console.log("Registering payload:", payload);

    try {
        const response = await fetch(`${DB_API_URL}?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const text = await response.text();
        console.log("Register API Response:", text);

        if (!response.ok) {
            try {
                const errJson = JSON.parse(text);
                const msg = errJson.error || errJson.message;
                if (msg) throw new Error(msg);
            } catch (e) {}
            throw new Error(`Lỗi máy chủ (${response.status}). Vui lòng thử lại.`);
        }
        
        try {
            const result = JSON.parse(text);
            if (!result.success && (result.error || result.message)) {
                 return { success: false, message: result.error || result.message };
            }
            return result;
        } catch (e) {
             throw new Error("Phản hồi từ máy chủ không hợp lệ.");
        }

    } catch (error: any) {
        console.error("Registration failed:", error);
        return { success: false, message: error.message || 'Đã xảy ra lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.' };
    }
};

export const login = async (email: string, password: string): Promise<{ success: boolean, message: string, user?: User }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.user) {
            sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.user));
        }
        return result;
    } catch (error) {
        console.error("Login failed:", error);
        return { success: false, message: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.' };
    }
};

export const logout = () => {
    sessionStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
    try {
        const userJson = sessionStorage.getItem(CURRENT_USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
        console.error("Failed to parse current user from sessionStorage", error);
        return null;
    }
};

export const getAllUsers = async (): Promise<Omit<User, 'password'>[]> => {
     try {
        const response = await fetch(`${DB_API_URL}?action=get_users&_t=${Date.now()}`, {
            cache: 'no-store'
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        const users = await response.json();
        return Array.isArray(users) ? users : [];
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
    }
};

const safeParseBooking = (b: any): BookingData => {
    const safeParse = (val: any, defaultVal: any) => {
        if (val === null || val === undefined) return defaultVal;
        if (typeof val === 'string') {
            try { 
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed) && Object.keys(parsed).length === 0) {
                    return defaultVal;
                }
                return parsed || defaultVal; 
            } catch { 
                return defaultVal; 
            }
        }
        return val;
    };
    
    const ensureObject = (val: any, defaultVal: any) => {
        const parsed = safeParse(val, defaultVal);
        if (Array.isArray(parsed) && parsed.length === 0) return defaultVal;
        return parsed;
    };

    return {
        ...b,
        userId: b.user_id || b.userId,
        total_amount: b.total_amount ? parseFloat(b.total_amount) : 0,
        payment_info: safeParse(b.payment_info, {}),
        passengers: Array.isArray(b.passengers) ? b.passengers : safeParse(b.passengers, []),
        contact: ensureObject(b.contact, {}),
        flight: ensureObject(b.flight, { price_net: 0, flights: [] }),
        bookingDetails: ensureObject(b.bookingDetails, { selected_flights: [] }),
        selectedOutboundOption: ensureObject(b.selectedOutboundOption, null),
        selectedInboundOption: ensureObject(b.selectedInboundOption, null),
        ancillaries: ensureObject(b.ancillaries, {})
    };
};


export const getMyBookings = async (userId: number | string): Promise<BookingData[]> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=get_my_bookings`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        if (!response.ok) {
             throw new Error(`Server error: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (!Array.isArray(data)) return [];

        return data.map(safeParseBooking);
    } catch (error) {
        console.error("Failed to fetch my bookings:", error);
        return [];
    }
}

// New Professional V2: Get Booking by PNR
export const getBookingByPnr = async (pnr: string): Promise<BookingData | null> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=get_booking_by_pnr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pnr }),
        });
        if (!response.ok) return null;
        const result = await response.json();
        
        if (!result.booking) return null;
        
        return safeParseBooking(result.booking);

    } catch (error) {
        return null;
    }
}