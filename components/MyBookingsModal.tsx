import React, { useState, useEffect } from 'react';
import { BookingData, User } from '../types';
import { CloseIcon, SearchIcon } from './icons/Icons';
import * as authService from '../services/authService';
import ETicket from './ETicket';

interface MyBookingsModalProps {
    user: User;
    onClose: () => void;
}

const MyBookingsModal: React.FC<MyBookingsModalProps> = ({ user, onClose }) => {
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
    
    // Search by PNR state
    const [pnrSearch, setPnrSearch] = useState('');
    const [pnrError, setPnrError] = useState('');

    useEffect(() => {
        const fetchBookings = async () => {
            if (user.id) {
                const data = await authService.getMyBookings(user.id);
                setBookings(data);
            }
            setIsLoading(false);
        };
        fetchBookings();
    }, [user.id]);

    const handlePnrSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setPnrError('');
        if(!pnrSearch.trim()) return;
        
        const booking = await authService.getBookingByPnr(pnrSearch.trim());
        if(booking) {
            setSelectedBooking(booking);
        } else {
            setPnrError('Không tìm thấy mã đặt chỗ này.');
        }
    }

    const getStatusBadge = (status?: string) => {
        switch(status) {
            case 'paid': return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Đã thanh toán</span>;
            case 'cancelled': return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Đã hủy</span>;
            default: return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Chờ thanh toán</span>;
        }
    }

    if (selectedBooking) {
        return (
            <div className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center p-4 ticket-modal-container">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[95vh] overflow-hidden flex flex-col">
                    <div className="flex-shrink-0 p-3 bg-gray-100 flex justify-between items-center no-print">
                        <h3 className="font-bold text-gray-800">Chi tiết vé: {selectedBooking.id}</h3>
                        <div>
                             <button onClick={() => window.print()} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 mr-2 text-sm">In vé</button>
                            <button onClick={() => setSelectedBooking(null)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 text-sm">Đóng</button>
                        </div>
                    </div>
                     <div className="flex-grow overflow-y-auto ticket-modal-content">
                       <div className="ticket-to-print">
                            <ETicket
                                pnr={selectedBooking.pnr}
                                bookingTimestamp={selectedBooking.bookingTimestamp}
                                flight={selectedBooking.flight}
                                bookingData={selectedBooking}
                                bookingDetails={selectedBooking.bookingDetails}
                                selectedOutboundOption={selectedBooking.selectedOutboundOption}
                                selectedInboundOption={selectedBooking.selectedInboundOption}
                            />
                       </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-[var(--card-bg-color)] rounded-lg shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)] flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Vé của tôi</h2>
                        {user.loyalty_points !== undefined && (
                            <p className="text-xs text-blue-600 font-semibold mt-1">Điểm tích lũy: {user.loyalty_points} điểm</p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-[var(--border-color)]">
                    <form onSubmit={handlePnrSearch} className="flex gap-2">
                         <input 
                            type="text" 
                            placeholder="Tìm bằng mã đặt chỗ (PNR)..." 
                            value={pnrSearch}
                            onChange={e => setPnrSearch(e.target.value.toUpperCase())}
                            className="flex-grow p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                         />
                         <button type="submit" className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700"><SearchIcon className="w-4 h-4"/></button>
                    </form>
                    {pnrError && <p className="text-red-500 text-xs mt-1">{pnrError}</p>}
                </div>

                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <p className="text-center py-4">Đang tải...</p>
                    ) : bookings.length === 0 ? (
                        <p className="text-center py-4 text-gray-500">Bạn chưa có đơn hàng nào.</p>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map(booking => (
                                <div key={booking.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-lg text-red-600">{booking.pnr}</p>
                                            <p className="text-sm text-gray-500">Mã đơn: {booking.id}</p>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(booking.status)}
                                            <p className="text-xs text-gray-500 mt-1">{booking.status === 'cancelled' ? 'Đã hủy' : (booking.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán')}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-sm">
                                        <p><strong>Ngày đặt:</strong> {new Date(booking.bookingTimestamp).toLocaleDateString('vi-VN')}</p>
                                        <p><strong>Hành trình:</strong> {booking.flight.flights[0].departure_airport.id} - {booking.flight.flights[booking.flight.flights.length -1].arrival_airport.id}</p>
                                        {booking.cancellation_reason && (
                                            <p className="text-red-500 italic mt-1">Lý do hủy: {booking.cancellation_reason}</p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setSelectedBooking(booking)}
                                        className="mt-3 text-blue-600 hover:underline font-semibold text-sm"
                                    >
                                        Xem chi tiết vé
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyBookingsModal;