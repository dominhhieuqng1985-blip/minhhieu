
import { BookingData } from '../types';

const TELEGRAM_BOT_TOKEN = '8248289226:AAEBgswpRmD6s4HHolB2UAqSWmlNXB433xs';
const TELEGRAM_CHAT_ID = '6531282913';

export const sendTelegramNotification = async (booking: BookingData) => {
    try {
        const flight = booking.flight.flights[0];
        const paxCount = booking.passengers.length;
        const totalAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.total_amount || 0);

        const message = `
🚀 *CÓ ĐƠN HÀNG MỚI!* 🚀
--------------------------------
🎫 *Mã đơn:* \`${booking.id}\`
🔖 *PNR:* \`${booking.pnr}\`
👤 *Khách hàng:* ${booking.contact.fullName}
📞 *SĐT:* ${booking.contact.phone}
📧 *Email:* ${booking.contact.email}
--------------------------------
✈️ *Hành trình:* ${flight.departure_airport.id} ➝ ${flight.arrival_airport.id}
🕒 *Giờ bay:* ${new Date(flight.departure_airport.time).toLocaleString('vi-VN')}
🛫 *Hãng:* ${flight.airline} (${flight.flight_number})
👥 *Số khách:* ${paxCount}
💰 *Tổng tiền:* ${totalAmount}
--------------------------------
⚡ _Vui lòng kiểm tra Admin Panel để xử lý._
`;

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            }),
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram API Error:', data);
        }
        return data.ok;
    } catch (error) {
        console.error('Failed to send Telegram notification:', error);
        return false;
    }
};
