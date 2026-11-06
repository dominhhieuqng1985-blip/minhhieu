



import { BookingData } from '../types';
import { EMAIL_API_URL } from './apiConfig';

/**
 * Sends a confirmation email to the customer and a notification to the admin.
 * @param bookingData The complete data of the confirmed booking.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export const sendConfirmationEmail = async (bookingData: BookingData): Promise<{ success: boolean, message: string }> => {
    try {
        // CLONE DATA TO AVOID MUTATING STATE
        const payload = JSON.parse(JSON.stringify(bookingData));

        // The backend script (guimail.php) is smart enough to detect status changes
        // (paid, confirmed, cancelled) based on the payload.
        
        const response = await fetch(EMAIL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Email service error:", error);
        // We return success: true mostly because email failure shouldn't block the UI flow often, 
        // but in strict mode we might want to return false.
        // For now, let's return false with message.
        return { success: false, message: "Không thể gửi email xác nhận. Vui lòng kiểm tra kết nối." };
    }
};

/**
 * Sends a thank you email to the customer after the flight is completed.
 */
export const sendThankYouEmail = async (bookingData: BookingData): Promise<{ success: boolean, message: string }> => {
    try {
        const payload = JSON.parse(JSON.stringify(bookingData));
        // Explicitly set status to 'thank_you' to trigger specific logic in backend if available,
        // or we rely on the email template generator to handle completed flights.
        payload.status = 'thank_you'; 

        const response = await fetch(EMAIL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Email service error:", error);
        return { success: false, message: "Lỗi gửi email cảm ơn." };
    }
};