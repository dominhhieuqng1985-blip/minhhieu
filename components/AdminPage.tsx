
import React, { useState, useEffect, useMemo } from 'react';
import { AdminFeeConfig, BookingData, FeeConfig, User, Admin, FooterColumn, FooterLink, FlightTrackingInfo, AviationStackFlight, Passengers, ExchangeRate } from '../types'; 
import * as adminService from '../services/adminService';
import * as authService from '../services/authService';
import * as emailService from '../services/emailService';
import * as trackingService from '../services/trackingService';
import * as liveFlightService from '../services/liveFlightService'; // Import Live Service
import * as walletService from '../services/walletService'; // Import Wallet Service for Rates
import { FlightMapView, TrafficMap } from './LiveFlightTracker'; // Import Map View and Traffic Map
import { INITIAL_FOOTER_CONFIG } from '../services/adminService';
import ETicket from './ETicket';
import ChangeCredentialsModal from './ChangeCredentialsModal'; 
// NEW IMPORTS
import AgentWalletManager from './AgentWalletManager';
import ExchangeRateWidget from './ExchangeRateWidget';

import { CloseIcon, InfoIcon, DownloadIcon, TrashIcon, EditIcon, CreditCardIcon, ArrowLeftIcon, MailIcon, ChevronLeftIcon, ChevronRightIcon, ChartBarIcon, HomeIcon, BellIcon, SearchIcon, TicketIcon, PlusIcon, UserGroupIcon, RefreshIcon, FileTextIcon, ChevronDownIcon, CheckIcon, CheckCircleIcon, RadarIcon, TowerIcon, PlaneTakeoffIcon, PlaneLandIcon, PlaneIcon, ClockIcon, LogoutIcon, LayoutDashboardIcon, SparklesIcon, WifiIcon } from './icons/Icons';
import { AIRPORTS } from '../constants';
import { PROXY_URL, BACKUP_API_URL } from '../services/apiConfig';
import { ICON_MAP } from './icons/Icons';

interface AdminPageProps {
    onExitAdmin: () => void;
}

// ... (rest of the AdminPage.tsx content, keeping previous components unchanged until FlightTrackerView)

// --- Inserted helper functions and components from previous file context ---
// (Assuming AdminLogin, FeeConfiguration, RevenueManager, FooterEditor, FlightDepartureBoard, FlightScheduleModal, DelayedFlightsMonitor are unchanged)
// We will only update FlightTrackerView to include the Global Radar button

const getCityName = (airportId: string): string => {
    const airport = AIRPORTS.find(a => a.id === airportId);
    return airport ? airport.name.replace(/\s*\([^)]+\)/, '').trim() : airportId;
};

const getAirlineCodeHelper = (airlineName: string): string => {
    const al = airlineName.toLowerCase();
    if (al.includes('vietjet')) return 'VJ';
    if (al.includes('bamboo')) return 'QH';
    if (al.includes('vietravel')) return 'VU';
    if (al.includes('pacific')) return 'BL';
    return 'VN'; // Default Vietnam Airlines
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const getCleanDelayStatus = (rawNote: string): string | null => {
    if (!rawNote) return null;
    const parts = rawNote.split('|');
    for (let i = parts.length - 1; i >= 0; i--) {
        let part = parts[i].trim();
        part = part.replace(/^(Cập nhật lịch bay|Update schedule|Thanh toán).*?:\s*/i, '').trim();
        const lower = part.toLowerCase();
        const isDelay = lower.includes('delay') || lower.includes('hoãn') || lower.includes('trễ');
        const isEarly = lower.includes('sớm') || lower.includes('early');
        const isChange = lower.includes('đổi') || lower.includes('change');
        
        if (isDelay || isEarly || isChange) {
            if (part.match(/0\s*(giờ|h)\s*0\s*(phút|p|m)/i)) continue;
            return part;
        }
    }
    return null;
};

// ... AdminLogin Component ...
const AdminLogin: React.FC<{ onLoginSuccess: () => void, onExit: () => void }> = ({ onLoginSuccess, onExit }) => {
    // (Content omitted for brevity, assuming unchanged)
    const [loginInput, setLoginInput] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const success = await adminService.login(loginInput, password);
            if (success) {
                onLoginSuccess();
            } else {
                setError('Tên đăng nhập hoặc mật khẩu không đúng.');
            }
        } catch (err) {
            setError('Lỗi kết nối. Vui lòng kiểm tra mạng hoặc server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-sm">
                <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">Quản trị hệ thống</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email / Tên đăng nhập</label>
                        <input
                            type="text"
                            value={loginInput}
                            onChange={e => setLoginInput(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400">
                        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={onExit} className="w-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Quay lại trang chủ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ... FeeConfiguration Component ... (Unchanged)
const FeeConfiguration: React.FC<{ initialConfig: AdminFeeConfig }> = ({ initialConfig }) => {
    // (Keep content unchanged)
    const [config, setConfig] = useState<AdminFeeConfig>(initialConfig);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    useEffect(() => { setConfig(initialConfig); }, [initialConfig]);
    const handleGlobalChange = (group: any, field: any, value: any) => {
        setConfig(prev => ({ ...prev, [group]: { ...(prev as any)[group], [field]: field.endsWith('value') ? Number(value) : value } }));
    };
    const handleAirlineChange = (code: string, field: keyof FeeConfig, value: any) => {
        setConfig(prev => ({ ...prev, airlines: { ...prev.airlines, [code]: { ...(prev.airlines[code] || prev.default), [field]: field.endsWith('value') ? Number(value) : value } } }));
    };
    const handleSave = async () => {
        setStatus('saving');
        await adminService.saveFeeConfig(config);
        setTimeout(() => { setStatus('saved'); setTimeout(() => setStatus('idle'), 2000); }, 1000);
    };
    const renderFeeInputGroup = (groupKey: any, title: string) => {
        const group = (config as any)[groupKey];
        if (!group) return null;
        return (
            <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div><label className="block text-sm mb-1">Loại phí DV</label><select value={group.service_type} onChange={e => handleGlobalChange(groupKey, 'service_type', e.target.value)} className="w-full p-2 border rounded bg-transparent"><option value="fixed">Cố định</option><option value="percent">Phần trăm</option></select></div>
                    <div><label className="block text-sm mb-1">Giá trị phí DV</label><input type="number" value={group.service_value} onChange={e => handleGlobalChange(groupKey, 'service_value', e.target.value)} className="w-full p-2 border rounded bg-transparent" /></div>
                    <div><label className="block text-sm mb-1">Loại thuế</label><select value={group.tax_type} onChange={e => handleGlobalChange(groupKey, 'tax_type', e.target.value)} className="w-full p-2 border rounded bg-transparent"><option value="fixed">Cố định</option><option value="percent">Phần trăm</option></select></div>
                    <div><label className="block text-sm mb-1">Giá trị thuế</label><input type="number" value={group.tax_value} onChange={e => handleGlobalChange(groupKey, 'tax_value', e.target.value)} className="w-full p-2 border rounded bg-transparent" /></div>
                    <div><label className="block text-sm mb-1">Tiền tệ</label><input type="text" value={group.currency || 'VND'} onChange={e => handleGlobalChange(groupKey, 'currency', e.target.value)} className="w-full p-2 border rounded bg-transparent" /></div>
                </div>
            </div>
        );
    };
    const renderAirlineFeeGroup = (code: string, name: string) => {
        const group = config.airlines[code] || config.domestic || config.default;
        return (
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-semibold text-lg mb-2">{name} ({code})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Loại phí DV</label>
                        <select value={group.service_type} onChange={e => handleAirlineChange(code, 'service_type', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                            <option value="fixed">Cố định (VNĐ)</option>
                            <option value="percent">Phần trăm (%)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Giá trị phí DV</label>
                        <input type="number" value={group.service_value} onChange={e => handleAirlineChange(code, 'service_value', e.target.value)} className="w-full p-2 border rounded bg-transparent border-gray-300 dark:border-gray-600" />
                    </div>
                    <div>
                        <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Loại thuế</label>
                        <select value={group.tax_type} onChange={e => handleAirlineChange(code, 'tax_type', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                            <option value="fixed">Cố định (VNĐ)</option>
                            <option value="percent">Phần trăm (%)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Giá trị thuế</label>
                        <input type="number" value={group.tax_value} onChange={e => handleAirlineChange(code, 'tax_value', e.target.value)} className="w-full p-2 border rounded bg-transparent border-gray-300 dark:border-gray-600" />
                    </div>
                </div>
            </div>
        );
    };
    return (
        <div className="space-y-6">
            {renderFeeInputGroup('default', 'Cấu hình Mặc định')}
            {renderFeeInputGroup('domestic', 'Cấu hình Quốc nội')}
            {renderFeeInputGroup('international', 'Cấu hình Quốc tế')}
            <h2 className="text-xl font-bold pt-4 border-t">Cấu hình riêng cho Hãng bay</h2>
            {renderAirlineFeeGroup('VN', 'Vietnam Airlines')}
            {renderAirlineFeeGroup('VJ', 'Vietjet Air')}
            {renderAirlineFeeGroup('QH', 'Bamboo Airways')}
            {renderAirlineFeeGroup('VU', 'Vietravel Airlines')}
            {renderAirlineFeeGroup('BL', 'Pacific Airlines')}
            <button onClick={handleSave} disabled={status === 'saving'} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">{status === 'saving' ? 'Đang lưu...' : status === 'saved' ? 'Đã lưu!' : 'Lưu Cấu hình'}</button>
        </div>
    );
};

// ... RevenueManager Component ... (Unchanged)
const RevenueManager: React.FC<{ bookings: BookingData[], feeConfig: AdminFeeConfig | null }> = ({ bookings, feeConfig }) => {
    // (Keep content unchanged)
    const [filter, setFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); 

    const processedData = useMemo(() => {
        return bookings.map(b => {
            const total = b.total_amount || 0;
            let profit = 0;
            
            if (b.flight && b.flight.flights && b.flight.flights.length > 0 && feeConfig) {
                const firstLeg = b.flight.flights[0];
                const lastLeg = b.flight.flights[b.flight.flights.length - 1];
                
                const adults = b.passengers.filter(p => p.type === 'Adult').length;
                const children = b.passengers.filter(p => p.type === 'Child').length;
                const infants = b.passengers.filter(p => p.type === 'Infant').length;
                const pax: Passengers = { adults, children, infants };

                const pricing = adminService.calculateAdditivePrice(
                    0, 
                    feeConfig, 
                    firstLeg.airline, 
                    firstLeg.departure_airport.id, 
                    lastLeg.arrival_airport.id, 
                    pax
                );
                profit = pricing.serviceFee;
            }

            if (b.status === 'cancelled') {
                profit = 0;
            }

            const net = total - profit;

            return {
                ...b,
                calculatedNet: net,
                calculatedProfit: profit
            };
        });
    }, [bookings, feeConfig]);

    const filteredData = useMemo(() => {
        return processedData.filter(b => {
            const matchesText = !filter || 
                b.pnr?.toLowerCase().includes(filter.toLowerCase()) || 
                b.contact?.fullName?.toLowerCase().includes(filter.toLowerCase());
            
            const bookingMonth = new Date(b.bookingTimestamp).toISOString().slice(0, 7);
            const matchesMonth = !monthFilter || bookingMonth === monthFilter;

            return matchesText && matchesMonth;
        }).sort((a, b) => new Date(b.bookingTimestamp).getTime() - new Date(a.bookingTimestamp).getTime());
    }, [processedData, filter, monthFilter]);

    const stats = useMemo(() => {
        const validBookings = filteredData.filter(b => b.status !== 'cancelled' && (b.payment_status === 'paid' || b.status === 'confirmed'));
        const totalRevenue = validBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const totalProfit = validBookings.reduce((sum, b) => sum + b.calculatedProfit, 0);
        const totalNet = totalRevenue - totalProfit;
        return { totalRevenue, totalProfit, totalNet, count: validBookings.length };
    }, [filteredData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Tháng:</span>
                    <input 
                        type="month" 
                        value={monthFilter} 
                        onChange={e => setMonthFilter(e.target.value)} 
                        className="p-2 border rounded bg-transparent dark:border-gray-600 dark:text-white focus:ring-blue-500"
                    />
                </div>
                <div className="relative flex-grow w-full sm:w-auto">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Tìm theo PNR hoặc Tên khách..." 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)} 
                        className="w-full pl-9 p-2 border rounded bg-transparent dark:border-gray-600 dark:text-white focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center">
                    <h3 className="text-blue-800 dark:text-blue-300 font-bold text-sm uppercase mb-1">Tổng Doanh Thu (Giá bán)</h3>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.totalRevenue)}</div>
                    <div className="text-xs text-blue-500 mt-1">{stats.count} đơn hàng thành công</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800 flex flex-col items-center justify-center">
                    <h3 className="text-orange-800 dark:text-orange-300 font-bold text-sm uppercase mb-1">Tổng Giá Nét (Trả Hãng)</h3>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(stats.totalNet)}</div>
                    <div className="text-xs text-orange-500 mt-1">Chi phí ước tính</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 flex flex-col items-center justify-center">
                    <h3 className="text-green-800 dark:text-green-300 font-bold text-sm uppercase mb-1">Tổng Lợi Nhuận</h3>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalProfit)}</div>
                    <div className="text-xs text-green-500 mt-1">Dựa trên cấu hình phí</div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-3 border-b dark:border-gray-600">Ngày đặt</th>
                                <th className="p-3 border-b dark:border-gray-600">PNR / ID</th>
                                <th className="p-3 border-b dark:border-gray-600">Hãng bay</th>
                                <th className="p-3 border-b dark:border-gray-600">Trạng thái</th>
                                <th className="p-3 border-b dark:border-gray-600 text-right">Tổng thu</th>
                                <th className="p-3 border-b dark:border-gray-600 text-right text-orange-600">Giá nét hãng</th>
                                <th className="p-3 border-b dark:border-gray-600 text-right text-green-600">Lợi nhuận</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredData.length > 0 ? filteredData.map(b => {
                                const isCancelled = b.status === 'cancelled';
                                const isUnpaid = b.payment_status !== 'paid' && b.status !== 'confirmed' && b.status !== 'paid';
                                const rowOpacity = isCancelled ? 'opacity-50 bg-red-50 dark:bg-red-900/10' : (isUnpaid ? 'opacity-70' : '');
                                
                                return (
                                    <tr key={b.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${rowOpacity}`}>
                                        <td className="p-3 whitespace-nowrap text-gray-500">{new Date(b.bookingTimestamp).toLocaleDateString('vi-VN')}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-blue-600">{b.pnr}</div>
                                            <div className="text-xs text-gray-400">{b.id}</div>
                                        </td>
                                        <td className="p-3">
                                            {b.flight?.flights?.[0] ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={b.flight.flights[0].airline_logo} className="h-5 w-5 object-contain" alt=""/>
                                                    <span className="font-medium">{b.flight.flights[0].airline}</span>
                                                </div>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="p-3">
                                            {isCancelled ? <span className="text-red-600 font-bold text-xs">Đã hủy</span> : 
                                             b.payment_status === 'paid' ? <span className="text-green-600 font-bold text-xs">Đã thanh toán</span> : 
                                             <span className="text-yellow-600 font-bold text-xs">Chờ thanh toán</span>}
                                        </td>
                                        <td className="p-3 text-right font-bold text-gray-800 dark:text-white">
                                            {formatCurrency(b.total_amount || 0)}
                                        </td>
                                        <td className="p-3 text-right font-medium text-orange-600">
                                            {formatCurrency(b.calculatedNet)}
                                        </td>
                                        <td className="p-3 text-right font-bold text-green-600">
                                            {formatCurrency(b.calculatedProfit)}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500 italic">Không tìm thấy dữ liệu phù hợp.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ... FooterEditor Component ... (Unchanged)
const FooterEditor: React.FC = () => {
    // (Keep content unchanged)
    const [columns, setColumns] = useState<FooterColumn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedCols, setExpandedCols] = useState<string[]>([]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getFooterConfig();
            setColumns(data);
            setExpandedCols(data.map(c => c.id));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSave = async (silent = false) => {
        setIsSaving(true);
        try {
            const result = await adminService.updateFooterConfig(columns);
            if (!silent) {
                if (result.success) alert(`✅ ${result.message}`);
                else alert(`❌ ${result.message}`);
            }
            return result.success;
        } catch (e) {
            if (!silent) alert('❌ Có lỗi xảy ra khi kết nối đến server.');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetToDefault = async () => {
        if (confirm('Hành động này sẽ GHI ĐÈ toàn bộ cấu hình hiện tại bằng dữ liệu Mặc định Chuẩn (3 cột). Bạn có chắc chắn?')) {
            setColumns(INITIAL_FOOTER_CONFIG);
            setIsSaving(true);
            try {
                await adminService.updateFooterConfig(INITIAL_FOOTER_CONFIG);
                setExpandedCols(INITIAL_FOOTER_CONFIG.map(c => c.id));
                alert('✅ Đã khôi phục về mặc định chuẩn.');
            } catch (e) {
                alert('❌ Lỗi khi lưu mặc định.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleDeleteConfig = async () => {
        if (confirm('Bạn có chắc chắn muốn XÓA (ẩn) cấu hình Footer trên server?')) {
            setIsSaving(true);
            const result = await adminService.deleteFooterConfig();
            setIsSaving(false);
            if (result.success) {
                alert(result.message);
                setColumns([]); 
            } else {
                alert(result.message);
            }
        }
    };

    const handleRestoreConfig = async () => {
        if (confirm('Khôi phục cấu hình đã xóa (nếu có)?')) {
            setIsSaving(true);
            const result = await adminService.restoreFooterConfig();
            setIsSaving(false);
            if (result.success) {
                alert(result.message);
                await loadData(); 
            } else {
                alert(result.message);
            }
        }
    };

    const toggleCol = (id: string) => {
        setExpandedCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const addColumn = () => {
        const newId = `col-${Date.now()}`;
        setColumns([...columns, { id: newId, title: 'Tiêu đề mới', links: [] }]);
        setExpandedCols(prev => [...prev, newId]);
    };

    const deleteColumn = (id: string) => {
        if (confirm('Xóa cột này khỏi danh sách? (Cần bấm Lưu để áp dụng)')) {
            setColumns(columns.filter(c => c.id !== id));
        }
    };

    const updateColumnTitle = (id: string, newTitle: string) => {
        setColumns(columns.map(c => c.id === id ? { ...c, title: newTitle } : c));
    };

    const addLink = (colId: string) => {
        setColumns(columns.map(c => {
            if (c.id === colId) {
                return { 
                    ...c, 
                    links: [...c.links, { id: `link-${Date.now()}`, label: 'Link mới', url: '#', icon: 'CheckCircleIcon', target: '_self' }] 
                };
            }
            return c;
        }));
    };

    const deleteLink = (colId: string, linkId: string) => {
        setColumns(columns.map(c => {
            if (c.id === colId) {
                return { ...c, links: c.links.filter(l => l.id !== linkId) };
            }
            return c;
        }));
    };

    const updateLink = (colId: string, linkId: string, field: keyof FooterLink, value: string) => {
        setColumns(columns.map(c => {
            if (c.id === colId) {
                return {
                    ...c,
                    links: c.links.map(l => l.id === linkId ? { ...l, [field]: value } : l)
                };
            }
            return c;
        }));
    };

    if (isLoading) return <div className="p-8 text-center">Đang tải cấu hình Footer...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileTextIcon className="w-6 h-6 text-blue-600"/> Quản lý Footer
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        Chỉnh sửa các cột liên kết ở chân trang. Nhớ bấm <b>Lưu thay đổi</b> sau khi chỉnh sửa.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleSave(false)} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow flex items-center gap-2 font-bold transition-colors">
                        {isSaving ? 'Đang lưu...' : <><CheckCircleIcon className="w-5 h-5" /> Lưu thay đổi</>}
                    </button>
                    
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block"></div>

                    <button onClick={handleResetToDefault} className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 shadow flex items-center gap-2 text-sm transition-colors" title="Ghi đè bằng dữ liệu chuẩn">
                        <RefreshIcon className="w-4 h-4" /> Reset Mặc định
                    </button>
                    <button onClick={handleDeleteConfig} className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 shadow flex items-center gap-2 text-sm transition-colors" title="Soft Delete trên server">
                        <TrashIcon className="w-4 h-4" /> Xóa Config (Server)
                    </button>
                    <button onClick={handleRestoreConfig} className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 shadow flex items-center gap-2 text-sm transition-colors" title="Khôi phục Soft Delete">
                        <RefreshIcon className="w-4 h-4" /> Khôi phục (Server)
                    </button>
                </div>
            </div>

            {columns.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                    <p className="text-gray-500 text-lg mb-4">Hiện không có cột nào hiển thị (Footer trống).</p>
                    <button onClick={addColumn} className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 font-semibold shadow transition-transform hover:scale-105">
                        + Thêm Cột Đầu Tiên
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {columns.map((col) => {
                        const isExpanded = expandedCols.includes(col.id);
                        return (
                        <div key={col.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <button onClick={() => toggleCol(col.id)} className="text-gray-500 hover:text-blue-600 transition-colors p-1">
                                    <ChevronDownIcon className={`w-5 h-5 transform transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                </button>
                                <div className="flex-grow">
                                    <input 
                                        type="text" 
                                        value={col.title} 
                                        onChange={e => updateColumnTitle(col.id, e.target.value)} 
                                        className="font-bold text-md w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white placeholder-gray-400 p-0"
                                        placeholder="Tiêu đề cột..."
                                    />
                                </div>
                                <button onClick={() => deleteColumn(col.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Xóa cột này">
                                    <CloseIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
                                    {col.links.length === 0 && (
                                        <p className="text-center text-gray-400 text-xs py-4 italic border border-dashed border-gray-200 rounded">Chưa có liên kết.</p>
                                    )}
                                    {col.links.map(link => {
                                        const SelectedIcon = ICON_MAP[link.icon || 'CheckCircleIcon'] || CheckCircleIcon;
                                        return (
                                        <div key={link.id} className="group flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors relative">
                                            <button onClick={() => deleteLink(col.id, link.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Xóa link">
                                                <CloseIcon className="w-4 h-4" />
                                            </button>

                                            <div className="flex gap-2 items-center pr-6">
                                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300">
                                                    <SelectedIcon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-grow">
                                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-0.5">Tên hiển thị</label>
                                                    <input 
                                                        type="text" 
                                                        value={link.label} 
                                                        onChange={e => updateLink(col.id, link.id, 'label', e.target.value)}
                                                        className="w-full p-1 border-b border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:border-blue-500 focus:outline-none font-medium"
                                                        placeholder="Ví dụ: Trang chủ"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <div className="flex-grow">
                                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-0.5">Đường dẫn (URL)</label>
                                                    <input 
                                                        type="text" 
                                                        value={link.url} 
                                                        onChange={e => updateLink(col.id, link.id, 'url', e.target.value)}
                                                        className="w-full p-1 border-b border-gray-300 dark:border-gray-600 bg-transparent text-xs text-blue-600 focus:border-blue-500 focus:outline-none"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <div className="w-1/2">
                                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-0.5">Icon</label>
                                                    <select 
                                                        value={link.icon} 
                                                        onChange={e => updateLink(col.id, link.id, 'icon', e.target.value)}
                                                        className="w-full p-1 border border-gray-200 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 focus:outline-none"
                                                    >
                                                        {Object.keys(ICON_MAP).map(iconName => (
                                                            <option key={iconName} value={iconName}>{iconName.replace('Icon', '')}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="w-1/2">
                                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-0.5">Mở tại</label>
                                                    <select 
                                                        value={link.target || '_self'} 
                                                        onChange={e => updateLink(col.id, link.id, 'target', e.target.value)}
                                                        className="w-full p-1 border border-gray-200 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 focus:outline-none"
                                                    >
                                                        <option value="_self">Tab hiện tại</option>
                                                        <option value="_blank">Tab mới (New)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                    
                                    <button onClick={() => addLink(col.id)} className="w-full py-2 mt-2 border border-dashed border-gray-300 hover:border-blue-500 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-xs font-bold uppercase flex justify-center items-center gap-2 transition-all">
                                        <PlusIcon className="w-4 h-4" /> Thêm Liên Kết
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})}
                    
                    <button onClick={addColumn} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 transition-all min-h-[200px]">
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3 group-hover:bg-white">
                            <PlusIcon className="w-8 h-8" />
                        </div>
                        <span className="font-bold">Thêm Cột Mới</span>
                    </button>
                </div>
            )}
        </div>
    );
};

// ... FlightDepartureBoard, FlightScheduleModal, DelayedFlightsMonitor Components ... (Unchanged)
// (Content omitted for brevity, assuming unchanged from previous file)
const FlightDepartureBoard: React.FC<{ flights: FlightTrackingInfo[] }> = ({ flights }) => {
    return (
        <div className="overflow-hidden rounded-xl border-4 border-gray-800 bg-black shadow-2xl text-yellow-400 font-mono">
            <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl md:text-3xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                    <PlaneTakeoffIcon className="w-8 h-8 text-yellow-500" />
                    KHỞI HÀNH / DEPARTURES
                </h2>
                <div className="text-right">
                    <div className="text-sm text-gray-400">LOCAL TIME / GIỜ ĐỊA PHƯƠNG</div>
                    <div className="text-xl font-bold text-white tabular-nums">
                        {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800 text-yellow-600 uppercase text-xs md:text-sm tracking-wider">
                        <tr>
                            <th className="p-3 w-24">DATE<br/><span className="text-[10px] text-gray-400">NGÀY</span></th>
                            <th className="p-3 w-24">TIME<br/><span className="text-[10px] text-gray-400">GIỜ</span></th>
                            <th className="p-3 w-24">FLIGHT<br/><span className="text-[10px] text-gray-400">CHUYẾN</span></th>
                            <th className="p-3">ORIGIN<br/><span className="text-[10px] text-gray-400">KHỞI HÀNH</span></th>
                            <th className="p-3">DESTINATION<br/><span className="text-[10px] text-gray-400">ĐIỂM ĐẾN</span></th>
                            <th className="p-3 w-32">AIRLINE<br/><span className="text-[10px] text-gray-400">HÃNG</span></th>
                            <th className="p-3 w-16 text-center">GATE<br/><span className="text-[10px] text-gray-400">CỔNG</span></th>
                            <th className="p-3 w-48 text-right">STATUS<br/><span className="text-[10px] text-gray-400">TRẠNG THÁI</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {flights.map((flight, idx) => {
                            const depTime = new Date(flight.departure.time);
                            const timeStr = depTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                            const dateStr = depTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const cleanNote = getCleanDelayStatus(flight.fullBookingData?.admin_note || '');
                            
                            let statusClass = "text-yellow-400";
                            let rowClass = "";
                            let statusLabel = flight.statusLabel;
                            const status = flight.status;

                            if (status === 'BOARDING') { statusClass = "text-orange-500 animate-pulse font-bold text-lg tracking-widest"; } 
                            else if (status === 'LANDING') { statusClass = "text-purple-400 animate-pulse font-bold"; } 
                            else if (status === 'DEPARTED') { statusClass = "text-green-500 font-semibold"; } 
                            else if (status === 'CANCELLED') { statusClass = "text-red-600 font-bold bg-red-900/20 px-2 rounded"; rowClass="bg-red-900/10"; } 
                            else if (status === 'DELAYED' || cleanNote) { statusClass = "text-red-500 animate-pulse font-bold"; statusLabel = "DELAYED / HOÃN"; } 
                            else if (status === 'CHECK_IN') { statusClass = "text-blue-400"; } 
                            else if (status === 'ARRIVED') { statusClass = "text-green-500 font-bold"; statusLabel = "COMPLETED / HOÀN THÀNH"; }

                            return (
                                <tr key={idx} className={`hover:bg-gray-900 transition-colors ${rowClass}`}>
                                    <td className="p-3 text-gray-300 font-semibold text-xs">{dateStr}</td>
                                    <td className="p-3 text-white font-bold"><div className="text-lg leading-none">{timeStr}</div></td>
                                    <td className="p-3 text-yellow-200">{flight.flightNumber.replace(flight.airline, '').trim()}</td>
                                    <td className="p-3">
                                        <div className="font-bold text-white tracking-wide">{flight.departure.airport}</div>
                                        <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">{getCityName(flight.departure.airport)}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold text-xl text-yellow-500 tracking-wide">{flight.arrival.airport}</div>
                                        <div className="text-xs text-white/70 uppercase tracking-wider font-semibold">{getCityName(flight.arrival.airport)}</div>
                                    </td>
                                    <td className="p-3 text-gray-400 text-xs uppercase">
                                        <div className="flex items-center gap-2">
                                            {flight.airlineLogo && <img src={flight.airlineLogo} className="w-6 h-6 object-contain bg-white rounded p-0.5" alt={flight.airline} />}
                                            <span className="hidden md:inline">{flight.airline}</span>
                                            <span className="md:hidden">{flight.airline.substring(0, 2)}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-yellow-400 font-bold">{flight.departure.gate}</td>
                                    <td className={`p-3 text-right font-bold uppercase tracking-wide ${statusClass}`}>
                                        <div>{statusLabel}</div>
                                        {cleanNote && <div className="text-[10px] text-red-400 normal-case font-normal mt-1 animate-pulse">{cleanNote}</div>}
                                    </td>
                                </tr>
                            );
                        })}
                        {flights.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500 italic">NO FLIGHTS SCHEDULED / KHÔNG CÓ CHUYẾN BAY</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FlightScheduleModal: React.FC<{ flight: FlightTrackingInfo; onClose: () => void; onSuccess: () => void; fetchData: () => void; }> = ({ flight, onClose, onSuccess, fetchData }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [originalDuration, setOriginalDuration] = useState(0);
    const [originalDepTime, setOriginalDepTime] = useState<number>(0);
    const [previewArrivalTime, setPreviewArrivalTime] = useState('');
    const [delayPreview, setDelayPreview] = useState('');

    useEffect(() => {
        const timeStr = flight.departure.time.replace(' ', 'T');
        const d = new Date(timeStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setDate(`${y}-${m}-${day}`);
        setTime(`${h}:${min}`);
        const originalTimestamp = new Date(y, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime();
        setOriginalDepTime(originalTimestamp);
        const arrTimeStr = flight.arrival.time.replace(' ', 'T');
        const dArr = new Date(arrTimeStr);
        const arrTimestamp = new Date(dArr.getFullYear(), dArr.getMonth(), dArr.getDate(), dArr.getHours(), dArr.getMinutes()).getTime();
        setOriginalDuration(arrTimestamp - originalTimestamp);
    }, [flight]);

    useEffect(() => {
        if(date && time && originalDuration > 0) {
            const [y, m, d] = date.split('-').map(Number);
            const [h, min] = time.split(':').map(Number);
            const newDep = new Date(y, m - 1, d, h, min);
            const newDepTimestamp = newDep.getTime();
            if (!isNaN(newDepTimestamp)) {
                const newArr = new Date(newDepTimestamp + originalDuration);
                setPreviewArrivalTime(newArr.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }));
                const diffMs = newDepTimestamp - originalDepTime;
                const diffMins = Math.floor(diffMs / 60000);
                let previewText = "Đúng giờ / On Time";
                if (Math.abs(diffMins) > 0) {
                    const absMins = Math.abs(diffMins);
                    const hours = Math.floor(absMins / 60);
                    const mins = absMins % 60;
                    let durationStr = "";
                    if (hours > 0) durationStr += `${hours}h `;
                    if (mins > 0) durationStr += `${mins}p`;
                    if (hours === 0 && mins === 0) durationStr = "0p"; 
                    if (diffMins > 0) previewText = `Delay ${durationStr}`;
                    else previewText = `Sớm ${durationStr}`;
                    const oldDateStr = new Date(originalDepTime).toLocaleDateString('vi-VN');
                    const newDateStr = newDep.toLocaleDateString('vi-VN');
                    if (oldDateStr !== newDateStr) previewText += ` (Đổi ngày: ${newDateStr})`;
                }
                setDelayPreview(previewText);
            }
        }
    }, [date, time, originalDuration, originalDepTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        const newDateTimeISO = `${date}T${time}:00`; 
        const [y, m, d] = date.split('-').map(Number);
        const [h, min] = time.split(':').map(Number);
        const newDepTimestamp = new Date(y, m - 1, d, h, min).getTime();
        const safeDuration = originalDuration > 0 ? originalDuration : 7200000;
        const newArrTimestamp = newDepTimestamp + safeDuration;
        const newArrDate = new Date(newArrTimestamp);
        const newArrivalTime = `${newArrDate.getFullYear()}-${String(newArrDate.getMonth() + 1).padStart(2, '0')}-${String(newArrDate.getDate()).padStart(2, '0')} ${String(newArrDate.getHours()).padStart(2, '0')}:${String(newArrDate.getMinutes()).padStart(2, '0')}:00`;

        const diffMs = newDepTimestamp - originalDepTime;
        const diffMins = Math.floor(diffMs / 60000);
        let delayNote = "";
        if (Math.abs(diffMins) > 0) {
            const absMins = Math.abs(diffMins);
            const hours = Math.floor(absMins / 60);
            const mins = absMins % 60;
            let durationStr = "";
            if (hours > 0) durationStr += `${hours}h `;
            if (mins > 0) durationStr += `${mins}p`;
            if (diffMins > 0) delayNote = `Delay ${durationStr}`;
            else delayNote = `Sớm ${durationStr}`;
            const oldDateStr = new Date(originalDepTime).toLocaleDateString('vi-VN');
            const newDateStr = new Date(newDepTimestamp).toLocaleDateString('vi-VN');
            if (oldDateStr !== newDateStr) delayNote += ` - ${newDateStr}`;
        }
        let finalNote = delayNote;
        if (reason) finalNote = finalNote ? `${finalNote} (${reason})` : reason;

        const result = await adminService.updateFlightSchedule(flight.bookingId, flight.legIndex, newDateTimeISO, newArrivalTime);
        if (result.success || result) { 
            if (finalNote) await adminService.updateBookingStatus(flight.bookingId, 'delayed', finalNote); 
            else if (!finalNote && flight.status === 'DELAYED') await adminService.updateBookingStatus(flight.bookingId, 'confirmed', '');
            if (flight.fullBookingData) {
                const updatedBooking = JSON.parse(JSON.stringify(flight.fullBookingData));
                if (updatedBooking.bookingDetails?.selected_flights?.[flight.legIndex]?.flights?.[0]) {
                    const leg = updatedBooking.bookingDetails.selected_flights[flight.legIndex];
                    const flightSegment = leg.flights[0];
                    flightSegment.departure_airport.time = newDateTimeISO;
                    const lastFlightIndex = leg.flights.length - 1;
                    if (lastFlightIndex === 0) flightSegment.arrival_airport.time = newArrivalTime;
                    else leg.flights[lastFlightIndex].arrival_airport.time = newArrivalTime;
                    updatedBooking.admin_note = finalNote;
                    await emailService.sendConfirmationEmail(updatedBooking);
                }
            }
            alert(`Cập nhật thành công!\n${finalNote || 'Đúng giờ'}\nĐã gửi email thông báo cho khách hàng.`);
            if (fetchData) fetchData();
            onSuccess();
            onClose();
        } else {
            alert('Cập nhật thất bại: ' + (result.message || 'Lỗi không xác định'));
        }
        setIsUpdating(false);
    };

    const formatDuration = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${h} giờ ${m} phút`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[150] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Cập nhật Lịch bay / Delay</h3>
                <p className="text-sm text-gray-500 mb-2">Chuyến bay: <b>{flight.flightNumber}</b> ({flight.departure.airport} &rarr; {flight.arrival.airport})</p>
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm space-y-1">
                    <div className="flex justify-between"><span>Thời gian bay gốc:</span> <span className="font-bold">{formatDuration(originalDuration)}</span></div>
                    <div className="flex justify-between text-blue-600 dark:text-blue-400"><span>Giờ đến dự kiến mới:</span> <span className="font-bold">{previewArrivalTime || '...'}</span></div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 dark:border-gray-600"><span>Trạng thái thay đổi:</span><span className={`font-bold ${delayPreview.includes('Delay') ? 'text-red-600' : delayPreview.includes('Sớm') ? 'text-green-600' : 'text-gray-600'}`}>{delayPreview}</span></div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Ngày khởi hành mới</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded bg-transparent" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Giờ khởi hành mới</label><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border rounded bg-transparent" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Lý do thay đổi (Tùy chọn)</label><input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ví dụ: Delay do thời tiết" className="w-full p-2 border rounded bg-transparent" /></div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300"><InfoIcon className="w-4 h-4 inline mr-1" /> Hệ thống sẽ tự động tính toán thời gian delay và tạo ghi chú "Delay X phút" để hiển thị trên bảng điện tử.</div>
                    <div className="flex justify-end gap-2 mt-6"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Hủy</button><button type="submit" disabled={isUpdating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{isUpdating ? 'Đang xử lý...' : 'Cập nhật & Gửi Email'}</button></div>
                </form>
            </div>
        </div>
    );
};

const DelayedFlightsMonitor: React.FC = () => {
    const [delayedFlights, setDelayedFlights] = useState<AviationStackFlight[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const fetchDelays = async () => {
            setLoading(true);
            try {
                const data = await liveFlightService.getDelayedFlights();
                setDelayedFlights(data);
            } catch (e) { console.error("Error fetching delay monitor:", e); } finally { setLoading(false); }
        };
        fetchDelays();
        const interval = setInterval(fetchDelays, 300000);
        return () => clearInterval(interval);
    }, []);
    if (loading && delayedFlights.length === 0) return <div className="p-4 text-xs text-gray-500 animate-pulse">Checking for delays...</div>;
    if (delayedFlights.length === 0) return null;
    return (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <h4 className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2"><InfoIcon className="w-4 h-4" /> CẢNH BÁO DELAY (Toàn mạng bay VN)</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
                {delayedFlights.map((f, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-700 dark:text-gray-300 border-b border-red-100 dark:border-red-800/50 pb-1 last:border-0"><span className="font-bold w-16">{f.flight.iata}</span><span className="truncate w-24">{f.departure.iata} &rarr; {f.arrival.iata}</span><span className="text-red-600 font-bold">+{f.departure.delay}m</span></div>
                ))}
            </div>
        </div>
    );
};

const FlightTrackerView: React.FC<{ bookings: BookingData[], fetchData: () => void }> = ({ bookings, fetchData }) => {
    const [activeFlights, setActiveFlights] = useState<FlightTrackingInfo[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState<FlightTrackingInfo | null>(null);
    const [isLiveSyncing, setIsLiveSyncing] = useState(false);
    const [viewingLiveFlight, setViewingLiveFlight] = useState<AviationStackFlight | null>(null);
    // NEW: State for Global Map
    const [showGlobalRadar, setShowGlobalRadar] = useState(false);
    const [liveFlightsForMap, setLiveFlightsForMap] = useState<AviationStackFlight[]>([]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Fetch live flights data for global radar when modal opens or periodically
    const fetchGlobalRadarData = async () => {
        try {
            const data = await liveFlightService.fetchCombinedFlights();
            setLiveFlightsForMap(data);
        } catch(e) {
            console.error("Error fetching global radar data", e);
        }
    };

    useEffect(() => {
        if(showGlobalRadar) {
            fetchGlobalRadarData();
            const interval = setInterval(fetchGlobalRadarData, 30000); // 30s update
            return () => clearInterval(interval);
        }
    }, [showGlobalRadar]);

    useEffect(() => {
        const initialTracked = trackingService.getActiveflights(bookings);
        setActiveFlights(initialTracked);
        const syncRealData = async () => {
            const now = Date.now();
            let hasUpdates = false;
            const updatedFlights = [...initialTracked];
            const activeWindowFlights = updatedFlights.filter(f => {
                const depTime = new Date(f.departure.time).getTime();
                const diffHours = (depTime - now) / 3600000;
                return diffHours > -4 && diffHours < 12 && !f.fullBookingData?.status?.includes('cancelled');
            });
            if (activeWindowFlights.length === 0) return;
            setIsLiveSyncing(true);
            for (const flight of activeWindowFlights) {
                try {
                    const flightDate = new Date(flight.departure.time).toISOString().split('T')[0];
                    const numMatch = flight.flightNumber.match(/\d+/);
                    const flightNumberOnly = numMatch ? numMatch[0] : '';
                    const airlineCode = getAirlineCodeHelper(flight.airline);
                    
                    let fullFlightNum = '';
                    if (flightNumberOnly && airlineCode) {
                        fullFlightNum = `${airlineCode}${flightNumberOnly}`;
                    } else {
                        fullFlightNum = flight.flightNumber.replace(flight.airline, '').replace(/\s+/g,'').toUpperCase();
                    }
                    
                    if (!/^[A-Z0-9]{2,3}\d{1,4}$/.test(fullFlightNum)) {
                         fullFlightNum = fullFlightNum.replace(/[^A-Z0-9]/g, '');
                    }

                    const realData = await liveFlightService.syncSingleFlight(fullFlightNum, flightDate);
                    if (realData) {
                        const idx = updatedFlights.findIndex(f => f.bookingId === flight.bookingId && f.legIndex === flight.legIndex);
                        if (idx !== -1) {
                            if (realData.departure.gate) updatedFlights[idx].departure.gate = realData.departure.gate;
                            if (realData.departure.terminal) updatedFlights[idx].departure.terminal = realData.departure.terminal;
                            
                            if (realData.arrival.terminal) updatedFlights[idx].arrival.terminal = realData.arrival.terminal;
                            if (realData.arrival.gate) updatedFlights[idx].arrival.gate = realData.arrival.gate;
                            if (realData.arrival.baggage) updatedFlights[idx].arrival.belt = realData.arrival.baggage;

                            const delayMins = realData.departure.delay || 0;
                            if (delayMins > 15) {
                                updatedFlights[idx].statusLabel = `DELAYED: ${delayMins}m`;
                                updatedFlights[idx].color = 'text-red-500 font-bold border border-red-500 px-1 rounded animate-pulse';
                                updatedFlights[idx].status = 'DELAYED';
                            }
                            if (realData.live) (updatedFlights[idx] as any).liveData = realData;
                            (updatedFlights[idx] as any).isLive = true;
                            hasUpdates = true;
                        }
                    }
                } catch (e) { console.warn("Failed to sync flight:", flight.flightNumber); }
            }
            if (hasUpdates) {
                setActiveFlights(updatedFlights);
                if (selectedFlight) {
                    const updatedSel = updatedFlights.find(f => f.bookingId === selectedFlight.bookingId && f.legIndex === selectedFlight.legIndex);
                    if (updatedSel) setSelectedFlight(updatedSel);
                }
            }
            setIsLiveSyncing(false);
        };
        const t = setTimeout(syncRealData, 2000);
        return () => clearTimeout(t);
    }, [bookings]);

    useEffect(() => {
        if (viewingLiveFlight && activeFlights.length > 0) {
            const relevantFlight = activeFlights.find(f => {
                const liveData = (f as any).liveData as AviationStackFlight | undefined;
                return liveData && liveData.flight.iata === viewingLiveFlight.flight.iata;
            });
            if (relevantFlight) {
                const newLiveData = (relevantFlight as any).liveData as AviationStackFlight;
                if (JSON.stringify(newLiveData.live) !== JSON.stringify(viewingLiveFlight.live)) {
                    setViewingLiveFlight(newLiveData);
                }
            }
        }
    }, [activeFlights, viewingLiveFlight]);

    useEffect(() => {
        if (!selectedFlight && activeFlights.length > 0) setSelectedFlight(activeFlights[0]);
    }, [activeFlights]);

    const handleSendUpdateEmail = async () => {
        if(!selectedFlight) return;
        if(!confirm(`Gửi email cập nhật trạng thái "${selectedFlight.statusLabel}" cho khách hàng?`)) return;
        const booking = bookings.find(b => b.id === selectedFlight.bookingId);
        if (booking) {
            const bookingPayload = { ...booking, status: 'confirmed' };
            await emailService.sendConfirmationEmail(bookingPayload); 
            alert('Đã gửi email cập nhật thành công.');
        }
    };

    const handleSendThankYouEmail = async () => {
        if(!selectedFlight) return;
        if(!confirm(`Gửi thư cảm ơn cho khách hàng của chuyến bay ${selectedFlight.flightNumber}?`)) return;
        const booking = bookings.find(b => b.id === selectedFlight.bookingId);
        if(booking) {
            await emailService.sendThankYouEmail(booking);
            alert('Đã gửi thư cảm ơn thành công!');
        }
    };

    return (
        <div className="space-y-8">
            {scheduleModalOpen && selectedFlight && (
                <FlightScheduleModal flight={selectedFlight} onClose={() => setScheduleModalOpen(false)} fetchData={fetchData} onSuccess={() => {}} />
            )}
            
            {/* Single Flight Map View */}
            {viewingLiveFlight && (
                <div className="fixed inset-0 z-[200]">
                    <FlightMapView flight={viewingLiveFlight} onBack={() => setViewingLiveFlight(null)} />
                </div>
            )}

            {/* Global Radar Map View */}
            {showGlobalRadar && (
                <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col">
                    <div className="bg-gray-800 p-2 flex justify-between items-center z-10 shadow-md">
                        <h3 className="text-white font-bold flex items-center gap-2"><RadarIcon className="w-5 h-5 text-green-500"/> Global Radar (Live)</h3>
                        <button onClick={() => setShowGlobalRadar(false)} className="text-white hover:text-red-500 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Đóng</button>
                    </div>
                    <div className="flex-grow relative">
                        <TrafficMap flights={liveFlightsForMap} onSelect={(f) => setViewingLiveFlight(f)} />
                        {liveFlightsForMap.length === 0 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-black/70 text-white px-4 py-2 rounded animate-pulse">Loading live traffic...</div></div>}
                    </div>
                </div>
            )}

            <div className="relative">
                {isLiveSyncing && <div className="absolute top-2 right-2 bg-black/70 text-green-400 text-xs px-2 py-1 rounded flex items-center gap-1 z-10 animate-pulse"><WifiIcon className="w-3 h-3" /> Syncing Live Data...</div>}
                <FlightDepartureBoard flights={activeFlights} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><RadarIcon className="w-5 h-5 text-blue-600" /> Theo dõi chi tiết</h3>
                        <button 
                            onClick={() => setShowGlobalRadar(true)} 
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                        >
                            <RadarIcon className="w-3 h-3"/> Bản đồ Radar (Live)
                        </button>
                    </div>
                    <div className="px-4"><DelayedFlightsMonitor /></div>
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {activeFlights.map((flight, idx) => {
                            const cleanNote = getCleanDelayStatus(flight.fullBookingData?.admin_note || '');
                            const isLive = (flight as any).isLive;
                            return (
                            <div key={`${flight.bookingId}-${idx}`} onClick={() => setSelectedFlight(flight)} className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-gray-700 ${selectedFlight?.bookingId === flight.bookingId && selectedFlight?.legIndex === flight.legIndex ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {flight.airlineLogo && <img src={flight.airlineLogo} className="w-8 h-8 object-contain bg-white rounded-full border border-gray-200 p-0.5" alt="" />}
                                        <div>
                                            <div className="font-bold text-gray-800 dark:text-white flex items-center gap-1">{flight.flightNumber}{isLive && <span title="Live Data Synced"><WifiIcon className="w-3 h-3 text-green-500" /></span>}</div>
                                            <div className="text-[10px] text-gray-500 flex gap-1"><span>{flight.airline}</span><span className={`px-1 rounded ${flight.legType === 'Outbound' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{flight.legType === 'Outbound' ? 'Đi' : 'Về'}</span></div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 ${flight.color} text-right max-w-[120px] truncate`}>{flight.statusLabel}</span>
                                        {cleanNote && <div className="text-[9px] text-red-500 font-bold mt-0.5 animate-pulse truncate max-w-[80px]">CHANGED</div>}
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2 pl-10"><span>{getCityName(flight.departure.airport)} ({flight.departure.airport}) &rarr; {getCityName(flight.arrival.airport)} ({flight.arrival.airport})</span><span>{new Date(flight.departure.time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span></div>
                            </div>
                        )})}
                    </div>
                </div>
                <div className="lg:col-span-2">
                    {selectedFlight ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-3">
                                        {selectedFlight.airlineLogo && <img src={selectedFlight.airlineLogo} className="w-12 h-12 object-contain" alt="" />}
                                        <div>
                                            <div className="flex items-center gap-2">{selectedFlight.flightNumber}{(selectedFlight as any).isLive && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200" title="Live Data Synced"><WifiIcon className="w-3 h-3" /> Live Data</span>}</div>
                                            <span className="text-sm text-gray-500 font-normal bg-gray-100 px-2 py-1 rounded block mt-1 w-fit">PNR: {selectedFlight.pnr}</span>
                                        </div>
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 mt-1 font-medium">{selectedFlight.airline} • {new Date(selectedFlight.departure.time).toLocaleDateString('vi-VN', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${selectedFlight.color}`}>{selectedFlight.statusLabel}</div>
                                    <div className="text-sm text-gray-500">{selectedFlight.timeRemaining}</div>
                                    {(() => {
                                        const cleanNote = getCleanDelayStatus(selectedFlight.fullBookingData?.admin_note || '');
                                        return cleanNote && <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded text-sm font-semibold animate-pulse"><InfoIcon className="w-3 h-3 inline mr-1" />{cleanNote}</div>;
                                    })()}
                                </div>
                            </div>
                            <div className="relative mb-8 px-4">
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${selectedFlight.progressPercent}%` }}></div></div>
                                <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-1000 ease-out" style={{ left: `calc(${selectedFlight.progressPercent}% - 16px)` }}><PlaneIcon className="w-5 h-5 text-blue-600 transform rotate-90" /></div>
                                <div className="flex justify-between mt-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                    <div className="text-left"><div>{selectedFlight.departure.airport}</div><div className="text-xs text-gray-400 mb-1">{getCityName(selectedFlight.departure.airport)}</div><div className="text-2xl">{new Date(selectedFlight.departure.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div><div className="text-sm text-gray-500 font-normal">{new Date(selectedFlight.departure.time).toLocaleDateString('vi-VN')}</div><div className="text-xs text-gray-400 font-normal mt-1 flex items-center gap-1">Terminal {selectedFlight.departure.terminal} • <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded">Gate {selectedFlight.departure.gate}</span></div></div>
                                    <div className="text-right"><div>{selectedFlight.arrival.airport}</div><div className="text-xs text-gray-400 mb-1">{getCityName(selectedFlight.arrival.airport)}</div><div className="text-2xl">{new Date(selectedFlight.arrival.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div><div className="text-sm text-gray-500 font-normal">{new Date(selectedFlight.arrival.time).toLocaleDateString('vi-VN')}</div>
                                    <div className="text-xs text-gray-400 font-normal mt-1 flex items-center gap-1 justify-end">
                                        Terminal {selectedFlight.arrival.terminal} • 
                                        <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded ml-1">Gate {selectedFlight.arrival.gate || '--'}</span> • 
                                        Belt {selectedFlight.arrival.belt || '--'}
                                    </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex gap-4 items-center flex-wrap">
                                <button onClick={() => setScheduleModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition font-semibold"><ClockIcon className="w-4 h-4" /> Cập nhật Lịch bay / Delay</button>
                                <button onClick={handleSendUpdateEmail} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-semibold"><MailIcon className="w-4 h-4" /> Đồng bộ Email ngay</button>
                                {(selectedFlight.status === 'ARRIVED' || selectedFlight.statusLabel.includes('COMPLETED')) && <button onClick={handleSendThankYouEmail} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-semibold"><SparklesIcon className="w-4 h-4" /> Gửi thư Cảm ơn</button>}
                                {(selectedFlight as any).liveData && <button onClick={() => setViewingLiveFlight((selectedFlight as any).liveData)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition font-semibold shadow-lg animate-pulse"><RadarIcon className="w-4 h-4" /> Xem Bản đồ Live</button>}
                                <div className="ml-auto text-xs text-gray-400 flex items-center"><ClockIcon className="w-3 h-3 mr-1"/> Cập nhật lúc: {new Date(selectedFlight.lastUpdated).toLocaleTimeString()}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12"><TowerIcon className="w-16 h-16 mb-4 opacity-20" /><p>Chọn một chuyến bay để xem chi tiết và cập nhật lịch trình.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ... (Rest of AdminPage.tsx components BookingsManager, StatsView, DashboardHome, etc. remain unchanged)
interface BookingsManagerProps {
    allBookings: BookingData[];
    fetchData: () => void;
    onSelectBooking: (booking: BookingData) => void;
    onProcessPayment: (booking: BookingData) => void;
    onResendEmail: (booking: BookingData) => void;
    onCancelBooking: (bookingId: string) => void;
    onDeleteBooking: (bookingId: string) => void;
    onUpdateStatus: (bookingId: string, newStatus: string) => void;
    onUpdatePNR: (bookingId: string, currentPnr: string) => void; 
    sendingEmailId: string | null;
    isUpdatingStatus: string | null;
    processingIds: string[];
}

const BookingsManager: React.FC<BookingsManagerProps> = ({ allBookings, onSelectBooking, onProcessPayment, onResendEmail, onCancelBooking, onDeleteBooking, onUpdateStatus, onUpdatePNR, sendingEmailId, isUpdatingStatus, processingIds }) => {
    // (Content omitted, same as before)
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const bookingsPerPage = 15;

    const filteredBookings = useMemo(() => {
        return allBookings
            .filter(b => {
                if (statusFilter !== 'all' && b.status !== statusFilter) return false;
                if (!filter) return true;
                const lowerFilter = filter.toLowerCase();
                return (b.pnr?.toLowerCase().includes(lowerFilter) || b.id?.toLowerCase().includes(lowerFilter) || b.contact?.fullName?.toLowerCase().includes(lowerFilter) || b.contact?.email?.toLowerCase().includes(lowerFilter) || b.contact?.phone?.toLowerCase().includes(lowerFilter));
            })
            .sort((a, b) => new Date(b.bookingTimestamp).getTime() - new Date(a.bookingTimestamp).getTime());
    }, [allBookings, filter, statusFilter]);

    const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
    const currentBookings = filteredBookings.slice((currentPage - 1) * bookingsPerPage, currentPage * bookingsPerPage);

    const getPaymentBadge = (status?: string) => {
        switch (status) {
            case 'paid': return <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">🟢 Đã thanh toán</span>;
            case 'refunded': return <span className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">🟣 Đã hoàn tiền</span>;
            default: return <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 whitespace-nowrap">🟡 Chờ thanh toán</span>;
        }
    };

    const getBookingStatusBadge = (status?: string) => {
        switch (status) {
            case 'confirmed': return <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">🔵 Đã xác nhận</span>;
            case 'cancelled': return <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">🔴 Đã hủy</span>;
            case 'delayed': return <span className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap animate-pulse">🟠 Bị hoãn/Delay</span>;
            default: return <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 whitespace-nowrap">🟡 Chờ xử lý</span>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input type="text" placeholder="Tìm kiếm PNR/ID/Tên/Email/SĐT..." value={filter} onChange={e => setFilter(e.target.value)} className="flex-1 p-2 border rounded bg-transparent" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded bg-transparent"><option value="all">Tất cả trạng thái</option><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="delayed">Delay / Hoãn</option><option value="cancelled">Đã hủy</option></select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse border border-gray-300 dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700"><tr><th className="p-3 border border-gray-300 dark:border-gray-700">PNR/ID</th><th className="p-3 border border-gray-300 dark:border-gray-700">Khách hàng</th><th className="p-3 border border-gray-300 dark:border-gray-700">Chuyến bay</th><th className="p-3 border border-gray-300 dark:border-gray-700">Tổng tiền</th><th className="p-3 border border-gray-300 dark:border-gray-700">Thanh toán</th><th className="p-3 border border-gray-300 dark:border-gray-700">Trạng thái</th><th className="p-3 border border-gray-300 dark:border-gray-700">Thao tác</th></tr></thead>
                    <tbody>
                        {currentBookings.length > 0 ? currentBookings.map(b => {
                            const outboundLeg = b.bookingDetails?.selected_flights?.[0]?.flights?.[0];
                            const inboundLeg = b.bookingDetails?.selected_flights?.[1]?.flights?.[0];
                            const isProcessing = processingIds.includes(b.id);
                            return (
                            <tr key={b.id || b.pnr} className={`border-b dark:border-gray-700 ${isProcessing ? 'opacity-50' : ''}`}>
                                <td className="p-3"><button onClick={() => onSelectBooking(b)} className="font-bold text-red-600 hover:underline">{b.pnr}</button><div className="text-xs text-gray-500">{b.id}</div></td>
                                <td className="p-3"><div className="font-semibold">{b.contact.fullName}</div><div className="text-xs text-gray-500">{b.contact.phone}</div></td>
                                <td className="p-3">{outboundLeg ? (<div className="mb-1"><div className="flex items-center gap-1"><span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-bold">Chiều đi</span><span>{getCityName(outboundLeg.departure_airport.id)} &rarr; {getCityName(outboundLeg.arrival_airport.id)}</span></div><div className="text-xs text-gray-500 pl-12">{new Date(outboundLeg.departure_airport.time).toLocaleString('vi-VN')}</div></div>) : 'N/A'}{inboundLeg && (<div className="mt-2 pt-2 border-t border-dashed border-gray-300 dark:border-gray-600"><div className="flex items-center gap-1"><span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded font-bold">Chiều về</span><span>{getCityName(inboundLeg.departure_airport.id)} &rarr; {getCityName(inboundLeg.arrival_airport.id)}</span></div><div className="text-xs text-gray-500 pl-12">{new Date(inboundLeg.departure_airport.time).toLocaleString('vi-VN')}</div></div>)}</td>
                                <td className="p-3 font-bold text-red-600">{new Intl.NumberFormat('vi-VN').format(b.total_amount || 0)}đ</td>
                                <td className="p-3">{getPaymentBadge(b.payment_status)}</td>
                                <td className="p-3">{getBookingStatusBadge(b.status)}</td>
                                <td className="p-3"><div className="flex gap-2 items-center flex-wrap">{isProcessing ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : (<><button onClick={() => onProcessPayment(b)} disabled={b.payment_status === 'paid'} className="bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Thu tiền (Xác nhận ngay)"><CreditCardIcon className="w-4 h-4" /></button><button onClick={() => onUpdatePNR(b.id, b.pnr)} className="bg-blue-100 text-blue-700 p-1.5 rounded hover:bg-blue-200" title="Đặt lại PNR & Đồng bộ"><RefreshIcon className="w-4 h-4" /></button><select value={b.status || 'pending'} onChange={(e) => onUpdateStatus(b.id, e.target.value)} disabled={isUpdatingStatus === b.id} className="text-xs p-1 border rounded bg-transparent max-w-[110px]"><option value="pending">Mới / Chờ</option><option value="confirmed">Xác nhận</option><option value="delayed">Delay / Hoãn</option><option value="cancelled">Hủy vé</option></select><button onClick={() => onResendEmail(b)} disabled={sendingEmailId === b.id} className="text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Gửi lại email">{sendingEmailId === b.id ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <MailIcon className="w-4 h-4" />}</button>{b.status !== 'cancelled' && (<button onClick={() => onCancelBooking(b.id)} className="text-orange-600 hover:text-orange-800" title="Hủy vé (ghi lý do)"><CloseIcon className="w-4 h-4" /></button>)}<button onClick={() => onDeleteBooking(b.id)} className="text-red-600 hover:text-red-800" title="Xóa"><TrashIcon className="w-4 h-4" /></button></>)}</div></td>
                            </tr>
                        )}) : <tr><td colSpan={7} className="text-center p-4">Không có đơn hàng nào.</td></tr>}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (<div className="flex justify-center items-center gap-2 mt-4"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 disabled:opacity-50"><ChevronLeftIcon /></button><span>Trang {currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 disabled:opacity-50"><ChevronRightIcon /></button></div>)}
        </div>
    );
};

// ... StatsView Component ... (Unchanged)
const StatsView: React.FC<{ bookings: BookingData[], users: User[] }> = ({ bookings, users }) => {
    // (Content omitted, same as before)
    const stats = useMemo(() => {
        const totalRevenue = bookings.filter(b => b.payment_status === 'paid' || b.status === 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const today = new Date();
        const todayBookings = bookings.filter(b => { const d = new Date(b.bookingTimestamp); return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); }).length;
        const totalLoyalty = users.reduce((sum, u) => sum + (u.loyalty_points || 0), 0);
        const statusCounts = { paid: bookings.filter(b => b.payment_status === 'paid' || b.status === 'paid').length, pending: bookings.filter(b => b.status === 'pending' && b.payment_status !== 'paid').length, cancelled: bookings.filter(b => b.status === 'cancelled').length };
        const dailyRevenue = Array.from({length: 7}, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const dayStr = d.toLocaleDateString('vi-VN', { weekday: 'short' }); const revenue = bookings.filter(b => (b.payment_status === 'paid' || b.status === 'paid') && new Date(b.bookingTimestamp).toDateString() === d.toDateString()).reduce((sum, b) => sum + (b.total_amount || 0), 0); return { day: dayStr, value: revenue }; });
        const recentBookings = bookings.sort((a, b) => new Date(b.bookingTimestamp).getTime() - new Date(a.bookingTimestamp).getTime()).slice(0, 5);
        const recentPayments = bookings.filter(b => b.payment_status === 'paid').sort((a, b) => new Date(b.bookingTimestamp).getTime() - new Date(a.bookingTimestamp).getTime()).slice(0, 5);
        return { totalRevenue, totalUsers: users.length, totalBookings: bookings.length, todayBookings, totalLoyalty, statusCounts, dailyRevenue, recentBookings, recentPayments };
    }, [bookings, users]);

    const MetricCard: React.FC<{ title: string; value: string | number; subtext?: string; color?: string }> = ({ title, value, subtext, color }) => (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
            {subtext && <p className={`text-xs mt-1 ${color}`}>{subtext}</p>}
        </div>
    );

    const LineChart = ({ data }: { data: { day: string, value: number }[] }) => {
        const maxVal = Math.max(...data.map(d => d.value), 1000000);
        const points = data.map((d, i) => { const x = (i / (data.length - 1)) * 100; const y = 100 - (d.value / maxVal) * 80; return `${x},${y}`; }).join(' ');
        return (
            <div className="relative h-64 w-full">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none"><line x1="0" y1="20" x2="100" y2="20" stroke="#e5e7eb" strokeWidth="0.5" /><line x1="0" y1="60" x2="100" y2="60" stroke="#e5e7eb" strokeWidth="0.5" /><line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.5" /><polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />{data.map((d, i) => { const x = (i / (data.length - 1)) * 100; const y = 100 - (d.value / maxVal) * 80; return (<g key={i} className="group"><circle cx={x} cy={y} r="3" fill="#3b82f6" stroke="white" strokeWidth="1" /><rect x={x - 10} y={y - 10} width="20" height="8" fill="transparent" /><title>{d.day}: {formatCurrency(d.value)}</title></g>); })}</svg>
                <div className="flex justify-between mt-2 text-xs text-gray-500">{data.map((d, i) => <span key={i}>{d.day}</span>)}</div>
            </div>
        );
    };

    const PieChart = ({ counts }: { counts: { paid: number, pending: number, cancelled: number } }) => {
        const total = counts.paid + counts.pending + counts.cancelled;
        if (total === 0) return <div className="text-center text-gray-500">Chưa có dữ liệu</div>;
        const pPaid = (counts.paid / total) * 100;
        const pPending = (counts.pending / total) * 100;
        const radius = 15.9155; 
        const strokeDasharrayPaid = `${pPaid} ${100 - pPaid}`;
        const strokeDasharrayPending = `${pPending} ${100 - pPending}`;
        const strokeDasharrayFailed = `${100 - pPaid - pPending} ${pPaid + pPending}`;
        const offsetPending = -pPaid;
        const offsetFailed = -(pPaid + pPending);

        return (
            <div className="flex items-center justify-center">
                <div className="relative w-64 h-64">
                    <svg viewBox="0 0 42 42" className="w-full h-full">
                        <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#ef4444" strokeWidth="10" strokeDasharray={strokeDasharrayFailed} strokeDashoffset={offsetFailed} />
                        <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#f59e0b" strokeWidth="10" strokeDasharray={strokeDasharrayPending} strokeDashoffset={offsetPending} />
                        <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#10b981" strokeWidth="10" strokeDasharray={strokeDasharrayPaid} strokeDashoffset="0" />
                        <g className="chart-text"><text x="50%" y="50%" className="chart-number" textAnchor="middle" dy=".3em" fontSize="0">{total}</text></g>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-full"></div></div>
                </div>
                <div className="ml-8 space-y-2 text-sm">
                    <div className="flex items-center"><span className="w-3 h-3 bg-green-500 mr-2 rounded-sm"></span> Paid</div>
                    <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 mr-2 rounded-sm"></span> Pending</div>
                    <div className="flex items-center"><span className="w-3 h-3 bg-red-500 mr-2 rounded-sm"></span> Failed</div>
                </div>
            </div>
        );
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'confirmed': return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Đã xác nhận</span>;
            case 'cancelled': return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Đã hủy</span>;
            default: return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Chờ xử lý</span>;
        }
    };
    const getPaymentBadge = (status?: string) => {
        switch (status) {
            case 'paid': return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Đã thanh toán</span>;
            default: return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Chờ thanh toán</span>;
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Bảng Thống Kê</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard title="Tổng Người Dùng" value={stats.totalUsers} />
                <MetricCard title="Tổng Đặt Vé" value={stats.totalBookings} />
                <div className="lg:col-span-1"><MetricCard title="Doanh Thu" value={formatCurrency(stats.totalRevenue).replace('₫', '') + ' VNĐ'} /></div>
                <MetricCard title="Đặt Vé Hôm Nay" value={stats.todayBookings} />
                <MetricCard title="Tổng Điểm Loyalty" value={stats.totalLoyalty} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 dark:text-white">Biểu Đồ Doanh Thu</h3>
                        <div className="flex items-center text-xs text-blue-500"><span className="w-3 h-1 bg-blue-500 mr-1"></span> Doanh Thu</div>
                    </div>
                    <LineChart data={stats.dailyRevenue} />
                </div>
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Tình Trạng Thanh Toán</h3>
                    <PieChart counts={stats.statusCounts} />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Đặt Vé Gần Đây</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-5 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                            <tr>
                                <th className="p-3">PNR/ID</th>
                                <th className="p-3">KHÁCH HÀNG</th>
                                <th className="p-3">CHUYẾN BAY</th>
                                <th className="p-3">TÌNH TRẠNG</th>
                                <th className="p-3">THANH TOÁN</th>
                                <th className="p-3 text-right">TỔNG TIỀN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentBookings.map(b => (
                                <tr key={b.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 text-gray-500">{b.pnr || b.id}</td>
                                    <td className="p-3 font-medium text-gray-800 dark:text-white">{b.contact.fullName}</td>
                                    <td className="p-3 text-gray-500">
                                        {b.flight && b.flight.flights && b.flight.flights.length > 0 ? (
                                            <div className="flex items-center">
                                                {b.flight.flights[0].airline_logo && <img src={b.flight.flights[0].airline_logo} className="w-5 h-5 mr-2 object-contain" alt="" />}
                                                <span>{b.flight.flights[0].departure_airport.id} &rarr; {b.flight.flights[b.flight.flights.length - 1].arrival_airport.id}</span>
                                            </div>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="p-3">{getStatusBadge(b.status)}</td>
                                    <td className="p-3">{getPaymentBadge(b.payment_status)}</td>
                                    <td className="p-3 text-right font-medium text-gray-800 dark:text-white">{formatCurrency(b.total_amount || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Lịch Sử Thanh Toán Gần Đây</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-5 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                            <tr>
                                <th className="p-3">BOOKING ID</th>
                                <th className="p-3">SỐ TIỀN</th>
                                <th className="p-3">TRẠNG THÁI</th>
                                <th className="p-3">PHƯƠNG THỨC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentPayments.length > 0 ? stats.recentPayments.map(b => (
                                <tr key={`pay-${b.id}`} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 text-gray-500">{b.id}</td>
                                    <td className="p-3 text-gray-500">{formatCurrency(b.total_amount || 0)}</td>
                                    <td className="p-3"><span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Đã thanh toán</span></td>
                                    <td className="p-3 text-gray-500">{b.payment_info?.method || 'N/A'}</td>
                                </tr>
                            )) : <tr><td colSpan={4} className="p-4 text-center text-gray-500">Chưa có giao dịch nào</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ... DashboardHome Component ... (Unchanged)
const DashboardHome: React.FC<{ bookings: BookingData[], users: User[], onNavigate: (tab: string) => void }> = ({ bookings, users, onNavigate }) => {
    // (Content omitted, same as before)
    const totalRevenue = bookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Converter State
    const [convertAmount, setConvertAmount] = useState<number>(1); // Default to 1
    const [convertCurrency, setConvertCurrency] = useState('USD');
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [convertedValue, setConvertedValue] = useState(0);

    // Upcoming Flights Logic
    const upcomingFlights = useMemo(() => {
        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return bookings.filter(b => {
            if (b.status === 'cancelled') return false;
            if (!b.flight?.flights?.[0]) return false;
            const dep = new Date(b.flight.flights[0].departure_airport.time);
            return dep >= now && dep <= next24h;
        }).sort((a, b) => new Date(a.flight.flights[0].departure_airport.time).getTime() - new Date(b.flight.flights[0].departure_airport.time).getTime());
    }, [bookings, currentTime]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        // Fetch rates for converter
        const loadRates = async () => {
            const data = await walletService.getRealExchangeRates();
            setRates(data);
        };
        loadRates();

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const rateObj = rates.find(r => r.currency === convertCurrency);
        const rate = rateObj ? rateObj.rate : 25400; // Fallback
        setConvertedValue(convertAmount * rate);
    }, [convertAmount, convertCurrency, rates]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Dashboard Card (Matches Image) */}
                <div className="lg:col-span-2 bg-[#1e293b] text-white p-6 rounded-xl shadow-lg border border-slate-700 relative overflow-hidden flex flex-col justify-between min-h-[400px]">
                    {/* Background Icon */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><RadarIcon className="w-64 h-64 text-white" /></div>
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 relative z-10 border-b border-slate-700 pb-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                                <LayoutDashboardIcon className="w-8 h-8 text-yellow-400" />
                                Trung tâm Điều hành
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Hệ thống quản trị vé máy bay V13</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-mono font-bold tracking-tight text-white">{currentTime.toLocaleTimeString('vi-VN', {hour12: false})}</div>
                            <div className="text-sm text-blue-300 font-medium uppercase mt-1">{currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                        </div>
                    </div>

                    {/* Middle Section: Split Views */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 flex-grow">
                        
                        {/* Upcoming Flights */}
                        <div className="bg-[#0f172a] rounded-lg border border-slate-600 p-4 flex flex-col">
                            <h3 className="text-orange-400 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                                <PlaneTakeoffIcon className="w-5 h-5" /> Sắp cất cánh (24h tới)
                            </h3>
                            <div className="flex-grow overflow-y-auto max-h-[200px] pr-1 scrollbar-thin scrollbar-thumb-slate-700 space-y-2">
                                {upcomingFlights.length > 0 ? upcomingFlights.map((b, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700 text-xs">
                                        <div>
                                            <div className="font-bold text-yellow-500">{b.flight.flights[0].flight_number}</div>
                                            <div className="text-slate-400">{b.flight.flights[0].departure_airport.id} ➝ {b.flight.flights[b.flight.flights.length-1].arrival_airport.id}</div>
                                        </div>
                                        <div className="text-right font-mono text-white">
                                            {new Date(b.flight.flights[0].departure_airport.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-slate-500 text-center italic py-8 text-sm">
                                        Không có chuyến bay nào trong 24h tới.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Converter */}
                        <div className="bg-[#0f172a] rounded-lg border border-slate-600 p-4 flex flex-col justify-center">
                            <h3 className="text-green-400 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                                <RefreshIcon className="w-5 h-5" /> Quy đổi nhanh (VCB)
                            </h3>
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={convertAmount}
                                        onChange={(e) => setConvertAmount(Number(e.target.value))}
                                        className="flex-grow bg-slate-800 border border-slate-600 text-white font-bold text-right p-2 rounded focus:outline-none focus:border-blue-500"
                                    />
                                    <select 
                                        value={convertCurrency}
                                        onChange={(e) => setConvertCurrency(e.target.value)}
                                        className="bg-slate-700 text-white font-bold px-3 py-2 rounded border border-slate-600 outline-none"
                                    >
                                        {rates.length > 0 ? rates.map(r => <option key={r.currency} value={r.currency}>{r.currency}</option>) : <option value="USD">USD</option>}
                                    </select>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 mb-1">Thành tiền VNĐ:</div>
                                    <div className="text-2xl font-bold text-yellow-400 tracking-wide">
                                        {formatCurrency(convertedValue)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-700 pt-4 mt-6">
                        <div>
                            <span className="text-[10px] text-blue-300 uppercase font-bold block mb-1">Trạng thái Server</span>
                            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-blue-300 uppercase font-bold block mb-1">Kết nối API</span>
                            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                                <CheckCircleIcon className="w-4 h-4" /> Stable
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-blue-300 uppercase font-bold block mb-1">Thành viên</span>
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <UserGroupIcon className="w-4 h-4" /> {users.length}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] text-blue-300 uppercase font-bold block mb-1">Chờ xử lý</span>
                            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                                <ClockIcon className="w-4 h-4" /> {pendingCount} đơn
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column: Exchange Rate Table (Preserved) */}
                <div className="lg:col-span-1 h-full">
                    <ExchangeRateWidget />
                </div>
            </div>

            {/* Quick Actions (Preserved) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <button onClick={() => onNavigate('bookings')} className="p-6 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition flex flex-col items-center text-center transform hover:scale-105 duration-200">
                    <div className="bg-blue-500 p-3 rounded-full mb-3"><TicketIcon className="w-10 h-10 text-white" /></div>
                    <h3 className="text-xl font-bold">Quản Lý Đặt Vé</h3>
                    <p className="text-blue-100 text-sm mt-1">Xem, chỉnh sửa và xử lý đơn hàng</p>
                </button>
                <button onClick={() => onNavigate('tracker')} className="p-6 bg-orange-600 text-white rounded-xl shadow-lg hover:bg-orange-700 transition flex flex-col items-center text-center transform hover:scale-105 duration-200">
                    <div className="bg-orange-500 p-3 rounded-full mb-3"><RadarIcon className="w-10 h-10 text-white" /></div>
                    <h3 className="text-xl font-bold">Flight Control</h3>
                    <p className="text-orange-100 text-sm mt-1">Theo dõi chuyến bay & Bảng điện tử</p>
                </button>
                <button onClick={() => onNavigate('agents')} className="p-6 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition flex flex-col items-center text-center transform hover:scale-105 duration-200">
                    <div className="bg-purple-500 p-3 rounded-full mb-3"><UserGroupIcon className="w-10 h-10 text-white" /></div>
                    <h3 className="text-xl font-bold">Đại lý & Ví</h3>
                    <p className="text-purple-100 text-sm mt-1">Quản lý F1/F2 và nạp tiền</p>
                </button>
                <button onClick={() => onNavigate('users')} className="p-6 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition flex flex-col items-center text-center transform hover:scale-105 duration-200">
                    <div className="bg-green-500 p-3 rounded-full mb-3"><UserGroupIcon className="w-10 h-10 text-white" /></div>
                    <h3 className="text-xl font-bold">Người Dùng</h3>
                    <p className="text-green-100 text-sm mt-1">Quản lý tài khoản khách hàng</p>
                </button>
            </div>

            {/* Mini Stats (Preserved) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold mb-6 border-b dark:border-gray-700 pb-2 text-gray-800 dark:text-white">Thông Tin Nhanh</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center group">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:bg-blue-100 transition">
                            <ChartBarIcon className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-1">Thống Kê Chi Tiết</h4>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Doanh thu: <span className="font-bold text-red-600 block text-lg">{formatCurrency(totalRevenue)}</span></p>
                            <button onClick={() => onNavigate('stats')} className="text-blue-600 hover:underline text-sm">Xem thống kê &rarr;</button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center group">
                        <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 group-hover:bg-green-100 transition">
                            <SearchIcon className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-1">Tra Cứu Đặt Vé</h4>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Đơn chờ xử lý: <span className="font-bold text-orange-600 block text-lg">{pendingCount}</span></p>
                            <button onClick={() => onNavigate('bookings')} className="text-green-600 hover:underline text-sm">Tra cứu ngay &rarr;</button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center group">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full mb-3 group-hover:bg-yellow-100 transition">
                            <BellIcon className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-1">Thông Báo</h4>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Thành viên: <span className="font-bold text-blue-600 block text-lg">{users.length}</span></p>
                            <span className="text-sm text-gray-400">Không có thông báo mới</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... UserEditModal, PasswordResetModal, AdminEditModal, PersonalProfileModal, ChangeSelfPasswordModal, PaymentModal ... (Unchanged)
// (Content omitted for brevity)
const UserEditModal: React.FC<{ user: User; onClose: () => void; onSave: () => void }> = ({ user, onClose, onSave }) => {
    // Correctly map DB values to UI values
    const mapDbGenderToUi = (gender?: string) => {
        if (!gender) return 'Male';
        const g = gender.toLowerCase();
        if (g === 'female' || g === 'nữ' || g === 'mrs' || g === 'miss') return 'Female';
        return 'Male';
    };

    const [formData, setFormData] = useState({
        ...user,
        gender: mapDbGenderToUi(user.gender),
        id_card: user.id_card || '',
        dob: user.dob ? user.dob.split('T')[0] : '', // Extract strictly YYYY-MM-DD for input[type=date]
        address: user.address || ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await adminService.updateUser(formData as User);
            if (result.success) {
                onSave();
            } else {
                alert(result.message);
            }
        } catch (e) { alert('Lỗi cập nhật user.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Sửa thông tin User</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Họ tên" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="SĐT" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                    
                    <div className="flex gap-2">
                        <select className="p-2 border rounded dark:bg-gray-700" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                            <option value="Male">Ông (Nam)</option>
                            <option value="Female">Bà (Nữ)</option>
                        </select>
                        <input className="w-full p-2 border rounded dark:bg-gray-700" type="date" placeholder="Ngày sinh" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                    </div>

                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="CCCD / Passport" value={formData.id_card} onChange={e => setFormData({...formData, id_card: e.target.value})} />
                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Địa chỉ" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    <div className="flex items-center gap-2">
                        <label>Điểm tích lũy:</label>
                        <input type="number" className="w-24 p-2 border rounded dark:bg-gray-700" value={formData.loyalty_points || 0} onChange={e => setFormData({...formData, loyalty_points: parseInt(e.target.value)})} />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded">{isLoading ? 'Lưu...' : 'Lưu'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PasswordResetModal: React.FC<{ userId: string|number; type: 'user'|'admin'; onClose: () => void }> = ({ userId, type, onClose }) => {
    const [newPass, setNewPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = type === 'user' 
                ? await adminService.resetUserPassword(userId, newPass)
                : await adminService.resetAdminPassword(userId, newPass);
            alert(result.message);
            if(result.success) onClose();
        } catch { alert('Lỗi reset mật khẩu.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">Reset Mật khẩu ({type === 'user' ? 'User' : 'Admin'})</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input type="password" className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Mật khẩu mới" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6} />
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-yellow-600 text-white rounded">{isLoading ? 'Đang xử lý...' : 'Xác nhận'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminEditModal: React.FC<{ admin?: Admin; onClose: () => void; onSave: () => void }> = ({ admin, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        fullname: admin?.fullname || '',
        username: admin?.username || '',
        email: admin?.email || '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    // Effect to reset form when switching between Add/Edit modes
    useEffect(() => {
        setFormData({
            fullname: admin?.fullname || '',
            username: admin?.username || '',
            email: admin?.email || '',
            password: ''
        });
    }, [admin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let result;
            if (admin) {
                result = await adminService.updateAdmin({ ...admin, ...formData });
            } else {
                if(!formData.password) { alert("Mật khẩu là bắt buộc khi tạo mới."); setIsLoading(false); return; }
                result = await adminService.createAdmin(formData as any);
            }
            if (result.success) onSave();
            else alert(result.message);
        } catch { alert('Lỗi xử lý admin.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">{admin ? 'Sửa Admin' : 'Thêm Admin'}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Họ tên hiển thị" value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} required />
                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                    <input className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    {!admin && <input type="password" className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Mật khẩu" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />}
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded">{isLoading ? 'Lưu...' : 'Lưu'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PersonalProfileModal: React.FC<{ admin: Admin; onClose: () => void; onSave: () => void }> = ({ admin, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        fullname: admin.fullname,
        username: admin.username,
        email: admin.email
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await adminService.updateAdminInfo(admin.id, formData);
            if (result.success) {
                alert(result.message);
                onSave(); 
                onClose();
            } else {
                alert(result.message);
            }
        } catch { alert('Lỗi cập nhật thông tin.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Sửa thông tin cá nhân</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Họ tên hiển thị</label>
                        <input className="w-full p-2 border rounded dark:bg-gray-700" value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Tên đăng nhập</label>
                        <input className="w-full p-2 border rounded dark:bg-gray-700" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Email</label>
                        <input className="w-full p-2 border rounded dark:bg-gray-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded">{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ChangeSelfPasswordModal: React.FC<{ adminId: string|number; onClose: () => void }> = ({ adminId, onClose }) => {
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass !== confirmPass) { alert('Mật khẩu mới không khớp.'); return; }
        setIsLoading(true);
        try {
            const result = await adminService.changeAdminPassword(adminId, oldPass, newPass);
            alert(result.message);
            if (result.success) onClose();
        } catch { alert('Lỗi đổi mật khẩu.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4">Đổi Mật khẩu</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input type="password" className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Mật khẩu cũ" value={oldPass} onChange={e => setOldPass(e.target.value)} required />
                    <input type="password" className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Mật khẩu mới" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6} />
                    <input type="password" className="w-full p-2 border rounded dark:bg-gray-700" placeholder="Xác nhận mật khẩu mới" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-red-600 text-white rounded">{isLoading ? 'Đang đổi...' : 'Đổi Mật khẩu'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PaymentModal: React.FC<{ booking: BookingData; onClose: () => void; onSuccess: () => void }> = ({ booking, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(booking.total_amount || 0);
    const [method, setMethod] = useState('Chuyển khoản ngân hàng');
    const [txnId, setTxnId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const paymentInfo = { method, transaction_id: txnId, date: new Date().toISOString() };
        
        try {
            const result = await adminService.processPayment(booking.id, amount, paymentInfo);
            if (result.success) {
                await adminService.updateBookingStatus(booking.id, 'confirmed', 'Thanh toán hoàn tất qua Admin');
                try {
                    const updatedBooking = { ...booking, payment_status: 'paid' as const, status: 'confirmed', total_amount: amount, payment_info: paymentInfo };
                    await emailService.sendConfirmationEmail(updatedBooking);
                    alert('Xử lý thanh toán thành công và đã gửi email xác nhận!');
                } catch (e) {
                    alert('Thanh toán thành công nhưng gửi mail thất bại.');
                }
                onSuccess();
            } else {
                alert(result.message);
            }
        } catch { alert('Lỗi xử lý thanh toán.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Xác nhận Thanh toán: {booking.pnr}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Số tiền thực thu</label>
                        <input type="number" className="w-full p-2 border rounded dark:bg-gray-700 font-bold text-red-600" value={amount} onChange={e => setAmount(Number(e.target.value))} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Phương thức</label>
                        <select className="w-full p-2 border rounded dark:bg-gray-700" value={method} onChange={e => setMethod(e.target.value)}>
                            <option value="Chuyển khoản ngân hàng">Chuyển khoản ngân hàng</option>
                            <option value="Tiền mặt">Tiền mặt</option>
                            <option value="Thẻ tín dụng">Thẻ tín dụng</option>
                            <option value="Cổng thanh toán">Cổng thanh toán</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Mã giao dịch / Ghi chú</label>
                        <input type="text" className="w-full p-2 border rounded dark:bg-gray-700" value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="VD: FT234..." />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{isLoading ? 'Đang xử lý...' : 'Xác nhận Thu tiền'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminPage: React.FC<AdminPageProps & { onLogout: () => void }> = ({ onExitAdmin, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [feeConfig, setFeeConfig] = useState<AdminFeeConfig | null>(null);
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null); 
    const [isLoading, setIsLoading] = useState(true);

    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
    const [selectedPaymentBooking, setSelectedPaymentBooking] = useState<BookingData | null>(null);
    const [backupLoading, setBackupLoading] = useState(false);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [resetPassTarget, setResetPassTarget] = useState<{id: string|number, type: 'user'|'admin'} | null>(null);
    const [editingAdmin, setEditingAdmin] = useState<Admin | null | undefined>(undefined); // undefined=closed, null=add, object=edit
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [b, u, f, a, cur] = await Promise.all([
                adminService.getAllBookings(),
                authService.getAllUsers(),
                adminService.getFeeConfig(),
                adminService.getAdmins(),
                adminService.getCurrentAdminInfo()
            ]);
            setBookings(b);
            setUsers(u);
            setFeeConfig(f);
            setAdmins(a);
            setCurrentAdmin(cur);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = () => {
        onLogout();
    };

    const refreshProfile = async () => {
        if (currentAdmin?.id) {
            await fetchData();
        }
    };

    const handleBackup = async () => {
        setBackupLoading(true);
        try {
            const response = await fetch(PROXY_URL + BACKUP_API_URL);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'flight_app_data.json';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { alert('Download failed'); }
        finally { setBackupLoading(false); }
    };

    const handleDeleteUser = async (id: string|number) => {
        if(window.confirm('Xóa user?')) {
            const res = await adminService.deleteUser(id);
            if(res.success) fetchData();
            else alert(res.message);
        }
    };
    const handleDeleteAdmin = async (id: string|number) => {
        if(id === currentAdmin?.id) return alert('Không thể xóa chính mình');
        if(window.confirm('Xóa Admin?')) {
            const res = await adminService.deleteAdmin(id);
            if(res.success) fetchData();
            else alert(res.message);
        }
    };
    const handleDeleteBooking = async (id: string) => {
        if (window.confirm('Xóa đơn hàng?')) {
            const res = await adminService.deleteBooking(id);
            if(res.success) fetchData();
            else alert(res.message);
        }
    };
    const handleCancelBooking = async (id: string) => {
        const reason = prompt("Lý do hủy:", "Khách yêu cầu hủy");
        if (reason) {
            const res = await adminService.cancelBooking(id, reason);
            if (res.success) {
                const updatedBooking = bookings.find(b => b.id === id);
                if (updatedBooking) {
                     emailService.sendConfirmationEmail({ ...updatedBooking, status: 'cancelled' });
                }
                alert("Đã hủy.");
                fetchData();
            } else {
                alert(res.message);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
             {editUser && <UserEditModal user={editUser} onClose={() => setEditUser(null)} onSave={() => { setEditUser(null); fetchData(); }} />}
             {resetPassTarget && <PasswordResetModal userId={resetPassTarget.id} type={resetPassTarget.type} onClose={() => setResetPassTarget(null)} />}
             {editingAdmin !== undefined && <AdminEditModal admin={editingAdmin || undefined} onClose={() => setEditingAdmin(undefined)} onSave={() => { setEditingAdmin(undefined); fetchData(); }} />}
             {showProfileModal && currentAdmin && <PersonalProfileModal admin={currentAdmin} onClose={() => setShowProfileModal(false)} onSave={refreshProfile} />}
             {showPasswordModal && currentAdmin && <ChangeSelfPasswordModal adminId={currentAdmin.id} onClose={() => setShowPasswordModal(false)} />}
             {selectedPaymentBooking && <PaymentModal booking={selectedPaymentBooking} onClose={() => setSelectedPaymentBooking(null)} onSuccess={() => { setSelectedPaymentBooking(null); fetchData(); }} />}

            <header className="bg-white dark:bg-gray-800 shadow p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <LayoutDashboardIcon className="w-6 h-6 text-blue-600" />
                    <h1 className="text-xl font-bold">Trang Quản Trị (V13 Enhanced - 2025)</h1>
                </div>
                <div className="flex items-center gap-4">
                     {currentAdmin && <div className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">Xin chào, {currentAdmin.fullname}</div>}
                    <button onClick={onExitAdmin} className="font-semibold text-blue-600 hover:underline mr-4">Trang chủ</button>
                    <button onClick={handleLogout} className="font-semibold text-red-600 hover:underline">Đăng xuất</button>
                </div>
            </header>

            <main className="p-4 md:p-8">
                <div className="flex border-b mb-6 overflow-x-auto">
                    {[
                        { id: 'dashboard', label: 'Tổng quan' },
                        { id: 'tracker', label: 'Flight Tracker' },
                        { id: 'agents', label: 'Đại lý & Ví' },
                        { id: 'revenue', label: 'Doanh thu & Lợi nhuận' },
                        { id: 'bookings', label: 'Quản lý Đặt vé' },
                        { id: 'users', label: 'Khách hàng' },
                        { id: 'admins', label: 'Quản trị viên' },
                        { id: 'fees', label: 'Cấu hình Phí & Thuế' },
                        { id: 'footer', label: 'Footer Menu' },
                        { id: 'stats', label: 'Thống kê' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-b-2 border-red-500 text-red-600 bg-red-50 dark:bg-red-900/10' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                    <div className="flex-grow"></div>
                     <button onClick={handleBackup} disabled={backupLoading} className="ml-auto flex items-center justify-center px-4 py-1.5 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 text-sm whitespace-nowrap">
                        {backupLoading ? 'Đang tải...' : <><DownloadIcon className="w-4 h-4 mr-2" /> Backup Data</>}
                    </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900">
                    {isLoading ? (
                        <p className="p-6 text-center">Đang tải dữ liệu...</p>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && <DashboardHome bookings={bookings} users={users} onNavigate={(tab) => setActiveTab(tab)} />}
                            
                            {activeTab === 'tracker' && <FlightTrackerView bookings={bookings} fetchData={fetchData} />}
                            
                            {activeTab === 'agents' && <AgentWalletManager />}

                            {activeTab === 'revenue' && <RevenueManager bookings={bookings} feeConfig={feeConfig} />}

                            {activeTab === 'stats' && <StatsView bookings={bookings} users={users} />}

                            {/* Bookings, Users, Admins, Fees, Footer components rendered same as before */}
                            {activeTab === 'bookings' && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                    <BookingsManager 
                                        allBookings={bookings} 
                                        fetchData={fetchData}
                                        onSelectBooking={setSelectedBooking}
                                        onProcessPayment={setSelectedPaymentBooking}
                                        onResendEmail={async (b) => { 
                                            if(confirm(`Gửi lại email cho ${b.contact.email}?`)) {
                                                setSendingEmailId(b.id);
                                                try {
                                                    const res = await emailService.sendConfirmationEmail(b);
                                                    if(res.success) alert('Đã gửi.');
                                                    else alert(res.message);
                                                } catch { alert('Lỗi gửi mail.'); }
                                                finally { setSendingEmailId(null); }
                                            }
                                        }}
                                        onCancelBooking={handleCancelBooking}
                                        onDeleteBooking={handleDeleteBooking}
                                        onUpdateStatus={async (id, status) => {
                                             const booking = bookings.find(b => b.id === id);
                                             if(!booking || !window.confirm(`Đổi trạng thái sang ${status}?`)) return;
                                             
                                             const note = prompt("Ghi chú admin:", booking.admin_note || "");
                                             const res = await adminService.updateBookingStatus(id, status, note || "");
                                             if(res.success) {
                                                 if (status === 'confirmed' || status === 'cancelled') {
                                                     emailService.sendConfirmationEmail({ ...booking, status: status, admin_note: note || "" });
                                                 }
                                                 alert('Cập nhật thành công.');
                                                 await fetchData();
                                             } else {
                                                 alert(res.message);
                                             }
                                        }}
                                        onUpdatePNR={async (id, currentPnr) => {
                                            const newPnr = prompt("PNR mới:", currentPnr);
                                            if (!newPnr || newPnr === currentPnr) return;
                                            try {
                                                const res = await adminService.updateBookingPNR(id, newPnr.trim().toUpperCase());
                                                if (!res.success) return alert(res.message);
                                                
                                                await adminService.updateBookingStatus(id, 'confirmed', 'Cập nhật PNR mới');
                                                await fetchData();
                                                
                                                const booking = bookings.find(b => b.id === id);
                                                if(booking) await emailService.sendConfirmationEmail({ ...booking, pnr: newPnr.trim().toUpperCase(), status: 'confirmed' });
                                                alert('Cập nhật PNR thành công.');
                                            } catch { alert('Lỗi cập nhật.'); }
                                            finally { fetchData(); }
                                        }}
                                        sendingEmailId={sendingEmailId}
                                        isUpdatingStatus={null} 
                                        processingIds={[]}
                                    />
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                    <h2 className="text-xl font-bold mb-4">Danh sách Người dùng ({users.length})</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                                <tr><th className="p-3">ID</th><th className="p-3">Họ tên</th><th className="p-3">Liên hệ</th><th className="p-3">Thông tin</th><th className="p-3">Điểm Loyalty</th><th className="p-3">Thao tác</th></tr>
                                            </thead>
                                            <tbody>
                                                {users.length > 0 ? users.map(u => (
                                                    <tr key={u.id} className="border-b dark:border-gray-700">
                                                        <td className="p-3 text-gray-500">{u.id}</td>
                                                        <td className="p-3 font-semibold">{u.name}</td>
                                                        <td className="p-3"><div>{u.email}</div><div className="text-xs text-gray-500">{u.phone}</div></td>
                                                        <td className="p-3 text-xs"><div>CCCD: {u.id_card}</div><div>Đ/C: {u.address}</div></td>
                                                        <td className="p-3 font-bold text-blue-600">{u.loyalty_points || 0}</td>
                                                        <td className="p-3">
                                                            <div className="flex gap-3">
                                                                <button onClick={() => setEditUser(u)} className="text-blue-600 hover:text-blue-800" title="Sửa & Cộng điểm"><EditIcon className="w-5 h-5" /></button>
                                                                <button onClick={() => u.id && setResetPassTarget({ id: u.id, type: 'user' })} className="text-yellow-600 hover:text-yellow-800" title="Đổi mật khẩu"><span className="font-bold text-xs border border-yellow-500 rounded px-1">MK</span></button>
                                                                <button onClick={() => u.id && handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800" title="Xóa"><TrashIcon className="w-5 h-5" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : <tr><td colSpan={6} className="text-center p-4">Chưa có người dùng nào.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'admins' && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                    {currentAdmin && (
                                        <div className="mb-6 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/30">
                                            <h3 className="text-lg font-bold mb-2">Hồ sơ Cá nhân ({currentAdmin.fullname})</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div><strong>Username:</strong> {currentAdmin.username}</div>
                                                <div><strong>Email:</strong> {currentAdmin.email}</div>
                                                <div><strong>Tạo:</strong> {formatDate(currentAdmin.created_at)}</div>
                                                <div><strong>Cập nhật:</strong> {formatDate(currentAdmin.updated_at)}</div>
                                                <div><strong>Đăng nhập cuối:</strong> {formatDate(currentAdmin.last_login)}</div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => setShowProfileModal(true)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Chỉnh sửa</button>
                                                <button onClick={() => setShowPasswordModal(true)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Đổi Mật khẩu</button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold">Danh sách Quản trị viên ({admins.length})</h2>
                                        <button onClick={() => setEditingAdmin(null)} className="flex items-center bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"><PlusIcon className="w-4 h-4 mr-2" /> Thêm Admin</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                                <tr><th className="p-3">ID</th><th className="p-3">Họ tên</th><th className="p-3">Username</th><th className="p-3">Email</th><th className="p-3">Tạo</th><th className="p-3">Cập nhật</th><th className="p-3">Đăng nhập cuối</th><th className="p-3">Thao tác</th></tr>
                                            </thead>
                                            <tbody>
                                                {admins.length > 0 ? admins.map(a => (
                                                    <tr key={a.id} className="border-b dark:border-gray-700">
                                                        <td className="p-3 text-gray-500">{a.id}</td>
                                                        <td className="p-3 font-semibold">{a.fullname}</td>
                                                        <td className="p-3">{a.username}</td>
                                                        <td className="p-3">{a.email}</td>
                                                        <td className="p-3 text-xs">{formatDate(a.created_at)}</td>
                                                        <td className="p-3 text-xs">{formatDate(a.updated_at)}</td>
                                                        <td className="p-3 text-xs">{formatDate(a.last_login)}</td>
                                                        <td className="p-3">
                                                            <div className="flex gap-3">
                                                                <button onClick={() => setEditingAdmin(a)} className="text-blue-600 hover:text-blue-800" title="Sửa"><EditIcon className="w-5 h-5" /></button>
                                                                <button onClick={() => setResetPassTarget({ id: a.id, type: 'admin' })} className="text-yellow-600 hover:text-yellow-800" title="Reset mật khẩu"><span className="font-bold text-xs border border-yellow-500 rounded px-1">MK</span></button>
                                                                <button onClick={() => handleDeleteAdmin(a.id)} className="text-red-600 hover:text-red-800" title="Xóa"><TrashIcon className="w-5 h-5" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : <tr><td colSpan={8} className="text-center p-4">Chưa có admin nào khác.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'fees' && feeConfig && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                    <FeeConfiguration initialConfig={feeConfig} />
                                </div>
                            )}

                            {activeTab === 'footer' && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                    <FooterEditor />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
            
            {selectedBooking && (
                <div className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center p-4 ticket-modal-container">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="flex-shrink-0 p-3 bg-gray-100 flex justify-between items-center no-print">
                            <h3 className="font-bold text-gray-800">Chi tiết Đơn hàng: {selectedBooking.id}</h3>
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
            )}
        </div>
    );
};

const AdminPageWrapper: React.FC<AdminPageProps> = ({ onExitAdmin }) => {
    const [loggedIn, setLoggedIn] = useState(adminService.isLoggedIn());
    const [showChangeCreds, setShowChangeCreds] = useState(false);

    const handleLoginSuccess = () => {
        setLoggedIn(true);
    };

    const handleLogout = () => {
        adminService.logout();
        setLoggedIn(false);
    };

    const handleChangeSuccess = () => {
        setShowChangeCreds(false);
        setLoggedIn(false); 
    };

    if (loggedIn) {
        return (
            <> 
                <AdminPage onLogout={handleLogout} onExitAdmin={onExitAdmin} /> 
                {showChangeCreds && <ChangeCredentialsModal onClose={() => setShowChangeCreds(false)} onSuccess={handleChangeSuccess} />} 
            </>
        );
    } else {
        return <AdminLogin onLoginSuccess={handleLoginSuccess} onExit={onExitAdmin} />;
    }
};

export default AdminPageWrapper;
