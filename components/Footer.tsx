




import React, { useState, useEffect } from 'react';
import { FacebookIcon, InstagramIcon, YoutubeIcon, PlaneIcon, CheckCircleIcon } from './icons/Icons';
import { FooterColumn } from '../types';
import * as adminService from '../services/adminService';
import { ICON_MAP } from './icons/Icons';

const Footer: React.FC = () => {
    const [columns, setColumns] = useState<FooterColumn[]>(adminService.INITIAL_FOOTER_CONFIG);

    useEffect(() => {
        const fetchFooter = async () => {
            try {
                const data = await adminService.getFooterConfig();
                setColumns(data);
            } catch (e) {
                console.error("Failed to load footer config, using default.");
                // Default is already set in useState, so no need to set again
            }
        };
        fetchFooter();
    }, []);

    const renderDynamicColumn = (col: FooterColumn) => {
        return (
            <div key={col.id}>
                <h3 className="text-lg font-bold text-white mb-4 border-l-4 border-red-600 pl-3">{col.title}</h3>
                <ul className="space-y-2 text-sm">
                    {col.links.map(link => {
                        const IconComponent = link.icon && ICON_MAP[link.icon] ? ICON_MAP[link.icon] : CheckCircleIcon;
                        return (
                            <li key={link.id}>
                                <a 
                                    href={link.url} 
                                    target={link.target || '_self'} 
                                    rel={link.target === '_blank' ? 'noopener noreferrer' : ''}
                                    className="hover:text-red-500 transition flex items-center gap-2"
                                >
                                    <IconComponent className="w-3 h-3 text-red-500 flex-shrink-0"/> {link.label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    };

    return (
        <footer className="bg-[#1a202c] text-gray-300 pt-12 pb-6">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Col 1: Brand Info (Static) */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <PlaneIcon className="w-8 h-8 text-red-600" />
                            <span className="text-2xl font-bold text-white">Nhã Uyên<span className="text-red-600"> AIR</span></span>
                        </div>
                        <p className="text-sm mb-4 text-gray-400 leading-relaxed">
                            Đại lý vé máy bay uy tín hàng đầu. Chúng tôi cam kết mang đến những chuyến bay giá rẻ, an toàn và dịch vụ hỗ trợ tốt nhất cho khách hàng.
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                            <a href="#" className="bg-blue-600 p-2 rounded-full text-white hover:bg-blue-700 transition"><FacebookIcon className="w-4 h-4" /></a>
                            <a href="#" className="bg-red-600 p-2 rounded-full text-white hover:bg-red-700 transition"><YoutubeIcon className="w-4 h-4" /></a>
                            <a href="#" className="bg-pink-600 p-2 rounded-full text-white hover:bg-pink-700 transition"><InstagramIcon className="w-4 h-4" /></a>
                        </div>
                    </div>

                    {/* Dynamic Columns (Menus including Contact) */}
                    {columns.map(col => renderDynamicColumn(col))}
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
                    <p>&copy; 2024 <span className="text-white font-semibold">Vemaybaynhauyen.com</span>. All rights reserved.</p>
                    <p className="mt-1 text-xs">Hệ thống đặt vé máy bay trực tuyến giá rẻ, uy tín, chất lượng.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;