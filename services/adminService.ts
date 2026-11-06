
// adminService.ts - UPGRADED TO V3 (2025) - Enhanced Admin Management
// Changes:
// - getFeeConfig: Added robust fallback for airlines with 0 service fees (Vietjet fix).
// - createBooking: Now respects payment_status passed from frontend (crucial for wallet payment).
// - calculateAdditivePrice: Updated to handle Round Trip logic (x2 fixed fees).

import { AdminFeeConfig, BookingData, FeeConfig, BookingLookupData, User, Admin, FooterColumn, Passengers } from '../types'; 
import { REGIONAL_AIRPORTS } from '../constants';
import { DB_API_URL } from './apiConfig';

const ADMIN_LOGGED_IN_KEY = 'flightAdminLoggedIn';
const ADMIN_INFO_KEY = 'flightAdminInfo';

// --- Auth (Updated for new schema) ---
export const login = async (loginInput: string, pass: string): Promise<boolean> => {
    try {
        const payload = { 
            username: loginInput, 
            email: loginInput, 
            password: pass 
        };

        const response = await fetch(`${DB_API_URL}?action=admin_login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.success) {
            sessionStorage.setItem(ADMIN_LOGGED_IN_KEY, 'true');
            if (result.admin) {
                sessionStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(result.admin));
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error("Admin login failed:", error);
        return false;
    }
};

export const logout = () => {
    sessionStorage.removeItem(ADMIN_LOGGED_IN_KEY);
    sessionStorage.removeItem(ADMIN_INFO_KEY);
};

export const isLoggedIn = (): boolean => {
    return sessionStorage.getItem(ADMIN_LOGGED_IN_KEY) === 'true';
};

export const getCurrentAdmin = (): Admin | null => {
    try {
        const data = sessionStorage.getItem(ADMIN_INFO_KEY);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

export const getCurrentAdminInfo = async (): Promise<Admin | null> => {
    const current = getCurrentAdmin();
    if (!current?.id) return null;
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_get_info&id=${current.id}&_t=${Date.now()}`, {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error('Failed to fetch current admin info');
        const result = await response.json();
        return result.success ? result.admin : null;
    } catch (error) {
        console.error("Error fetching current admin info:", error);
        return current; 
    }
};

export const updateAdminInfo = async (id: number | string, updates: Partial<Admin>): Promise<{ success: boolean, message: string }> => {
    try {
        const payload: any = { id, ...updates };
        if (updates.username) payload.user = updates.username;
        const response = await fetch(`${DB_API_URL}?action=admin_update_info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối khi cập nhật thông tin admin.' };
    }
};

export const changeAdminPassword = async (id: number | string, oldPassword: string, newPassword: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_change_password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, old_password: oldPassword, new_password: newPassword }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối khi đổi mật khẩu.' };
    }
};

export const changeAdminCredentials = async (newUser: string, newPassword: string): Promise<boolean> => {
    const currentAdmin = getCurrentAdmin();
    if (!currentAdmin) return false;
    try {
        const updatePayload: Partial<Admin> = { id: currentAdmin.id, username: newUser };
        const updateResponse = await updateAdminInfo(currentAdmin.id, updatePayload);
        if (!updateResponse.success) return false;
        const resetResponse = await changeAdminPassword(currentAdmin.id, '', newPassword);
        if (!resetResponse.success) return false;
        const updatedAdmin = { ...currentAdmin, ...updatePayload };
        sessionStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(updatedAdmin));
        return true;
    } catch (error) {
        return false;
    }
};

export const getAdmins = async (): Promise<Admin[]> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=get_admins&_t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch admins');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
};

export const createAdmin = async (admin: Omit<Admin, 'id' | 'created_at' | 'updated_at' | 'last_login'> & { password: string }): Promise<{ success: boolean, message: string }> => {
    try {
        const payload = { ...admin, fullname: admin.fullname || '', user: admin.username || '' };
        const response = await fetch(`${DB_API_URL}?action=create_admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối khi tạo admin.' };
    }
};

export const updateAdmin = async (admin: Admin): Promise<{ success: boolean, message: string }> => {
    try {
        const payload = { id: admin.id, fullname: admin.fullname || '', user: admin.username || '', email: admin.email || '' };
        const response = await fetch(`${DB_API_URL}?action=update_admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối khi cập nhật admin.' };
    }
};

export const deleteAdmin = async (id: string | number): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=delete_admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối khi xóa admin.' };
    }
};

export const resetAdminPassword = async (id: string | number, newPassword: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=reset_admin_password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, newPassword }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối khi reset mật khẩu admin.' };
    }
};

export const updateLastLogin = async (id: number | string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_update_last_login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi cập nhật last_login.' };
    }
};

// --- Bookings ---
export const createBooking = async (bookingData: BookingData): Promise<{ success: boolean, message: string }> => {
    try {
        // IMPORTANT: Respect passed payment status and info!
        // This is critical for wallet payments which come in as 'paid'
        const payload = {
            ...bookingData,
            user_id: bookingData.userId,
            payment_status: bookingData.payment_status, // Allow 'paid' for wallet
            status: bookingData.status, // Allow 'confirmed' for wallet
            total_amount: bookingData.total_amount || 0, 
            payment_info: bookingData.payment_info ? JSON.stringify(bookingData.payment_info) : JSON.stringify({})
        };
        const response = await fetch(`${DB_API_URL}?action=create_booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Could not save booking: ${message}` };
    }
};

export const getAllBookings = async (): Promise<BookingData[]> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=get_bookings&_t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) return [];

        return data.map((b: any) => {
            const safeParse = (val: any, defaultVal: any) => {
                if (val === null || val === undefined) return defaultVal;
                if (typeof val === 'string') {
                    try { 
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed) && Object.keys(parsed).length === 0) return defaultVal;
                        return parsed || defaultVal;
                    } catch { return defaultVal; }
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
        });
    } catch (e) {
        return [];
    }
};

export const deleteBooking = async (bookingId: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_delete_booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối khi xóa đơn hàng.' };
    }
};

export const updateBookingStatus = async (bookingId: string, status: string, admin_note: string = ''): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_update_booking_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, status, admin_note }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

export const processPayment = async (bookingId: string, totalAmount: number, paymentInfo: any): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=process_payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingId,
                payment_status: 'paid',
                payment_info: JSON.stringify(paymentInfo),
                total_amount: totalAmount
            }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi xử lý thanh toán.' };
    }
};

export const updateBookingPNR = async (bookingId: string, newPnr: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=update_booking_pnr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, pnr: newPnr }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

export const cancelBooking = async (bookingId: string, reason: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=cancel_booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, cancellation_reason: reason }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi hủy đơn hàng.' };
    }
};

export const lookupBooking = async (lookupData: BookingLookupData): Promise<BookingData | null> => {
    try {
        const allBookings = await getAllBookings();
        if (!allBookings || allBookings.length === 0) return null;
        return allBookings.find(booking => 
            booking.id?.trim().toUpperCase() === lookupData.orderId.trim().toUpperCase() && 
            booking.contact?.email?.trim().toLowerCase() === lookupData.email.trim().toLowerCase()
        ) || null;
    } catch (error) {
        return null;
    }
};

export const updateUser = async (user: User): Promise<{ success: boolean, message: string }> => {
    try {
        let genderDB = 'Other';
        const inputGender = user.gender; 
        if (inputGender === 'Mr' || inputGender === 'Nam' || inputGender === 'Male') genderDB = 'Male';
        else if (inputGender === 'Mrs' || inputGender === 'Miss' || inputGender === 'Nữ' || inputGender === 'Female') genderDB = 'Female';

        const sanitizeOptional = (str?: string) => str?.trim().length ? str.trim() : null;
        const payload = {
            ...user,
            gender: genderDB,
            dob: sanitizeOptional(user.dob),
            id_card: sanitizeOptional(user.id_card),
            address: sanitizeOptional(user.address),
            nationality: user.nationality || 'Việt Nam'
        };
        const response = await fetch(`${DB_API_URL}?action=admin_update_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối cập nhật user.' };
    }
};

export const resetUserPassword = async (userId: string | number, newPassword: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_reset_password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, newPassword }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

export const deleteUser = async (userId: string | number): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_delete_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

export const updateLoyaltyPoints = async (userId: string | number, pointsDelta: number): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=update_loyalty_points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, points_delta: pointsDelta }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi cập nhật điểm.' };
    }
};

export const updateFlightSchedule = async (bookingId: string, legIndex: number, newDepartureTime: string, newArrivalTime?: string): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=admin_update_flight_schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, legIndex, newDateTime: newDepartureTime, newArrivalTime }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

// --- Fee Configuration (Updated) ---
export const getFeeConfig = async (): Promise<AdminFeeConfig> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=get_fees&_t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed');
        const feeArray: (FeeConfig & {config_key: string})[] = await response.json();
        
        const config: AdminFeeConfig = {
            default: { service_type: 'fixed', service_value: 90000, tax_type: 'percent', tax_value: 8, currency: 'VND' },
            domestic: { service_type: 'fixed', service_value: 90000, tax_type: 'percent', tax_value: 8, currency: 'VND' },
            international: { service_type: 'fixed', service_value: 250000, tax_type: 'percent', tax_value: 0, currency: 'VND' },
            airlines: {},
        };

        if (Array.isArray(feeArray)) {
            feeArray.forEach(item => {
                const { config_key, ...feeValues } = item;
                if (config_key === 'default' || config_key === 'domestic' || config_key === 'international') {
                    config[config_key] = feeValues;
                } else {
                    config.airlines[config_key] = feeValues;
                }
            });
        }

        // CRITICAL FIX: Ensure specific airline configs exist and are non-zero.
        ['VN', 'VJ', 'QH', 'VU', 'BL'].forEach(code => {
            if (!config.airlines[code] || config.airlines[code].service_value === 0) {
                config.airlines[code] = { ...config.domestic };
            }
        });
        
        return config;

    } catch (e) {
         return {
            default: { service_type: 'fixed', service_value: 90000, tax_type: 'percent', tax_value: 8, currency: 'VND' },
            domestic: { service_type: 'fixed', service_value: 90000, tax_type: 'percent', tax_value: 8, currency: 'VND' },
            international: { service_type: 'fixed', service_value: 250000, tax_type: 'percent', tax_value: 0, currency: 'VND' },
            airlines: {}
        };
    }
};

export const saveFeeConfig = async (config: AdminFeeConfig): Promise<boolean> => {
    const feeUpdatePromises: Promise<any>[] = [];
    const configsToSave = [
        { config_key: 'default', ...config.default },
        { config_key: 'domestic', ...config.domestic },
        { config_key: 'international', ...config.international },
        ...Object.entries(config.airlines).map(([key, value]) => ({ config_key: key, ...value }))
    ];

    for (const fee of configsToSave) {
        const promise = fetch(`${DB_API_URL}?action=update_fee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fee),
        }).then(res => res.json());
        feeUpdatePromises.push(promise);
    }
    try {
        await Promise.all(feeUpdatePromises);
        return true;
    } catch(error) {
        return false;
    }
};

// --- Footer Menu ---
export const INITIAL_FOOTER_CONFIG: FooterColumn[] = [
    {
        id: 'col-about',
        title: 'Về Nhã Uyên Air',
        links: [
            { id: 'l1', label: 'Giới thiệu', url: '#', icon: 'InfoIcon' },
            { id: 'l2', label: 'Tuyển dụng', url: '#', icon: 'UserGroupIcon' },
            { id: 'l3', label: 'Tin tức hàng không', url: '#', icon: 'FileTextIcon' },
            { id: 'l4', label: 'Chính sách bảo mật', url: '#', icon: 'ShieldCheckIcon' },
            { id: 'l5', label: 'Điều khoản sử dụng', url: '#', icon: 'FileTextIcon' },
        ]
    },
    {
        id: 'col-support',
        title: 'Hỗ Trợ Khách Hàng',
        links: [
            { id: 's1', label: 'Hướng dẫn đặt vé', url: '#', icon: 'TicketIcon' },
            { id: 's2', label: 'Hướng dẫn thanh toán', url: 'https://vemaybaynhauyen.com/huong-dan-thanh-toan', icon: 'CreditCardIcon' },
            { id: 's3', label: 'Chính sách hoàn hủy', url: '#', icon: 'RefreshIcon' },
            { id: 's4', label: 'Câu hỏi thường gặp', url: '#', icon: 'InfoIcon' },
            { id: 's5', label: 'Gửi yêu cầu hỗ trợ', url: 'https://vemaybaynhauyen.com/lien-he', icon: 'MailIcon' },
        ]
    },
    {
        id: 'col-contact',
        title: 'Liên Hệ',
        links: [
            { id: 'c1', label: 'Thôn 1, Tiên Cảnh, Tiên Phước, Quảng Nam', url: 'https://maps.google.com/?q=Thôn 1, Tiên Cảnh, Tiên Phước, Quảng Nam', icon: 'MapPinIcon', target: '_blank' },
            { id: 'c2', label: '0961 000 240', url: 'tel:0961000240', icon: 'PhoneIcon', target: '_self' },
            { id: 'c3', label: 'nha.uyen@vemaybaynhauyen.com', url: 'mailto:nha.uyen@vemaybaynhauyen.com', icon: 'MailIcon', target: '_self' },
            { id: 'c4', label: 'Đã thông báo BCT', url: '#', icon: 'ShieldCheckIcon', target: '_self' }
        ]
    }
];

export const getFooterConfig = async (): Promise<FooterColumn[]> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=get_footer_config&_t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
        return INITIAL_FOOTER_CONFIG;
    } catch (e) {
        return INITIAL_FOOTER_CONFIG;
    }
};

export const updateFooterConfig = async (columns: FooterColumn[]): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=update_footer_config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columns }),
        });
        const result = await response.json();
        if (result === true || result === 'success' || result.success === true || result.status === 'success') {
             return { success: true, message: 'Lưu cấu hình Footer thành công!' };
        }
        return { success: false, message: result.message || 'Lưu thất bại.' };
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

export const deleteFooterConfig = async (): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=delete_footer_config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        return { success: result.success, message: result.message || 'Xóa thất bại.' };
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

export const restoreFooterConfig = async (): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await fetch(`${DB_API_URL}?action=restore_footer_config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        return { success: result.success, message: result.message || 'Khôi phục thất bại.' };
    } catch (error) {
        return { success: false, message: 'Lỗi kết nối.' };
    }
};

const getAirlineCode = (airlineName: string): string => {
    if (!airlineName) return 'default';
    const lowerName = airlineName.toLowerCase();
    if (lowerName.includes('vietnam airline') || lowerName.includes('vietnamairline') || lowerName === 'vn') return 'VN';
    if (lowerName.includes('vietjet') || lowerName.includes('vj')) return 'VJ';
    if (lowerName.includes('bamboo') || lowerName.includes('qh')) return 'QH';
    if (lowerName.includes('vietravel') || lowerName.includes('vu')) return 'VU';
    if (lowerName.includes('pacific') || lowerName.includes('bl') || lowerName.includes('jetstar')) return 'BL';
    return 'default';
};

const isInternational = (departureId: string, arrivalId: string): boolean => {
    if (!departureId || !arrivalId) return false;
    const vietnamAirports = new Set(REGIONAL_AIRPORTS['Việt Nam'].map(a => a.id));
    return !vietnamAirports.has(departureId) || !vietnamAirports.has(arrivalId);
};

export const resolveFee = (
    config: AdminFeeConfig, 
    airlineName: string, 
    departureId: string, 
    arrivalId: string,
    paxType: 'adult' | 'child' | 'infant' = 'adult'
): FeeConfig => {
    const airlineCode = getAirlineCode(airlineName);
    const isIntl = isInternational(departureId, arrivalId);
    const routeKey = isIntl ? 'international' : 'domestic';

    const key1 = `${airlineCode}_${paxType}`;
    if (config.airlines?.[key1]) return config.airlines[key1];

    const key2 = `${routeKey}_${paxType}`;
    if (config.airlines?.[key2]) return config.airlines[key2];

    if (config.airlines?.[airlineCode]) return config.airlines[airlineCode];

    const routeConfig = (config as any)[routeKey];
    if (routeConfig && routeConfig.service_value !== undefined) return routeConfig;

    return config.default;
};

export const calculateAdditivePrice = (
    airlineNetPrice: number,
    config: AdminFeeConfig | null,
    airlineName: string,
    departureId: string,
    arrivalId: string,
    passengers: Passengers,
    isRoundTrip: boolean = false // Added flag
) => {
    if (!config) return { airlineNet: airlineNetPrice, serviceFee: 0, tax: 0, finalTotal: airlineNetPrice };

    // If Round Trip, we double the FIXED fees (per leg).
    // Percentage fees are applied to the net price (which is already doubled for roundtrip in airlineNetPrice usually)
    const legMultiplier = isRoundTrip ? 2 : 1;

    let totalServiceFee = 0;
    let totalTax = 0;
    const priceDivisor = (passengers.adults + passengers.children) || 1;
    const unitPrice = airlineNetPrice / priceDivisor;
    const types: ('adult' | 'child' | 'infant')[] = ['adult', 'child', 'infant'];

    types.forEach(type => {
        const count = type === 'adult' ? passengers.adults : (type === 'child' ? passengers.children : passengers.infants);
        if (count > 0) {
            const feeConfig = resolveFee(config, airlineName, departureId, arrivalId, type);
            
            // Service Fee Calculation
            if (feeConfig.service_type === 'percent') {
                const base = type === 'infant' ? 0 : unitPrice; 
                totalServiceFee += (base * (feeConfig.service_value / 100)) * count;
            } else {
                // Fixed fee: Multiply by legs
                totalServiceFee += (feeConfig.service_value * legMultiplier) * count;
            }

            // Tax Calculation
            if (feeConfig.tax_type === 'percent') {
                const base = type === 'infant' ? 0 : unitPrice;
                totalTax += (base * (feeConfig.tax_value / 100)) * count;
            } else {
                // Fixed tax: Multiply by legs
                totalTax += (feeConfig.tax_value * legMultiplier) * count;
            }
        }
    });

    return {
        airlineNet: airlineNetPrice,
        serviceFee: totalServiceFee,
        tax: totalTax,
        finalTotal: airlineNetPrice + totalServiceFee + totalTax
    };
};
