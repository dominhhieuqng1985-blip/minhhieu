
import React, { useState, useEffect, useMemo } from 'react';
import { User, WalletTransaction } from '../types';
import * as walletService from '../services/walletService';
import * as adminService from '../services/adminService';
import * as authService from '../services/authService';
import { UserGroupIcon, CreditCardIcon, SearchIcon, PlusIcon, CheckCircleIcon, RefreshIcon, PencilIcon, ClockIcon, CloseIcon, TicketIcon, MinusIcon } from './icons/Icons';

const formatCurrency = (val: number) => {
    // Safety check for NaN or infinite values
    const num = Number(val);
    if (isNaN(num) || !isFinite(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const AgentWalletManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Top up modal state
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [topUpAmount, setTopUpAmount] = useState<number>(0);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
    
    // Commission modal state
    const [commissionUser, setCommissionUser] = useState<User | null>(null);
    const [commissionRate, setCommissionRate] = useState<number>(0);
    const [commissionMode, setCommissionMode] = useState<'fixed' | 'percent'>('fixed');

    // History modal state
    const [historyUser, setHistoryUser] = useState<User | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, txData] = await Promise.all([
                authService.getAllUsers(),
                walletService.getWalletTransactions()
            ]);
            
            // Strictly convert string numbers to real numbers to avoid NaN
            const enrichedUsers = usersData.map(u => ({
                ...u,
                id: u.id,
                balance: (u as any).balance ? Number((u as any).balance) : 0, 
                role_level: (u as any).role_level || 'user',
                // Check multiple potential field names from backend
                commission_rate: (u as any).commission_rate 
                    ? Number((u as any).commission_rate) 
                    : ((u as any).commission ? Number((u as any).commission) : 0)
            }));
            
            setUsers(enrichedUsers);
            setTransactions(txData);
        } catch (e) {
            console.error("Error fetching agent data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleTransaction = async () => {
        if (!selectedUser || !topUpAmount) return;
        setIsProcessing(true);
        try {
            const adminInfo = adminService.getCurrentAdmin();
            const adminName = adminInfo?.username || 'Admin';
            
            // If Withdraw, amount is negative
            const finalAmount = transactionType === 'withdraw' ? -Math.abs(topUpAmount) : Math.abs(topUpAmount);
            const typeLabel = transactionType === 'withdraw' ? 'Rút tiền' : 'Nạp tiền';

            const success = await walletService.topUpWallet(selectedUser.id!, finalAmount, adminName);
            if (success) {
                alert(`Đã ${typeLabel.toLowerCase()} ${formatCurrency(Math.abs(finalAmount))} cho ${selectedUser.name}`);
                setTopUpAmount(0);
                setSelectedUser(null);
                fetchData(); // Refresh list immediately
            } else {
                alert(`${typeLabel} thất bại. Vui lòng kiểm tra server.`);
            }
        } catch (e) {
            alert('Lỗi kết nối khi thực hiện giao dịch');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveCommission = async () => {
        if (!commissionUser) return;
        setIsProcessing(true);
        try {
            let rateToSend = Number(commissionRate);
            
            // Validation & Logic based on mode
            if (commissionMode === 'percent') {
                if (rateToSend > 100) {
                    alert("Phần trăm hoa hồng không thể lớn hơn 100%.");
                    setIsProcessing(false);
                    return;
                }
            }

            const result = await walletService.updateCommission(commissionUser.id!, rateToSend);
            
            if (result.success) {
                alert(`Đã cập nhật hoa hồng cho ${commissionUser.name}`);
                
                // Optimistic Update: Update local state immediately
                setUsers(prevUsers => prevUsers.map(u => 
                    u.id === commissionUser.id ? { ...u, commission_rate: rateToSend } : u
                ));

                setCommissionUser(null);
            } else {
                // Handle Specific Server Constraints
                if (result.message.includes("0 đến 100") || result.message.includes("valid range") || result.message.includes("không hợp lệ")) {
                    alert(`⚠️ LỖI BACKEND (Server): ${result.message}\n\nNguyên nhân: Server đang có đoạn code chặn số > 100.\n\nGiải pháp:\n1. Mở file 'api_db.php' trên hosting.\n2. Tìm và XÓA đoạn kiểm tra: "if ($rate < 0 || $rate > 100)..."\n3. Lưu file và thử lại.`);
                } else if (result.message.includes("out of range")) {
                    alert(`⚠️ LỖI DATABASE:\n\nCột 'commission_rate' trong database đang để kiểu số quá nhỏ (ví dụ TINYINT).\nCÁCH SỬA: Vào PHPMyAdmin, sửa cột này thành kiểu INT hoặc BIGINT.`);
                } else {
                    alert(`Cập nhật thất bại: ${result.message}`);
                }
            }
        } catch (e) {
            console.error(e);
            alert('Lỗi kết nối tới máy chủ.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRoleChange = async (userId: string | number, newRole: 'user'|'f1'|'f2') => {
        if (confirm(`Thay đổi quyền user này thành ${newRole.toUpperCase()}?`)) {
            const success = await walletService.updateUserRole(userId, newRole);
            if (success) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_level: newRole } : u));
            } else {
                alert('Cập nhật thất bại.');
            }
        }
    };

    const openCommissionModal = (user: User) => {
        setCommissionUser(user);
        const rate = Number(user.commission_rate) || 0;
        setCommissionRate(rate);
        
        // Auto-detect mode based on value
        if (rate > 0 && rate <= 100) {
            setCommissionMode('percent');
        } else {
            setCommissionMode('fixed');
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    // Improved History Logic with Withdraw calculation
    const userHistoryStats = useMemo(() => {
        if (!historyUser) return { list: [], totalCommission: 0, totalDeposit: 0, totalWithdrawn: 0 };
        
        const list = transactions
            .filter(t => String(t.userId) === String(historyUser.id))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        let totalCommission = 0;
        let totalDeposit = 0;
        let totalWithdrawn = 0;

        list.forEach(t => {
            const amt = Number(t.amount);
            const type = (t.type || '').toLowerCase();
            
            // Commission
            if (type.includes('commission') || type.includes('hoa hồng') || type.includes('hh')) {
                totalCommission += amt;
            }
            
            // Deposit (Positive amounts that are NOT commission)
            else if (amt > 0) {
                totalDeposit += amt;
            }
            
            // Withdrawal / Payment (Negative amounts)
            else if (amt < 0) {
                totalWithdrawn += Math.abs(amt);
            }
        });

        return { list, totalCommission, totalDeposit, totalWithdrawn };
    }, [historyUser, transactions]);

    // Calculate Global Stats safely
    const totalWalletBalance = users.reduce((acc, u) => acc + (Number(u.balance) || 0), 0);
    
    const totalCommissionPaidOut = transactions
        .filter(t => {
            const type = (t.type || '').toLowerCase();
            return type.includes('commission') || type.includes('hoa hồng') || type.includes('hh');
        })
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="text-gray-500 text-xs uppercase font-bold">Tổng Số Dư Ví (Toàn hệ thống)</h3>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalWalletBalance)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="text-gray-500 text-xs uppercase font-bold">Tổng Hoa Hồng Đã Trả (Admin &rarr; Đại lý)</h3>
                    <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(totalCommissionPaidOut)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="text-gray-500 text-xs uppercase font-bold">Đại lý F1/F2</h3>
                    <p className="text-2xl font-bold text-orange-600">{users.filter(u => u.role_level === 'f1' || u.role_level === 'f2').length}</p>
                </div>
            </div>

            {/* Agent List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <UserGroupIcon className="w-5 h-5 text-blue-600" /> Quản lý Đại lý & Số dư
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={fetchData} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition" title="Làm mới dữ liệu">
                            <RefreshIcon className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Tìm đại lý/user..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 pr-4 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
                            />
                            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                            <tr>
                                <th className="p-3">User</th>
                                <th className="p-3">Cấp Đại lý</th>
                                <th className="p-3 text-right">Số dư Ví</th>
                                <th className="p-3 text-right">Cài đặt Hoa Hồng</th>
                                <th className="p-3 text-right">Tổng HH thực nhận</th>
                                <th className="p-3 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.length > 0 ? filteredUsers.map(user => {
                                const totalCommissionReceived = transactions
                                    .filter(t => {
                                        const isUser = String(t.userId) === String(user.id);
                                        const type = (t.type || '').toLowerCase();
                                        const isCommission = type.includes('commission') || type.includes('hoa hồng') || type.includes('hh');
                                        return isUser && isCommission;
                                    })
                                    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                                
                                const rate = Number(user.commission_rate) || 0;
                                let rateDisplay = '(Mặc định)';
                                if (rate > 0) {
                                    rateDisplay = rate <= 100 ? `${rate}% / vé` : `${formatCurrency(rate)} / vé`;
                                } else if (user.role_level === 'f1') {
                                    rateDisplay = '50.000 ₫ (F1)';
                                } else if (user.role_level === 'f2') {
                                    rateDisplay = '20.000 ₫ (F2)';
                                }

                                return (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3">
                                        <div className="font-bold">{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                        <div className="text-[10px] text-gray-400">ID: {user.id}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            {['user', 'f2', 'f1'].map(role => (
                                                <button 
                                                    key={role}
                                                    onClick={() => handleRoleChange(user.id!, role as any)}
                                                    className={`px-2 py-1 text-xs rounded border transition-all ${user.role_level === role ? (role === 'f1' ? 'bg-red-600 text-white border-red-600' : role === 'f2' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-500 text-white border-gray-500') : 'bg-transparent text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400'}`}
                                                >
                                                    {role.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-green-600">
                                        {formatCurrency(Number(user.balance) || 0)}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`font-bold ${rate > 0 ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200' : 'text-gray-400'}`}>
                                                {rateDisplay}
                                            </span>
                                            <button 
                                                onClick={() => openCommissionModal(user)}
                                                className="text-gray-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"
                                                title="Sửa mức hoa hồng riêng"
                                            >
                                                <PencilIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="font-bold text-blue-600">{formatCurrency(totalCommissionReceived)}</div>
                                        {user.id && (
                                            <button onClick={() => setHistoryUser(user)} className="text-[10px] text-blue-500 hover:underline flex items-center justify-end w-full gap-1">
                                                <ClockIcon className="w-3 h-3"/> Xem lịch sử
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button 
                                            onClick={() => { setSelectedUser(user); setTransactionType('deposit'); }}
                                            className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 flex items-center gap-1 mx-auto"
                                        >
                                            <PlusIcon className="w-3 h-3" /> Nạp / Rút
                                        </button>
                                    </td>
                                </tr>
                            )}) : (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-gray-500">Không tìm thấy người dùng phù hợp.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Up / Withdraw Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150]">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-96 animate-fade-in">
                        <h3 className="text-lg font-bold mb-4 flex justify-between">
                            <span>Quản lý ví</span>
                            <span className={`text-sm px-2 py-1 rounded ${transactionType === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {transactionType === 'deposit' ? 'NẠP TIỀN' : 'RÚT TIỀN'}
                            </span>
                        </h3>
                        <p className="mb-2 text-sm">Đại lý: <b>{selectedUser.name}</b></p>
                        <p className="mb-4 text-sm text-gray-500">Email: {selectedUser.email}</p>
                        
                        {/* Toggle Button Group */}
                        <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                             <button 
                                onClick={() => setTransactionType('deposit')}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${transactionType === 'deposit' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:bg-gray-200'}`}
                             >
                                 <PlusIcon className="w-4 h-4 inline mr-1" /> Nạp tiền
                             </button>
                             <button 
                                onClick={() => setTransactionType('withdraw')}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${transactionType === 'withdraw' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:bg-gray-200'}`}
                             >
                                 <MinusIcon className="w-4 h-4 inline mr-1" /> Rút tiền
                             </button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold mb-1 uppercase text-gray-500">Số tiền (VNĐ)</label>
                            <input 
                                type="number" 
                                autoFocus
                                className={`w-full p-2 border rounded text-lg font-bold bg-gray-50 dark:bg-gray-700 dark:border-gray-600 ${transactionType === 'deposit' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}
                                value={topUpAmount}
                                onChange={e => setTopUpAmount(Number(e.target.value))}
                                step={10000}
                            />
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {[100000, 500000, 1000000, 5000000].map(amt => (
                                    <button 
                                        key={amt} 
                                        onClick={() => setTopUpAmount(amt)}
                                        className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    >
                                        {amt/1000}k
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setSelectedUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded transition">Hủy</button>
                            <button 
                                onClick={handleTransaction} 
                                disabled={!topUpAmount || isProcessing}
                                className={`px-4 py-2 text-white font-bold rounded shadow transition disabled:opacity-50 ${transactionType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isProcessing ? 'Đang xử lý...' : (transactionType === 'deposit' ? 'Xác nhận Nạp' : 'Xác nhận Rút')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Commission Modal */}
            {commissionUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150]">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-96 animate-fade-in">
                        <h3 className="text-lg font-bold mb-4">Cài đặt Hoa hồng</h3>
                        <p className="mb-4 text-sm">Đại lý: <b>{commissionUser.name}</b> ({commissionUser.role_level?.toUpperCase()})</p>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-bold mb-2 uppercase text-gray-500">Chế độ hoa hồng</label>
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={() => { setCommissionMode('fixed'); if(commissionRate <= 100) setCommissionRate(20000); }}
                                    className={`flex-1 py-2 text-sm rounded border ${commissionMode === 'fixed' ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                >
                                    Cố định (VND)
                                </button>
                                <button 
                                    onClick={() => { setCommissionMode('percent'); if(commissionRate > 100) setCommissionRate(1); }}
                                    className={`flex-1 py-2 text-sm rounded border ${commissionMode === 'percent' ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                >
                                    Phần trăm (%)
                                </button>
                            </div>

                            <label className="block text-xs font-bold mb-1 uppercase text-gray-500">
                                {commissionMode === 'fixed' ? 'Số tiền (VNĐ/Vé)' : 'Phần trăm (%/Vé)'}
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    autoFocus
                                    className="w-full p-2 pr-8 border rounded text-lg font-bold text-blue-600 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-blue-400"
                                    value={commissionRate}
                                    onChange={e => setCommissionRate(Number(e.target.value))}
                                    step={commissionMode === 'fixed' ? 1000 : 0.1}
                                    min={0}
                                    max={commissionMode === 'percent' ? 100 : undefined}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                    {commissionMode === 'fixed' ? 'đ' : '%'}
                                </span>
                            </div>
                            
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {commissionMode === 'fixed' ? (
                                    <>
                                        {[10000, 20000, 50000, 100000].map(amt => (
                                            <button key={amt} onClick={() => setCommissionRate(amt)} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition">{amt/1000}k</button>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {[0.5, 1, 1.5, 2, 5].map(pct => (
                                            <button key={pct} onClick={() => setCommissionRate(pct)} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition">{pct}%</button>
                                        ))}
                                    </>
                                )}
                                <button onClick={() => setCommissionRate(0)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition">Reset (0)</button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCommissionUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded transition">Hủy</button>
                            <button 
                                onClick={handleSaveCommission} 
                                disabled={isProcessing}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                                {isProcessing ? 'Đang lưu...' : 'Lưu cài đặt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced History Modal */}
            {historyUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150]">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
                        <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                            <div>
                                <h3 className="text-lg font-bold">Lịch sử Giao dịch</h3>
                                <p className="text-sm text-gray-500">{historyUser.name} (Ví: <span className="text-green-600 font-bold">{formatCurrency(Number(historyUser.balance))}</span>)</p>
                            </div>
                            <button onClick={() => setHistoryUser(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                <CloseIcon className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                             <div className="bg-blue-50 p-3 rounded border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 text-center">
                                <div className="text-xs text-blue-800 dark:text-blue-300 font-bold">Tổng Hoa Hồng</div>
                                <div className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(userHistoryStats.totalCommission)}</div>
                             </div>
                             <div className="bg-green-50 p-3 rounded border border-green-100 dark:bg-green-900/20 dark:border-green-800 text-center">
                                <div className="text-xs text-green-800 dark:text-green-300 font-bold">Tổng Nạp Tiền</div>
                                <div className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(userHistoryStats.totalDeposit)}</div>
                             </div>
                             <div className="bg-red-50 p-3 rounded border border-red-100 dark:bg-red-900/20 dark:border-red-800 text-center">
                                <div className="text-xs text-red-800 dark:text-red-300 font-bold">Tổng Rút/TT</div>
                                <div className="text-red-600 dark:text-red-400 font-bold">{formatCurrency(userHistoryStats.totalWithdrawn)}</div>
                             </div>
                        </div>

                        <div className="overflow-y-auto flex-grow border-t dark:border-gray-700">
                            {userHistoryStats.list.length === 0 ? (
                                <p className="text-center text-gray-500 py-8 italic">Chưa có lịch sử giao dịch nào.</p>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="p-3 w-32">Thời gian</th>
                                            <th className="p-3">Nội dung</th>
                                            <th className="p-3 text-right">Số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {userHistoryStats.list.map(t => {
                                            const amt = Number(t.amount);
                                            const isPositive = amt > 0;
                                            return (
                                            <tr key={t.id}>
                                                <td className="p-3 text-gray-500 text-xs">{new Date(t.timestamp).toLocaleString('vi-VN')}</td>
                                                <td className="p-3">{t.description}</td>
                                                <td className={`p-3 text-right font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isPositive ? '+' : ''}{formatCurrency(amt)}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Transactions (Global Log) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CreditCardIcon className="w-5 h-5 text-gray-500" /> Giao dịch gần đây (Toàn hệ thống)</h3>
                {transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-4">Chưa có lịch sử giao dịch.</p>
                ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {transactions.slice(0, 50).map((tx, idx) => {
                            // Check type loosely for badge
                            const type = (tx.type || '').toLowerCase();
                            const isCommission = type.includes('commission') || type.includes('hoa hồng');
                            const isTopup = type.includes('topup') || type.includes('nạp');
                            const isWithdraw = type.includes('withdraw') || type.includes('rút') || Number(tx.amount) < 0 && !type.includes('pay');

                            return (
                            <div key={tx.id || idx} className="flex justify-between items-center border-b dark:border-gray-700 pb-2 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 p-2 rounded transition">
                                <div>
                                    <div className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                        {tx.description}
                                        {isCommission && <span className="bg-blue-100 text-blue-700 text-[10px] px-1 rounded">Hoa hồng</span>}
                                        {isTopup && <span className="bg-green-100 text-green-700 text-[10px] px-1 rounded">Nạp tiền</span>}
                                        {isWithdraw && <span className="bg-red-100 text-red-700 text-[10px] px-1 rounded">Rút tiền</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{new Date(tx.timestamp).toLocaleString('vi-VN')}</span>
                                        <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-[10px]">User ID: {tx.userId}</span>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Number(tx.amount))}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentWalletManager;
