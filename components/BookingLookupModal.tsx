import React, { useState } from 'react';
import { BookingData } from '../types';
import { CloseIcon } from './icons/Icons';
import * as adminService from '../services/adminService';
import ETicket from './ETicket';

interface BookingLookupModalProps {
    onClose: () => void;
}

const BookingLookupModal: React.FC<BookingLookupModalProps> = ({ onClose }) => {
    const [lookupData, setLookupData] = useState({ orderId: '', email: '' });
    const [foundBooking, setFoundBooking] = useState<BookingData | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        setFoundBooking(null);

        try {
            const booking = await adminService.lookupBooking(lookupData);
            if (booking) {
                setFoundBooking(booking);
            } else {
                setError('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại Mã đơn hàng và Email.');
            }
        } catch (err) {
            setError('Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (foundBooking) {
        return (
            <div className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center p-4 ticket-modal-container">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[95vh] overflow-hidden flex flex-col">
                    <div className="flex-shrink-0 p-3 bg-gray-100 flex justify-between items-center no-print">
                        <h3 className="font-bold text-gray-800">Thông tin đặt vé</h3>
                        <div>
                             <button onClick={() => window.print()} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 mr-2 text-sm">In vé</button>
                            <button onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 text-sm">Đóng</button>
                        </div>
                    </div>
                     <div className="flex-grow overflow-y-auto ticket-modal-content">
                       <div className="ticket-to-print">
                            <ETicket
                                pnr={foundBooking.pnr}
                                bookingTimestamp={foundBooking.bookingTimestamp}
                                flight={foundBooking.flight}
                                bookingData={foundBooking}
                                bookingDetails={foundBooking.bookingDetails}
                                selectedOutboundOption={foundBooking.selectedOutboundOption}
                                selectedInboundOption={foundBooking.selectedInboundOption}
                            />
                       </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-[var(--card-bg-color)] rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold">Kiểm tra đơn hàng</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>
                <form onSubmit={handleLookup} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Mã đơn hàng</label>
                        <input
                            type="text"
                            value={lookupData.orderId}
                            onChange={e => setLookupData(p => ({ ...p, orderId: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Email đặt vé</label>
                        <input
                            type="email"
                            value={lookupData.email}
                            onChange={e => setLookupData(p => ({ ...p, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400">
                        {isLoading ? 'Đang tìm...' : 'Tìm kiếm'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BookingLookupModal;