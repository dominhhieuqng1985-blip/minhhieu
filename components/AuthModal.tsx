
import React, { useState } from 'react';
import { User } from '../types';
import { CloseIcon, UserIcon, EnvelopeIcon, PhoneIcon, IdentificationIcon } from './icons/Icons';
import * as authService from '../services/authService';

interface AuthModalProps {
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    
    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    
    // Register State
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regGender, setRegGender] = useState('Mr');
    const [regDob, setRegDob] = useState('');
    const [regIdCard, setRegIdCard] = useState('');
    const [regAddress, setRegAddress] = useState('');

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await authService.login(loginEmail, loginPassword);
            if (result.success && result.user) {
                onLoginSuccess(result.user);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Đã xảy ra lỗi. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (regPassword !== regConfirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.register({ 
                name: regName, 
                email: regEmail, 
                phone: regPhone, 
                password: regPassword,
                gender: regGender,
                dob: regDob,
                id_card: regIdCard,
                address: regAddress,
                nationality: 'Việt Nam' // Default for now
            });
            
            if (result.success) {
                setSuccessMessage('Đăng ký thành công! Vui lòng chuyển qua tab đăng nhập.');
                // Clear form
                setRegName('');
                setRegEmail('');
                setRegPhone('');
                setRegPassword('');
                setRegConfirmPassword('');
            } else {
                const msg = result.message || "Lỗi không xác định";
                setError(msg);
                alert(`Đăng ký thất bại: ${msg}`);
            }
        } catch (err: any) {
            const msg = err.message || "Đã xảy ra lỗi kết nối.";
            setError(msg);
            alert(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const renderLoginView = () => (
        <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                    required
                />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Mật khẩu</label>
                <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                    required
                />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400">
                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
        </form>
    );
    
    const renderRegisterView = () => (
        <form onSubmit={handleRegister} className="p-6 space-y-4 h-[60vh] overflow-y-auto">
            <div>
                <label className="block text-sm font-medium mb-1">Họ và tên <span className="text-red-500">*</span></label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Giới tính</label>
                    <select value={regGender} onChange={e => setRegGender(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700">
                        <option value="Mr">Nam</option>
                        <option value="Mrs">Nữ</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                    <input type="date" value={regDob} onChange={e => setRegDob(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">CMND/CCCD</label>
                <input type="text" value={regIdCard} onChange={e => setRegIdCard(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
            </div>
             <div>
                <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu <span className="text-red-500">*</span></label>
                <input type="password" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent" />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {successMessage && <p className="text-green-500 text-sm text-center">{successMessage}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
        </form>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-[var(--card-bg-color)] rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-end p-2">
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>

                <div className="px-6">
                    <div className="flex border-b border-[var(--border-color)]">
                        <button 
                            onClick={() => { setIsLoginView(true); setError(''); setSuccessMessage(''); }}
                            className={`flex-1 py-2 text-center font-semibold border-b-2 transition-colors ${isLoginView ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:border-gray-300'}`}
                        >
                            Đăng nhập
                        </button>
                        <button 
                            onClick={() => { setIsLoginView(false); setError(''); setSuccessMessage(''); }}
                            className={`flex-1 py-2 text-center font-semibold border-b-2 transition-colors ${!isLoginView ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:border-gray-300'}`}
                        >
                            Đăng ký
                        </button>
                    </div>
                </div>

                {isLoginView ? renderLoginView() : renderRegisterView()}
            </div>
        </div>
    );
};

export default AuthModal;
