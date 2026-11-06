
import React, { useState, useEffect } from 'react';
import { type NewsArticle } from '../types';
import { PROXY_URL, GEMINI_API_URL } from '../services/apiConfig';
import { MOCK_NEWS } from '../data/news';
import { FileTextIcon } from './icons/Icons';

const NewsCard: React.FC<{ article: NewsArticle }> = ({ article }) => (
    <a href={article.link} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col h-full border border-gray-100 dark:border-gray-700">
        {article.imageUrl && (
            <div className="relative w-full h-48 overflow-hidden">
                <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => { 
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm backdrop-blur-sm">
                    {article.source}
                </div>
            </div>
        )}
        <div className="p-5 flex flex-col flex-grow">
            <h3 className="font-bold text-lg leading-snug group-hover:text-blue-600 transition-colors mb-3 line-clamp-2 text-gray-800 dark:text-white">
                {article.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-grow leading-relaxed">
                {article.summary}
            </p>
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 text-right">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center justify-end gap-1">
                    Đọc tiếp <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </span>
            </div>
        </div>
    </a>
);

const NewsCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm animate-pulse overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700"></div>
        <div className="p-5">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            </div>
        </div>
    </div>
);

const NewsSection: React.FC = () => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            try {
                // Skip AI fetch for now to ensure reliability and speed, using enhanced mock data
                // In a real app, we might mix or fallback
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
                setNews(MOCK_NEWS);
            } catch (err) {
                setNews(MOCK_NEWS);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNews();
    }, []);

    return (
        <div className="mt-16 mb-12">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold border-l-4 border-red-600 pl-4 flex items-center gap-3 text-gray-800 dark:text-white">
                    <FileTextIcon className="w-6 h-6 text-red-600" />
                    Tin tức & Cẩm nang du lịch
                </h2>
            </div>
            
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <NewsCardSkeleton key={i} />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {news.map((article, index) => (
                        <NewsCard key={index} article={article} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default NewsSection;
