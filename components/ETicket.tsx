
import React from 'react';
import { type FlightOption, type BookingData, type Passengers, type FlightDetailsResult, type SelectedFlightLeg, type BookingOption, type FlightDetail, PassengerDetails } from '../types';
import { ClockIcon, UserIcon, InfoIcon, TicketIcon } from './icons/Icons';

interface ETicketProps {
    pnr: string;
    bookingTimestamp: Date | string;
    flight: FlightOption | null; // Can be null for bad data
    bookingData: BookingData;
    bookingDetails: FlightDetailsResult | null; // Can be null for bad data
    selectedOutboundOption: BookingOption | null; // Can be null for bad data
    selectedInboundOption: BookingOption | null;
}

const Logo: React.FC = () => (
  <svg width="220" height="50" viewBox="0 0 220 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="5" y="28" fontFamily="Arial, Helvetica, sans-serif" fontSize="26" fontWeight="bold">
      <tspan fill="#0056b3">Nhã Uyên</tspan>
      <tspan fill="#DA251D"> AIR</tspan>
    </text>
    <text x="5" y="45" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fill="#333">
      vemaybaynhauyen.com
    </text>
  </svg>
);

const QRCode: React.FC<{ code: string }> = ({ code }) => {
    const [qrError, setQrError] = React.useState(false);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(code)}`;

    if (!code || code.toLowerCase().includes('xử lý')) {
        return <div className="h-16 flex items-center justify-center text-xs text-gray-500">PNR đang xử lý</div>;
    }

    if (qrError) {
        return <div className="h-16 flex items-center justify-center text-xs text-red-500 bg-red-50 p-2 rounded">Lỗi tải mã QR</div>;
    }

    return (
        <img 
            src={qrUrl} 
            alt={`QR Code for PNR ${code}`}
            className="h-16 w-16 object-contain"
            onError={() => setQrError(true)}
        />
    );
};

// FORCE TIMEZONE: Asia/Ho_Chi_Minh
const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' // Force timezone
        };
        return date.toLocaleDateString('vi-VN', options);
    } catch {
        return 'Invalid Date';
    }
}

// FORCE TIMEZONE: Asia/Ho_Chi_Minh
const formatSimpleDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if(isNaN(date.getTime())) {
            const parts = dateString.split('-');
            if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return dateString;
        }
        return date.toLocaleDateString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    } catch {
        return dateString;
    }
}

// FORCE TIMEZONE: Asia/Ho_Chi_Minh
const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    } catch {
        return 'Invalid Time';
    }
}

const getPaymentDeadline = (departureTimeStr: string, bookingTimeInput: Date | string): string => {
    try {
        const bookingTime = typeof bookingTimeInput === 'string' ? new Date(bookingTimeInput) : bookingTimeInput;
        const departureTime = new Date(departureTimeStr);
        const hoursToDeparture = (departureTime.getTime() - bookingTime.getTime()) / (1000 * 60 * 60);

        let deadlineFromBooking: Date;

        if (hoursToDeparture > 72) {
            deadlineFromBooking = new Date(bookingTime.getTime() + 12 * 60 * 60 * 1000);
        } else if (hoursToDeparture > 24) {
            deadlineFromBooking = new Date(bookingTime.getTime() + 4 * 60 * 60 * 1000);
        } else {
            deadlineFromBooking = new Date(bookingTime.getTime() + 1 * 60 * 60 * 1000);
        }
        
        const deadlineFromDeparture = new Date(departureTime.getTime() - 4 * 60 * 60 * 1000);
        const finalDeadline = new Date(Math.min(deadlineFromBooking.getTime(), deadlineFromDeparture.getTime()));

        if (finalDeadline.getTime() < bookingTime.getTime()) {
            const emergencyDeadline = new Date(bookingTime.getTime() + 30 * 60 * 1000);
            const finalEmergencyDeadline = new Date(Math.min(emergencyDeadline.getTime(), deadlineFromDeparture.getTime()));
            return `trước ${formatTime(finalEmergencyDeadline.toISOString())} ngày ${finalEmergencyDeadline.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh'})}`;
        }

        return `trước ${formatTime(finalDeadline.toISOString())} ngày ${finalDeadline.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh'})}`;
    } catch (e) {
        return "trong vòng 12 giờ tới";
    }
};


const Section: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h2 className="bg-red-700 text-white font-bold p-2 text-md">{title}</h2>
        <div className="border border-gray-300 border-t-0 p-3">
            {children}
        </div>
    </div>
);

// Updated Logic to correctly handle Children/Infant Titles
const getTitleInVietnamese = (p: PassengerDetails): string => {
    // Priority check for Child/Infant types
    if (p.type === 'Child' || p.type === 'Infant') {
        if (p.title === 'Master') return 'Bé trai';
        if (p.title === 'Miss') return 'Bé gái';
        // Fallback for odd cases
        return 'Bé';
    }

    // Adult Logic
    switch(p.title) {
        case 'Mr': return 'Ông';
        case 'Mrs': return 'Bà';
        case 'Miss': return 'Cô';
        case 'Master': return 'Bé trai'; // Should not happen for adult but safe fallback
        default: return 'Ông/Bà';
    }
};

const formatPassengerName = (name: string) => {
    if (!name) return '';
    // Remove commas, replace multiple spaces with single space, uppercase
    return name.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
};

const ErrorDisplay: React.FC = () => (
    <div className="bg-white p-6 max-w-4xl mx-auto font-sans text-gray-800 border-4 border-gray-200">
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <div className="flex">
                <div className="flex-shrink-0">
                    <InfoIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium">Không thể hiển thị vé</h3>
                    <div className="mt-2 text-sm">
                        <p>Dữ liệu của đơn hàng này không đầy đủ hoặc bị lỗi. Vui lòng kiểm tra lại trong phần quản trị.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const ETicket: React.FC<ETicketProps> = ({ pnr, bookingTimestamp, flight, bookingData, bookingDetails, selectedOutboundOption, selectedInboundOption }) => {

    // SAFE CHECKS TO PREVENT CRASH
    if (!bookingDetails || !bookingDetails.selected_flights || !selectedOutboundOption || !flight || !bookingData.contact || !Array.isArray(bookingData.passengers)) {
        return <ErrorDisplay />;
    }

    // Always use the original flight time from the booking details
    let displayDepartureTime = bookingDetails.selected_flights?.[0]?.flights?.[0]?.departure_airport?.time;
    
    const paymentDeadline = displayDepartureTime ? getPaymentDeadline(displayDepartureTime, bookingTimestamp) : 'N/A';
    const bookingTime = typeof bookingTimestamp === 'string' ? new Date(bookingTimestamp) : bookingTimestamp;
    
    // DYNAMIC STATUS LOGIC
    let paymentStatusText = "CHƯA THANH TOÁN";
    let paymentStatusColor = "text-orange-500 bg-orange-100";
    let bookingStatusText = "ĐÃ XÁC NHẬN";
    let bookingStatusColor = "text-blue-600";
    let importantNote = `Quý khách vui lòng hoàn tất thanh toán cho đơn hàng này ${paymentDeadline} để đảm bảo vé được xuất thành công.`;
    
    // Logic hiển thị số vé điện tử (Chỉ hiển thị khi đã thanh toán)
    let eTicketNumber: string | null = null;

    // Status is the primary driver for ticket validity
    if (bookingData.status === 'cancelled') {
        paymentStatusText = "ĐÃ HỦY";
        paymentStatusColor = "text-red-600 bg-red-100";
        bookingStatusText = "ĐÃ HỦY";
        bookingStatusColor = "text-red-600";
        importantNote = "Đơn hàng này đã bị hủy. Vé không còn hiệu lực.";
    } else if (bookingData.payment_status === 'paid' || bookingData.status === 'paid' || bookingData.status === 'confirmed') {
        paymentStatusText = "ĐÃ THANH TOÁN";
        paymentStatusColor = "text-green-600 bg-green-100";
        bookingStatusText = "ĐÃ XÁC NHẬN";
        bookingStatusColor = "text-blue-600";
        importantNote = "Vé đã được thanh toán và có giá trị sử dụng để làm thủ tục bay.";
        
        // Generate E-Ticket Number based on ID (Matches PHP logic)
        // Format: 738-[Padded 10 digit ID]
        // Remove non-digits from ID first
        const cleanId = bookingData.id.replace(/\D/g, '').padEnd(10, '0').slice(0, 10);
        eTicketNumber = `738-${cleanId}`;
    }


    const renderFlightLeg = (leg: FlightDetail, key: string, fareName?: string) => {
        // Default times from flight data
        let depTime = leg.departure_airport.time;
        let arrTime = leg.arrival_airport.time;

        return (
            <tr key={key} className="border-b border-gray-300 text-sm">
                <td className="p-2 font-semibold">
                    <div className="flex items-center">
                        <img src={leg.airline_logo} alt={leg.airline} className="h-5 mr-2" />
                        <span>{leg.airline} <br/> {leg.flight_number}</span>
                    </div>
                </td>
                <td className="p-2">{formatDate(depTime)}</td>
                <td className="p-2">{leg.departure_airport.id} → {leg.arrival_airport.id}</td>
                <td className="p-2 font-bold text-red-600">{formatTime(depTime)}</td>
                <td className="p-2">{formatTime(arrTime)}</td>
                <td className="p-2">{fareName || leg.class}</td>
                <td className="p-2 text-green-600 font-semibold">{bookingData.status === 'cancelled' ? 'Đã hủy' : 'Đã xác nhận'}</td>
            </tr>
        );
    };
    
    return (
        <div className="bg-white p-6 max-w-4xl mx-auto font-sans text-gray-800 border-4 border-gray-200">
            <header className="flex justify-between items-center pb-4 border-b-2 border-red-700">
                <div>
                    <Logo />
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">Hotline hỗ trợ</p>
                    <p className="text-2xl font-bold text-red-700">0961000240</p>
                </div>
            </header>

            <main className="my-6 space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-700">VÉ ĐIỆN TỬ VÀ XÁC NHẬN HÀNH TRÌNH</h1>
                    <p className="text-sm">Đây không phải là thẻ lên tàu bay. Vui lòng làm thủ tục tại sân bay hoặc trực tuyến.</p>
                </div>

                <div className="relative border border-gray-300 rounded-lg p-4">
                    <div className="absolute -top-3 left-4 bg-white px-2 text-sm font-semibold text-gray-600">Mã đặt chỗ</div>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <QRCode code={pnr} />
                        <div className="text-center sm:text-right">
                            <span className="font-mono text-3xl sm:text-4xl text-red-700 font-bold tracking-widest">{pnr}</span>
                        </div>
                    </div>
                </div>

                <Section title="1. Thông tin đặt chỗ">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="font-semibold">Mã đơn hàng:</div>
                        <div className="font-bold text-blue-600">{bookingData.id}</div>

                        <div className="font-semibold">Trạng thái đặt chỗ:</div>
                        <div className={`font-bold ${bookingStatusColor}`}>
                            {bookingStatusText}
                        </div>
                        
                        <div className="font-semibold">Trạng thái thanh toán:</div>
                        <div className={`font-bold px-2 py-0.5 rounded-full inline-block w-fit ${paymentStatusColor}`}>
                            {paymentStatusText}
                        </div>

                        {/* Ticket Number Row - Only if Paid */}
                        {eTicketNumber && (
                            <>
                                <div className="font-semibold flex items-center gap-1">
                                    <TicketIcon className="w-4 h-4 text-green-600"/> Số vé điện tử:
                                </div>
                                <div className="font-bold text-green-700 font-mono text-base">{eTicketNumber}</div>
                            </>
                        )}

                        <div className="font-semibold">Ngày giờ đặt:</div>
                        <div>{bookingTime.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</div>

                        <div className="font-semibold">Liên lạc:</div>
                        <div>{bookingData.contact.fullName}</div>
                        
                        <div className="font-semibold">Email:</div>
                        <div>{bookingData.contact.email}</div>

                        <div className="font-semibold">Điện thoại:</div>
                        <div>{bookingData.contact.phone}</div>
                    </div>
                </Section>
                
                 <Section title="2. Thông tin hành khách">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-200">
                            <tr className="border-b border-gray-400">
                                <th className="p-2">Hành khách</th>
                                <th className="p-2">Ngày sinh</th>
                                <th className="p-2">CCCD/Passport</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookingData.passengers.map((p, i) => (
                                <tr key={i} className="border-b border-gray-300">
                                    <td className="p-2">
                                        <span className="font-bold">{getTitleInVietnamese(p)}:</span> {formatPassengerName(p.fullName)}
                                    </td>
                                    <td className="p-2">{formatSimpleDate(p.dob) || 'N/A'}</td>
                                    <td className="p-2">{p.idNumber || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     <div className="mt-4 pt-3 border-t">
                        <h4 className="font-semibold text-md mb-2">Hành lý & Dịch vụ</h4>
                        <div className="text-sm space-y-2">
                           <div>
                                <p className="font-bold">Chuyến đi: {selectedOutboundOption.together.option_title}</p>
                                <ul className="list-disc list-inside text-gray-700 pl-4">
                                    {selectedOutboundOption.together.baggage_prices.map((item, i) => <li key={`out-bag-${i}`}>{item}</li>)}
                                     {bookingData.ancillaries?.outboundBaggage && <li><strong>Mua thêm:</strong> {bookingData.ancillaries.outboundBaggage.name}</li>}
                                </ul>
                           </div>
                           {selectedInboundOption && (
                               <div>
                                    <p className="font-bold">Chuyến về: {selectedInboundOption.together.option_title}</p>
                                    <ul className="list-disc list-inside text-gray-700 pl-4">
                                        {selectedInboundOption.together.baggage_prices.map((item, i) => <li key={`in-bag-${i}`}>{item}</li>)}
                                        {bookingData.ancillaries?.inboundBaggage && <li><strong>Mua thêm:</strong> {bookingData.ancillaries.inboundBaggage.name}</li>}
                                    </ul>
                               </div>
                           )}
                        </div>
                    </div>
                </Section>
                
                 <Section title="3. Chi tiết hành trình">
                    <table className="w-full text-left">
                        <thead className="bg-gray-200">
                           <tr className="border-b border-gray-400 text-sm">
                                <th className="p-2">Chuyến bay</th>
                                <th className="p-2">Ngày</th>
                                <th className="p-2">Hành trình</th>
                                <th className="p-2">Giờ đi</th>
                                <th className="p-2">Giờ đến</th>
                                <th className="p-2">Hạng</th>
                                <th className="p-2">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                           {bookingDetails.selected_flights.map((legInfo, legIndex) => {
                                const isReturn = legInfo.type.toLowerCase().includes('về');
                                const fare = isReturn ? selectedInboundOption : selectedOutboundOption;
                                const fareName = fare?.together.option_title;

                                return legInfo.flights.map((flight, flightIndex) => 
                                    renderFlightLeg(flight, `${legInfo.type}-${flightIndex}`, fareName)
                                );
                            })}
                        </tbody>
                    </table>
                </Section>

                <Section title="4. Lưu ý quan trọng">
                     <div className="text-sm space-y-2">
                        <p><strong className={`font-bold ${paymentStatusColor.replace('bg-', 'text-')}`}>{paymentStatusText.startsWith('ĐÃ') ? 'Thông báo' : 'Thanh toán'}:</strong> {importantNote}</p>
                        <p><strong>Giấy tờ:</strong> Vui lòng mang theo giấy tờ tùy thân hợp lệ (CCCD, Passport) khi làm thủ tục tại sân bay.</p>
                        <p><strong>Thời gian:</strong> Có mặt tại sân bay trước giờ khởi hành ít nhất 90 phút (Nội địa) và 180 phút (Quốc tế).</p>
                    </div>
                </Section>
            </main>
             <footer className="text-center text-xs text-gray-500 border-t pt-4">
                Cảm ơn quý khách đã sử dụng dịch vụ của Vemaybaynhauyen.com. Chúc quý khách một chuyến bay tốt đẹp!
            </footer>
        </div>
    );
};

export default ETicket;
