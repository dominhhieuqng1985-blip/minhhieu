import React, { useState } from 'react';
import * as adminService from '../services/adminService';
import { CloseIcon, InfoIcon } from './icons/Icons';

interface ChangeCredentialsModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const ChangeCredentialsModal: React.FC<ChangeCredentialsModalProps> = ({ onClose, onSuccess }) => {
    const [newUser, setNewUser] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fix: Replaced call to non-existent `changeAdminCredentials` with existing service functions.
    // The new implementation updates both username and password for the current admin.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!newUser.trim() || !newPass.trim()) {
            setError('Tên người dùng và mật khẩu không được để trống.');
            return;
        }
        if (newPass.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPass !== confirmPass) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        
        setIsLoading(true);
        
        try {
            const currentAdmin = adminService.getCurrentAdmin();
            if (!currentAdmin || !currentAdmin.id) {
                throw new Error('Không thể xác định admin hiện tại.');
            }
            
            const updatedAdmin = { ...currentAdmin, username: newUser.trim() };
            
            // Fix: Pass `id` and `updates` as 2 separate arguments
            const [infoUpdateResult, passwordResetResult] = await Promise.all([
                adminService.updateAdminInfo(currentAdmin.id, { username: updatedAdmin.username }),
                adminService.resetAdminPassword(currentAdmin.id, newPass)
            ]);
            
            if (infoUpdateResult.success && passwordResetResult.success) {
                sessionStorage.setItem('flightAdminInfo', JSON.stringify(updatedAdmin));
                setSuccessMessage('Thông tin đã được thay đổi. Bạn sẽ được đăng xuất sau giây lát...');
                setTimeout(() => {
                    onSuccess();
                }, 3000);
            } else {
                const errors = [];
                if (!infoUpdateResult.success) errors.push(infoUpdateResult.message);
                if (!passwordResetResult.success) errors.push(passwordResetResult.message);
                throw new Error(errors.filter(Boolean).join(' '));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi không xác định.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold">Thay đổi thông tin đăng nhập</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Tên người dùng mới</label>
                        <input
                            type="text"
                            value={newUser}
                            onChange={e => setNewUser(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Mật khẩu mới</label>
                        <input
                            type="password"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            value={confirmPass}
                            onChange={e => setConfirmPass(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-transparent"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {successMessage && <p className="text-green-600 text-sm text-center">{successMessage}</p>}
                    <button type="submit" disabled={!!successMessage || isLoading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                        {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangeCredentialsModal;